package com.animalbase.app.utils

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.animalbase.app.api.RetrofitClient
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

class WebSocketManager(private val context: Context) {

    private val tag = "AnimalBase-WS"
    private val gson = Gson()
    private val sessionManager = SessionManager(context)
    private val notificationStore = NotificationStateStore(context)
    private val mainHandler = Handler(Looper.getMainLooper())
    private var webSocket: WebSocket? = null
    private var isConnected = false
    private var isConnecting = false
    private var shouldReconnect = false
    private var reconnectDelay = 2_000L
    private var reconnectRunnable: Runnable? = null

    private val client = OkHttpClient.Builder()
        .pingInterval(25, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    fun connect() {
        val token = sessionManager.getToken() ?: return
        shouldReconnect = true
        cancelScheduledReconnect()

        if (isConnected || isConnecting) {
            return
        }

        val url = RetrofitClient.getWebSocketUrl(context)
        val request = Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $token")
            .build()

        isConnecting = true
        webSocket = client.newWebSocket(request, listener)
        Log.d(tag, "Connecting to $url")
    }

    fun disconnect() {
        shouldReconnect = false
        cancelScheduledReconnect()
        isConnecting = false
        webSocket?.close(1000, "App moved to background")
        webSocket = null
        isConnected = false
        Log.d(tag, "Disconnected")
    }

    private val listener = object : WebSocketListener() {
        override fun onOpen(ws: WebSocket, response: Response) {
            isConnecting = false
            isConnected = true
            reconnectDelay = 2_000L
            Log.d(tag, "Connection opened")
        }

        override fun onMessage(ws: WebSocket, text: String) {
            Log.d(tag, "Message: $text")

            try {
                val json = gson.fromJson(text, JsonObject::class.java)
                when (json.get("type")?.asString) {
                    "notification" -> handleNotificationMessage(json)
                    "connected" -> Log.d(tag, "WebSocket ready")
                }
            } catch (e: Exception) {
                Log.w(tag, "Failed to parse message: ${e.message}")
            }
        }

        override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
            isConnecting = false
            isConnected = false
            webSocket = null
            Log.w(tag, "Failure: ${t.message}; reconnecting in ${reconnectDelay / 1000}s")
            if (shouldReconnect) {
                scheduleReconnect()
            }
        }

        override fun onClosed(ws: WebSocket, code: Int, reason: String) {
            isConnecting = false
            isConnected = false
            webSocket = null
            Log.d(tag, "Closed: $code $reason")
            if (shouldReconnect && code != 1000) {
                scheduleReconnect()
            }
        }
    }

    private fun handleNotificationMessage(messageJson: JsonObject) {
        val payload = messageJson.getAsJsonObject("notification") ?: messageJson
        val notificationId = payload.get("id")?.asString ?: return
        val kind = payload.get("kind")?.asString ?: return
        val title = payload.get("title")?.asString ?: "AnimalBase"
        val message = payload.get("message")?.asString ?: ""
        val route = payload.get("route")?.asString
        val userId = sessionManager.getUser()?.effectiveUserId ?: return

        if (!notificationStore.shouldShowSystemNotification(userId, notificationId, kind)) {
            return
        }

        if (notificationStore.isRead(userId, notificationId)) {
            notificationStore.markAsDelivered(userId, notificationId)
            return
        }

        NotificationHelper.show(
            context,
            title,
            message,
            notificationId,
            route
        )
        notificationStore.markAsDelivered(userId, notificationId)
    }

    private fun scheduleReconnect() {
        if (!shouldReconnect) {
            return
        }

        cancelScheduledReconnect()
        reconnectRunnable = Runnable {
            reconnectRunnable = null
            if (shouldReconnect && !isConnected && !isConnecting) {
                connect()
            }
        }
        mainHandler.postDelayed(reconnectRunnable!!, reconnectDelay)
        reconnectDelay = minOf(reconnectDelay * 2, 60_000L)
    }

    private fun cancelScheduledReconnect() {
        reconnectRunnable?.let(mainHandler::removeCallbacks)
        reconnectRunnable = null
    }
}
