package com.animalbase.app.utils

import android.content.Context
import com.animalbase.app.models.Notification

class NotificationStateStore(context: Context) {

    private val prefs = context.getSharedPreferences("animalbase_notification_state", Context.MODE_PRIVATE)
    private val session = SessionManager(context)
    private val profilePreferences = ProfilePreferencesStore(context)

    private fun readKey(userId: Int) = "read_ids_$userId"
    private fun clearedKey(userId: Int) = "cleared_ids_$userId"
    private fun deliveredKey(userId: Int) = "delivered_ids_$userId"

    fun getReadIds(userId: Int): Set<String> =
        prefs.getStringSet(readKey(userId), emptySet())?.toSet().orEmpty()

    fun isRead(userId: Int, notificationId: String): Boolean =
        getReadIds(userId).contains(notificationId)

    fun getClearedIds(userId: Int): Set<String> =
        prefs.getStringSet(clearedKey(userId), emptySet())?.toSet().orEmpty()

    fun isCleared(userId: Int, notificationId: String): Boolean =
        getClearedIds(userId).contains(notificationId)

    fun markAsRead(userId: Int, notificationId: String) {
        val updated = getReadIds(userId).toMutableSet().apply { add(notificationId) }
        prefs.edit().putStringSet(readKey(userId), updated).apply()
    }

    fun markAllAsRead(userId: Int, notificationIds: Collection<String>) {
        val updated = getReadIds(userId).toMutableSet().apply { addAll(notificationIds) }
        prefs.edit().putStringSet(readKey(userId), updated).apply()
    }

    fun clearNotification(userId: Int, notificationId: String) {
        clearNotifications(userId, listOf(notificationId))
    }

    fun clearNotifications(userId: Int, notificationIds: Collection<String>) {
        if (notificationIds.isEmpty()) return

        val updatedRead = getReadIds(userId).toMutableSet().apply { addAll(notificationIds) }
        val updatedCleared = getClearedIds(userId).toMutableSet().apply { addAll(notificationIds) }

        prefs.edit()
            .putStringSet(readKey(userId), updatedRead)
            .putStringSet(clearedKey(userId), updatedCleared)
            .apply()
    }

    fun applyVisibleState(userId: Int, notifications: List<Notification>): List<Notification> {
        val clearedIds = getClearedIds(userId)
        val user = session.getUser()

        return notifications
            .filterNot { notification ->
                clearedIds.contains(notification.id) ||
                    !profilePreferences.isEnabledForKind(notification.kind, user)
            }
            .map { notification ->
                notification.copy(isRead = isRead(userId, notification.id))
            }
    }

    fun unreadCount(userId: Int, notifications: List<Notification>): Int =
        notifications.count { !isRead(userId, it.id) && !isCleared(userId, it.id) }

    fun getDeliveredIds(userId: Int): Set<String> =
        prefs.getStringSet(deliveredKey(userId), emptySet())?.toSet().orEmpty()

    fun shouldShowSystemNotification(
        userId: Int,
        notificationId: String,
        kind: String,
    ): Boolean {
        val delivered = getDeliveredIds(userId)
        return !delivered.contains(notificationId) &&
            !isCleared(userId, notificationId) &&
            profilePreferences.isEnabledForKind(kind, session.getUser())
    }

    fun markAsDelivered(userId: Int, notificationId: String) {
        val updated = getDeliveredIds(userId).toMutableSet().apply { add(notificationId) }
        prefs.edit().putStringSet(deliveredKey(userId), updated).apply()
    }
}
