const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseInitialized = false;

const initializeFirebase = () => {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('Firebase Admin initialized');
    } else {
      console.warn('Firebase serviceAccountKey.json not found. Push notifications disabled.');
    }
  } catch (err) {
    console.warn('Firebase initialization failed:', err.message);
  }
};

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized, skipping push notification');
    return null;
  }
  try {
    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      token: fcmToken,
      android: {
        priority: 'high',
        notification: { sound: 'default', channel_id: 'animalbase_channel' },
      },
    };
    const response = await admin.messaging().send(message);
    return response;
  } catch (err) {
    console.error('Error sending push notification:', err.message);
    return null;
  }
};

module.exports = { initializeFirebase, sendPushNotification };
