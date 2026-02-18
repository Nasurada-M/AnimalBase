package com.animalbase.app.ui.notifications

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityNotificationsBinding
import com.animalbase.app.databinding.ItemNotificationBinding
import com.animalbase.app.models.Notification
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class NotificationsActivity : AppCompatActivity() {
    private lateinit var binding: ActivityNotificationsBinding
    private val api by lazy { RetrofitClient.getApiService(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityNotificationsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        binding.rvNotifications.layoutManager = LinearLayoutManager(this)

        binding.btnMarkAllRead.setOnClickListener { markAllRead() }
        loadNotifications()
    }

    private fun loadNotifications() {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getNotifications()
                binding.progressBar.gone()
                if (response.isSuccessful) {
                    val notifications = response.body()?.notifications ?: emptyList()
                    val unread = response.body()?.unreadCount ?: 0
                    binding.tvUnreadCount.text = "$unread unread"
                    binding.rvNotifications.adapter = NotificationAdapter(notifications.toMutableList()) { notif ->
                        markRead(notif.notificationId)
                    }
                    binding.tvEmpty.visibility = if (notifications.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                showToast("Error loading notifications")
            }
        }
    }

    private fun markRead(id: Int) {
        lifecycleScope.launch {
            try { api.markNotificationRead(id) } catch (e: Exception) {}
        }
    }

    private fun markAllRead() {
        lifecycleScope.launch {
            try {
                api.markAllRead()
                showToast("All marked as read")
                loadNotifications()
            } catch (e: Exception) {}
        }
    }

    inner class NotificationAdapter(
        private val items: MutableList<Notification>,
        private val onRead: (Notification) -> Unit
    ) : RecyclerView.Adapter<NotificationAdapter.VH>() {
        inner class VH(val b: ItemNotificationBinding) : RecyclerView.ViewHolder(b.root)
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
            VH(ItemNotificationBinding.inflate(LayoutInflater.from(parent.context), parent, false))
        override fun getItemCount() = items.size
        override fun onBindViewHolder(holder: VH, position: Int) {
            val n = items[position]
            holder.b.tvTitle.text = n.title
            holder.b.tvMessage.text = n.message
            holder.b.tvDate.text = n.createdAt?.formatDateTime() ?: ""
            holder.b.root.alpha = if (n.isRead) 0.6f else 1.0f
            holder.b.viewUnreadDot.visibility =
                if (!n.isRead) android.view.View.VISIBLE else android.view.View.GONE
            holder.b.root.setOnClickListener { onRead(n) }
        }
    }
}
