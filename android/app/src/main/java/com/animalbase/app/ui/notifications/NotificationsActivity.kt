package com.animalbase.app.ui.notifications

import android.os.Bundle
import android.view.View
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityNotificationsBinding
import com.animalbase.app.models.Notification
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.NotificationNavigator
import com.animalbase.app.utils.NotificationStateStore
import com.animalbase.app.utils.NotificationSwipeDismissCallback
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class NotificationsActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityNotificationsBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val notificationStore by lazy { NotificationStateStore(this) }
    private lateinit var notificationsAdapter: NotificationListAdapter
    private var latestNotifications: List<Notification> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityNotificationsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }

        notificationsAdapter = NotificationListAdapter(
            showMarkReadAction = true,
            onItemClick = { notification ->
                markNotificationAsRead(notification)
                if (NotificationNavigator.tabForRoute(notification.route) != null) {
                    NotificationNavigator.openNotificationTarget(this, notification)
                    finish()
                }
            },
            onMarkRead = { notification ->
                markNotificationAsRead(notification)
            }
        )

        binding.rvNotifications.layoutManager = LinearLayoutManager(this)
        binding.rvNotifications.adapter = notificationsAdapter
        ItemTouchHelper(
            NotificationSwipeDismissCallback(this) { position ->
                val notification = notificationsAdapter.getNotificationAt(position)
                if (notification == null) {
                    notificationsAdapter.submitList(latestNotifications.toList())
                } else {
                    clearNotification(notification, showFeedback = true)
                }
            }
        ).attachToRecyclerView(binding.rvNotifications)

        binding.btnMarkAllRead.setOnClickListener { markAllNotificationsAsRead() }
    }

    override fun onResume() {
        super.onResume()
        loadNotifications()
    }

    private fun loadNotifications() {
        val userId = session.getUser()?.effectiveUserId ?: run {
            latestNotifications = emptyList()
            renderNotifications()
            return
        }

        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getNotifications(scope = "user")

                if (response.isSuccessful) {
                    latestNotifications = notificationStore
                        .applyVisibleState(userId, response.body()?.notifications ?: emptyList())
                        .sortedByDescending { it.createdAt ?: "" }
                    renderNotifications()
                } else {
                    showToast("Unable to load notifications")
                }
            } catch (_: Exception) {
                showToast("Error loading notifications")
            } finally {
                binding.progressBar.gone()
            }
        }
    }

    private fun renderNotifications() {
        val unreadCount = latestNotifications.count { !it.isRead }
        binding.tvUnreadCount.text = formatUnreadSummary(unreadCount)
        binding.btnMarkAllRead.isEnabled = unreadCount > 0
        binding.btnMarkAllRead.alpha = if (unreadCount > 0) 1f else 0.5f

        binding.tvEmpty.visibility = if (latestNotifications.isEmpty()) View.VISIBLE else View.GONE
        binding.rvNotifications.visibility = if (latestNotifications.isEmpty()) View.GONE else View.VISIBLE
        notificationsAdapter.submitList(latestNotifications.toList())
    }

    private fun markNotificationAsRead(notification: Notification) {
        val userId = session.getUser()?.effectiveUserId ?: return
        if (!notificationStore.isRead(userId, notification.id)) {
            notificationStore.markAsRead(userId, notification.id)
            latestNotifications = latestNotifications.map { item ->
                if (item.id == notification.id) item.copy(isRead = true) else item
            }
            renderNotifications()
        }
    }

    private fun clearNotification(notification: Notification, showFeedback: Boolean = false) {
        val userId = session.getUser()?.effectiveUserId ?: return
        notificationStore.clearNotification(userId, notification.id)
        latestNotifications = latestNotifications.filterNot { it.id == notification.id }
        renderNotifications()
        if (showFeedback) {
            showToast("Notification cleared")
        }
    }

    private fun markAllNotificationsAsRead() {
        val userId = session.getUser()?.effectiveUserId ?: return
        val unreadIds = latestNotifications.filter { !it.isRead }.map { it.id }
        if (unreadIds.isEmpty()) return

        notificationStore.markAllAsRead(userId, unreadIds)
        latestNotifications = latestNotifications.map { it.copy(isRead = true) }
        renderNotifications()
        showToast("All marked as read")
    }

    private fun formatUnreadSummary(unreadCount: Int): String {
        val unreadLabel = if (unreadCount == 1) "1 unread" else "$unreadCount unread"
        return if (latestNotifications.isEmpty()) unreadLabel else "$unreadLabel | Swipe left to clear"
    }
}
