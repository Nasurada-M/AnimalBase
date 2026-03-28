package com.animalbase.app.utils

import android.content.Context
import com.animalbase.app.models.User

data class PrivacyPreferenceState(
    val profileVisible: Boolean = true,
    val activityVisible: Boolean = false,
    val dataSharing: Boolean = false
)

class ProfilePreferencesStore(context: Context) {

    companion object {
        private const val PREF_NAME = "animalbase_profile_preferences"
        private const val KEY_APPLICATION_UPDATES = "application_updates"
        private const val KEY_WEEKLY_DIGEST = "weekly_digest"
        private const val KEY_PROMOTIONS = "promotions_news"
        private const val KEY_PROFILE_VISIBLE = "profile_visible"
        private const val KEY_ACTIVITY_VISIBLE = "activity_visible"
        private const val KEY_DATA_SHARING = "data_sharing"
    }

    private val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun isApplicationUpdatesEnabled(): Boolean = prefs.getBoolean(KEY_APPLICATION_UPDATES, true)

    fun setApplicationUpdatesEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_APPLICATION_UPDATES, enabled).apply()
    }

    fun isWeeklyDigestEnabled(): Boolean = prefs.getBoolean(KEY_WEEKLY_DIGEST, true)

    fun setWeeklyDigestEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_WEEKLY_DIGEST, enabled).apply()
    }

    fun isPromotionsEnabled(): Boolean = prefs.getBoolean(KEY_PROMOTIONS, false)

    fun setPromotionsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_PROMOTIONS, enabled).apply()
    }

    fun getPrivacySettings(): PrivacyPreferenceState = PrivacyPreferenceState(
        profileVisible = prefs.getBoolean(KEY_PROFILE_VISIBLE, true),
        activityVisible = prefs.getBoolean(KEY_ACTIVITY_VISIBLE, false),
        dataSharing = prefs.getBoolean(KEY_DATA_SHARING, false)
    )

    fun setProfileVisible(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_PROFILE_VISIBLE, enabled).apply()
    }

    fun setActivityVisible(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_ACTIVITY_VISIBLE, enabled).apply()
    }

    fun setDataSharing(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_DATA_SHARING, enabled).apply()
    }

    fun isEnabledForKind(kind: String, user: User?): Boolean {
        return when (kind) {
            "application_pending",
            "application_approved",
            "application_rejected" -> isApplicationUpdatesEnabled()

            "new_pet_available" -> user?.newPetEmailNotificationsEnabled ?: true

            "missing_pet_reported",
            "sighting_reported",
            "lost_pet_found" -> user?.petFinderEmailNotificationsEnabled ?: true

            "weekly_digest" -> isWeeklyDigestEnabled()

            "promotion",
            "promotion_news",
            "promotions_news",
            "news" -> isPromotionsEnabled()

            else -> true
        }
    }
}
