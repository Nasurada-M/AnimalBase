package com.animalbase.app.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.animalbase.app.R
import com.animalbase.app.ui.notifications.NotificationsActivity

/**
 * NotificationHelper — posts local Android notifications.
 *
 * This entirely replaces Firebase Cloud Messaging for notification display.
 * No FCM token, no google-services.json, no paid service required.
 *
 * ======================================================
 * NOTIFICATION ICON (line ~44):
 *   Change R.drawable.ic_notification
 *   → replace res/drawable/ic_notification.xml with your icon
 *
 * NOTIFICATION COLOR (line ~45):
 *   Change R.color.primary
 *   → update colors.xml
 *
 * NOTIFICATION CHANNEL NAME (line ~56):
 *   Change "AnimalBase Notifications" to your preferred label
 * ======================================================
 */
object NotificationHelper {

    const val CHANNEL_ID   = "animalbase_channel"
    const val CHANNEL_NAME = "AnimalBase Notifications"

    /** Must be called once at app startup (Application or MainActivity). */
    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Adoption updates, sightings, missing pet alerts"
                enableVibration(true)
                enableLights(true)
            }
            context.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    fun show(context: Context, title: String, message: String, notificationId: Int = System.currentTimeMillis().toInt()) {
        val intent = Intent(context, NotificationsActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        // ← CHANGE ICON: replace R.drawable.ic_notification
        // ← CHANGE COLOR: replace R.color.primary
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(context.getColor(R.color.primary))
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSound(sound)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        context.getSystemService(NotificationManager::class.java)
            .notify(notificationId, builder.build())
    }
}
