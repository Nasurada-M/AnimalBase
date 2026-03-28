const crypto = require('crypto');
const { URL } = require('url');
const { getBearerTokenFromHeader, getUserFromToken } = require('../middleware/auth');
const { getNotificationsFeed } = require('../controllers/notificationController');

const WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const WS_POLL_INTERVAL_MS = Number(process.env.WS_POLL_INTERVAL_MS) || 5000;
const NORMAL_CLOSE_CODE = 1000;

const parseRequestedScope = (searchParams) => searchParams.get('scope') || 'user';

const getWebSocketToken = (req, searchParams) =>
  searchParams.get('token') || getBearerTokenFromHeader(req.headers.authorization);

const createAcceptValue = (webSocketKey) =>
  crypto.createHash('sha1')
    .update(`${webSocketKey}${WS_MAGIC_STRING}`)
    .digest('base64');

const writeHttpError = (socket, statusCode, statusText) => {
  socket.write(`HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
};

const writeFrame = (socket, opcode, payload = Buffer.alloc(0)) => {
  const message = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header;

  if (message.length < 126) {
    header = Buffer.alloc(2);
    header[1] = message.length;
  } else if (message.length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(message.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(message.length, 6);
  }

  header[0] = 0x80 | opcode;
  socket.write(Buffer.concat([header, message]));
};

const sendJson = (socket, data) => {
  writeFrame(socket, 0x1, Buffer.from(JSON.stringify(data), 'utf8'));
};

const sendPong = (socket, payload) => {
  writeFrame(socket, 0xA, payload);
};

const sendClose = (socket, code = NORMAL_CLOSE_CODE, reason = '') => {
  const reasonBytes = Buffer.from(reason, 'utf8');
  const payload = Buffer.alloc(2 + reasonBytes.length);
  payload.writeUInt16BE(code, 0);
  reasonBytes.copy(payload, 2);
  writeFrame(socket, 0x8, payload);
};

const parseFrames = (buffer) => {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    const fin = (firstByte & 0x80) === 0x80;
    const opcode = firstByte & 0x0f;
    const isMasked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let cursor = offset + 2;

    if (payloadLength === 126) {
      if (cursor + 2 > buffer.length) {
        break;
      }
      payloadLength = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (payloadLength === 127) {
      if (cursor + 8 > buffer.length) {
        break;
      }
      const highBits = buffer.readUInt32BE(cursor);
      const lowBits = buffer.readUInt32BE(cursor + 4);
      if (highBits !== 0) {
        throw new Error('WebSocket frame is too large.');
      }
      payloadLength = lowBits;
      cursor += 8;
    }

    let maskingKey = null;
    if (isMasked) {
      if (cursor + 4 > buffer.length) {
        break;
      }
      maskingKey = buffer.subarray(cursor, cursor + 4);
      cursor += 4;
    }

    if (cursor + payloadLength > buffer.length) {
      break;
    }

    const payload = buffer.subarray(cursor, cursor + payloadLength);
    const unmaskedPayload = isMasked
      ? Buffer.from(payload.map((byte, index) => byte ^ maskingKey[index % 4]))
      : Buffer.from(payload);

    frames.push({ fin, opcode, payload: unmaskedPayload });
    offset = cursor + payloadLength;
  }

  return {
    frames,
    remaining: buffer.subarray(offset),
  };
};

const buildNotificationFrame = (scope, notification) => ({
  type: 'notification',
  scope,
  notification,
  id: notification.id,
  kind: notification.kind,
  title: notification.title,
  message: notification.message,
  route: notification.route,
  createdAt: notification.createdAt,
});

function attachNotificationWebSocketServer(server) {
  server.on('upgrade', async (req, socket, head) => {
    const isWebSocketUpgrade =
      typeof req.headers.upgrade === 'string'
      && req.headers.upgrade.toLowerCase() === 'websocket';
    const webSocketKey = req.headers['sec-websocket-key'];

    let url;

    try {
      url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    } catch {
      writeHttpError(socket, 400, 'Bad Request');
      return;
    }

    if (url.pathname !== '/ws') {
      writeHttpError(socket, 404, 'Not Found');
      return;
    }

    if (!isWebSocketUpgrade || !webSocketKey) {
      writeHttpError(socket, 400, 'Bad Request');
      return;
    }

    const token = getWebSocketToken(req, url.searchParams);
    if (!token) {
      writeHttpError(socket, 401, 'Unauthorized');
      return;
    }

    let user;

    try {
      user = await getUserFromToken(token);
      if (!user) {
        writeHttpError(socket, 401, 'Unauthorized');
        return;
      }
    } catch {
      writeHttpError(socket, 401, 'Unauthorized');
      return;
    }

    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${createAcceptValue(webSocketKey)}`,
        '\r\n',
      ].join('\r\n')
    );

    socket.setKeepAlive(true, 30000);
    socket.setNoDelay(true);

    const requestedScope = parseRequestedScope(url.searchParams);
    let knownNotificationIds = new Set();
    let frameBuffer = head?.length ? Buffer.from(head) : Buffer.alloc(0);
    let pollTimer = null;
    let isClosed = false;
    let isPolling = false;

    const closeConnection = (code = NORMAL_CLOSE_CODE, reason = '') => {
      if (isClosed) {
        return;
      }

      isClosed = true;

      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }

      try {
        sendClose(socket, code, reason);
      } catch (_err) {
        // Ignore shutdown write errors.
      }

      socket.end();
    };

    const sendNotifications = async (sendExisting) => {
      if (isClosed || isPolling) {
        return;
      }

      isPolling = true;

      try {
        const { scope, notifications } = await getNotificationsFeed(user, requestedScope);
        const nextKnownIds = new Set(notifications.map((notification) => notification.id));
        const notificationsToSend = sendExisting
          ? []
          : notifications.filter((notification) => !knownNotificationIds.has(notification.id));

        knownNotificationIds = nextKnownIds;

        if (sendExisting) {
          sendJson(socket, { type: 'connected', scope });
        }

        notificationsToSend
          .slice()
          .sort(
            (left, right) =>
              new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
          )
          .forEach((notification) => {
            sendJson(socket, buildNotificationFrame(scope, notification));
          });
      } catch (err) {
        console.error('[ws] Failed to refresh notifications:', err.message);
      } finally {
        isPolling = false;
      }
    };

    const handleData = (chunk) => {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);

      let parsedFrames;

      try {
        parsedFrames = parseFrames(frameBuffer);
      } catch (err) {
        console.error('[ws] Failed to parse frame:', err.message);
        closeConnection(1002, 'Protocol error');
        return;
      }

      frameBuffer = parsedFrames.remaining;

      parsedFrames.frames.forEach((frame) => {
        if (!frame.fin) {
          closeConnection(1003, 'Fragmented frames are not supported');
          return;
        }

        switch (frame.opcode) {
          case 0x8:
            closeConnection();
            break;
          case 0x9:
            sendPong(socket, frame.payload);
            break;
          case 0x1:
          case 0xA:
            break;
          default:
            closeConnection(1003, 'Unsupported frame type');
            break;
        }
      });
    };

    socket.on('data', handleData);
    socket.on('close', () => {
      isClosed = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    });
    socket.on('end', () => {
      isClosed = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    });
    socket.on('error', (err) => {
      console.error('[ws] Socket error:', err.message);
      closeConnection();
    });

    if (frameBuffer.length > 0) {
      handleData(Buffer.alloc(0));
    }

    sendNotifications(true);
    pollTimer = setInterval(() => {
      sendNotifications(false);
    }, WS_POLL_INTERVAL_MS);
  });
}

module.exports = { attachNotificationWebSocketServer };
