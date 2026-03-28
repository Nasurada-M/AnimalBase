package com.animalbase.app.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.animalbase.app.models.Notification
import com.animalbase.app.ui.adoption.PetDetailActivity
import com.animalbase.app.ui.home.MainActivity
import com.animalbase.app.ui.missing.MissingPetDetailActivity
import com.animalbase.app.ui.notifications.NotificationsActivity

object NotificationNavigator {

    const val EXTRA_OPEN_TAB = "open_tab"
    const val TAB_HOME = "home"
    const val TAB_ADOPTION = "adoption"
    const val TAB_PET_FINDER = "pet_finder"
    const val TAB_APPLICATIONS = "applications"

    fun openNotificationCenter(context: Context) {
        context.startActivity(
            Intent(context, NotificationsActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        )
    }

    fun openNotificationTarget(context: Context, notification: Notification) {
        context.startActivity(intentForRoute(context, notification.route))
    }

    fun intentForRoute(context: Context, route: String?): Intent {
        detailIntentForRoute(context, route)?.let { return it }
        val targetTab = tabForRoute(route)

        return if (targetTab == null) {
            Intent(context, NotificationsActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        } else {
            Intent(context, MainActivity::class.java)
                .putExtra(EXTRA_OPEN_TAB, targetTab)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
    }

    fun tabForRoute(route: String?): String? = when (parseRoute(route)?.path) {
        "/dashboard/home" -> TAB_HOME
        "/dashboard/pet-adoption" -> TAB_ADOPTION
        "/dashboard/applications" -> TAB_APPLICATIONS
        "/dashboard/pet-finder" -> TAB_PET_FINDER
        else -> null
    }

    private fun detailIntentForRoute(context: Context, route: String?): Intent? {
        val parsedRoute = parseRoute(route) ?: return null
        val petId = parsedRoute.getQueryParameter("petId")?.toIntOrNull()?.takeIf { it > 0 }

        return when (parsedRoute.path) {
            "/dashboard/pet-adoption" -> petId?.let {
                Intent(context, PetDetailActivity::class.java)
                    .putExtra("pet_id", it)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }

            "/dashboard/pet-finder" -> petId?.let {
                Intent(context, MissingPetDetailActivity::class.java)
                    .putExtra("missing_pet_id", it)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }

            else -> null
        }
    }

    private fun parseRoute(route: String?): Uri? {
        val normalizedRoute = route?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return Uri.parse(normalizedRoute)
    }
}
