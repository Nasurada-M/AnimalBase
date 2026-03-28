package com.animalbase.app.utils

import android.content.Context
import android.graphics.Canvas
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import kotlin.math.roundToInt

class NotificationSwipeDismissCallback(
    context: Context,
    private val onDismissed: (position: Int) -> Unit,
) : ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT) {

    private val backgroundColor = ContextCompat.getColor(context, R.color.error)
    private val clearIcon = AppCompatResources.getDrawable(context, R.drawable.ic_close)
    private val iconSizePx = (20 * context.resources.displayMetrics.density).roundToInt()
    private val iconMarginPx = (20 * context.resources.displayMetrics.density).roundToInt()

    override fun onMove(
        recyclerView: RecyclerView,
        viewHolder: RecyclerView.ViewHolder,
        target: RecyclerView.ViewHolder,
    ): Boolean = false

    override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
        val position = viewHolder.bindingAdapterPosition
        if (position != RecyclerView.NO_POSITION) {
            onDismissed(position)
        }
    }

    override fun getSwipeThreshold(viewHolder: RecyclerView.ViewHolder): Float = 0.3f

    override fun onChildDraw(
        c: Canvas,
        recyclerView: RecyclerView,
        viewHolder: RecyclerView.ViewHolder,
        dX: Float,
        dY: Float,
        actionState: Int,
        isCurrentlyActive: Boolean,
    ) {
        val itemView = viewHolder.itemView
        if (dX >= 0f) {
            super.onChildDraw(c, recyclerView, viewHolder, dX, dY, actionState, isCurrentlyActive)
            return
        }

        val backgroundLeft = itemView.right + dX.toInt()
        c.save()
        c.clipRect(backgroundLeft, itemView.top, itemView.right, itemView.bottom)
        c.drawColor(backgroundColor)

        clearIcon?.let { icon ->
            val iconLeft = itemView.right - iconMarginPx - iconSizePx
            val iconTop = itemView.top + (itemView.height - iconSizePx) / 2
            icon.setTint(ContextCompat.getColor(recyclerView.context, android.R.color.white))
            icon.setBounds(iconLeft, iconTop, iconLeft + iconSizePx, iconTop + iconSizePx)
            icon.draw(c)
        }

        c.restore()
        super.onChildDraw(c, recyclerView, viewHolder, dX, dY, actionState, isCurrentlyActive)
    }
}
