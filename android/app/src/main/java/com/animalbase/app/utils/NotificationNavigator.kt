package com.animalbase.app.utils

import android.content.Context
import android.content.Intent
import com.animalbase.app.models.Notification
import com.animalbase.app.ui.home.MainActivity
import com.animalbase.app.ui.notifications.NotificationsActivity

object NotificationNavigator {

    const val EXTRA_OPEN_TAB = "open_tab"
    const val TAB_HOME = "home"
    const val TAB_PET_FINDER = "pet_finder"
    const val TAB_APPLICATIONS = "applications"

    fun openNotificationCenter(context: Context) {
        context.startActivity(
            Intent(context, NotificationsActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        )
    }

    fun openNotificationTarget(context: Context, notification: Notification) {
        val targetTab = tabForRoute(notification.route)

        if (targetTab == null) {
            openNotificationCenter(context)
            return
        }

        context.startActivity(
            Intent(context, MainActivity::class.java)
                .putExtra(EXTRA_OPEN_TAB, targetTab)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        )
    }

    fun tabForRoute(route: String?): String? = when (route) {
        "/dashboard/applications" -> TAB_APPLICATIONS
        "/dashboard/pet-finder" -> TAB_PET_FINDER
        else -> null
    }
}
