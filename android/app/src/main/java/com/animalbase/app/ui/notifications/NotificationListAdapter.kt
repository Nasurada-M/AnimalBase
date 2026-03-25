package com.animalbase.app.ui.notifications

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import com.animalbase.app.databinding.ItemNotificationBinding
import com.animalbase.app.models.Notification
import com.animalbase.app.utils.formatNotificationTimestamp
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.visible

class NotificationListAdapter(
    private val showMarkReadAction: Boolean = true,
    private val onItemClick: (Notification) -> Unit,
    private val onMarkRead: (Notification) -> Unit,
    private val onClear: (Notification) -> Unit,
) : RecyclerView.Adapter<NotificationListAdapter.ViewHolder>() {

    private var items: List<Notification> = emptyList()

    inner class ViewHolder(val binding: ItemNotificationBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder =
        ViewHolder(ItemNotificationBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val notification = items[position]
        val context = holder.itemView.context
        val meta = notificationMeta(notification.kind)

        with(holder.binding) {
            tvTitle.text = notification.title
            tvMessage.text = notification.message
            tvTimestamp.text = notification.createdAt?.formatNotificationTimestamp() ?: ""
            tvKindChip.text = meta.label
            ivKindIcon.setImageResource(meta.iconRes)
            ivKindIcon.imageTintList = ColorStateList.valueOf(context.getColor(meta.colorRes))
            tvKindChip.backgroundTintList = ColorStateList.valueOf(context.getColor(meta.colorRes))

            if (notification.isRead) {
                viewUnreadDot.gone()
                btnMarkRead.gone()
                root.alpha = 0.78f
                root.setCardBackgroundColor(context.getColor(R.color.surface))
                root.strokeColor = context.getColor(R.color.divider)
            } else {
                viewUnreadDot.visible()
                btnMarkRead.visibility = if (showMarkReadAction) android.view.View.VISIBLE else android.view.View.GONE
                root.alpha = 1f
                root.setCardBackgroundColor(context.getColor(R.color.primary_light))
                root.strokeColor = context.getColor(R.color.accent)
            }

            btnMarkRead.setOnClickListener { onMarkRead(notification) }
            btnClear.setOnClickListener { onClear(notification) }
            root.setOnClickListener { onItemClick(notification) }
        }
    }

    fun submitList(notifications: List<Notification>) {
        items = notifications
        notifyDataSetChanged()
    }

    private data class NotificationMeta(
        val label: String,
        val iconRes: Int,
        val colorRes: Int,
    )

    private fun notificationMeta(kind: String): NotificationMeta = when (kind) {
        "application_approved" -> NotificationMeta("Approved", R.drawable.ic_check_circle, R.color.status_available)
        "application_rejected" -> NotificationMeta("Rejected", R.drawable.ic_error_circle, R.color.status_rejected)
        "application_pending" -> NotificationMeta("Pending", R.drawable.ic_adopt, R.color.status_pending)
        "sighting_reported" -> NotificationMeta("Sighting", R.drawable.ic_missing, R.color.info)
        "lost_pet_found" -> NotificationMeta("Found", R.drawable.ic_check_circle, R.color.status_found)
        else -> NotificationMeta("Update", R.drawable.ic_notification, R.color.primary)
    }
}
