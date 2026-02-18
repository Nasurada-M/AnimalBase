package com.animalbase.app.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.animalbase.app.R
import com.animalbase.app.ui.notifications.NotificationsActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Firebase Cloud Messaging service
 * Handles push notification delivery and FCM token refresh
 *
 * Notification Channel ID: "animalbase_channel"
 * ======================================================
 * NOTIFICATION ICON: Change R.drawable.ic_notification
 *   → Replace res/drawable/ic_notification.xml with your icon
 * NOTIFICATION COLOR: Change R.color.primary
 *   → Update colors.xml primary color
 * ======================================================
 */
class AnimalBaseFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        SessionManager(this).saveFcmToken(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "AnimalBase"
        val body = remoteMessage.notification?.body ?: remoteMessage.data["body"] ?: ""
        showNotification(title, body)
    }

    private fun showNotification(title: String, message: String) {
        val channelId = "animalbase_channel"
        val intent = Intent(this, NotificationsActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(resources.getColor(R.color.primary, null))
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))

        val notificationManager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId, "AnimalBase Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for adoption updates, sightings, and more"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }
}
