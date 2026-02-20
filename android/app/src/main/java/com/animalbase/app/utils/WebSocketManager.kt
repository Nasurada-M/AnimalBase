package com.animalbase.app.utils

import android.content.Context
import android.util.Log
import com.animalbase.app.BuildConfig
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

/**
 * WebSocketManager — persistent WebSocket connection to the backend.
 *
 * Replaces Firebase Cloud Messaging for real-time notification delivery.
 * The backend (websocket.js) pushes a JSON frame whenever a new notification
 * is created for this user. We decode it and show a local Android notification.
 *
 * Connection URL:
 *   ws://10.0.2.2:3000/ws?token=JWT       (emulator)
 *   ws://YOUR_LAN_IP:3000/ws?token=JWT    (physical device)
 *
 * ======================================================
 * To change the WS URL:
 *   app/build.gradle → buildConfigField "String", "WS_URL", '"ws://..."'
 * ======================================================
 *
 * Lifecycle:
 *   connect()    — call from MainActivity.onStart()
 *   disconnect() — call from MainActivity.onStop()
 *   The manager auto-reconnects on failure (exponential back-off, max 60 s).
 */
class WebSocketManager(private val context: Context) {

    private val TAG = "AnimalBase-WS"
    private val gson = Gson()
    private var webSocket: WebSocket? = null
    private var isConnected = false
    private var reconnectDelay = 2_000L   // starts at 2 s, doubles up to 60 s

    private val client = OkHttpClient.Builder()
        .pingInterval(25, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    /** Open the WebSocket connection using the stored JWT. */
    fun connect() {
        val token = SessionManager(context).getToken() ?: return
        // ← WS_URL defined in build.gradle
        val url = "${BuildConfig.WS_URL}?token=$token"
        val request = Request.Builder().url(url).build()
        webSocket = client.newWebSocket(request, listener)
        Log.d(TAG, "Connecting to $url")
    }

    /** Close the WebSocket cleanly. */
    fun disconnect() {
        webSocket?.close(1000, "App moved to background")
        webSocket = null
        isConnected = false
        Log.d(TAG, "Disconnected")
    }

    private val listener = object : WebSocketListener() {
        override fun onOpen(ws: WebSocket, response: Response) {
            isConnected = true
            reconnectDelay = 2_000L
            Log.d(TAG, "Connection opened")
        }

        override fun onMessage(ws: WebSocket, text: String) {
            Log.d(TAG, "Message: $text")
            try {
                val json = gson.fromJson(text, JsonObject::class.java)
                val type = json.get("type")?.asString ?: return
                if (type == "notification") {
                    val title   = json.get("title")?.asString   ?: "AnimalBase"
                    val message = json.get("message")?.asString ?: ""
                    // Post a local notification — no FCM required
                    NotificationHelper.show(context, title, message)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to parse message: ${e.message}")
            }
        }

        override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
            isConnected = false
            Log.w(TAG, "Failure: ${t.message} — reconnecting in ${reconnectDelay / 1000}s")
            scheduleReconnect()
        }

        override fun onClosed(ws: WebSocket, code: Int, reason: String) {
            isConnected = false
            Log.d(TAG, "Closed: $code $reason")
        }
    }

    private fun scheduleReconnect() {
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            if (!isConnected) connect()
        }, reconnectDelay)
        reconnectDelay = minOf(reconnectDelay * 2, 60_000L)
    }
}
