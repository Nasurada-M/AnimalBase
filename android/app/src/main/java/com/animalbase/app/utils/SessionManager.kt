package com.animalbase.app.utils

import android.content.Context
import android.content.SharedPreferences
import com.animalbase.app.models.User
import com.google.gson.Gson

/**
 * SessionManager stores the JWT, user payload, and last user activity time.
 * The inactivity timer is shared across the whole Android app.
 */
class SessionManager(context: Context) {

    companion object {
        const val INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000L
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_USER = "user_data"
        private const val KEY_LAST_ACTIVITY_AT = "last_activity_at"
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences("animalbase_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private fun rawToken(): String? = prefs.getString(KEY_TOKEN, null)

    private fun ensureActivityTimestamp() {
        if (rawToken() != null && getLastActivityAt() <= 0L) {
            markActivity()
        }
    }

    fun saveToken(token: String) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putLong(KEY_LAST_ACTIVITY_AT, System.currentTimeMillis())
            .apply()
    }

    fun getToken(): String? {
        val token = rawToken() ?: return null
        ensureActivityTimestamp()
        if (hasExpiredSession()) {
            logout()
            return null
        }
        return token
    }

    fun clearToken() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_LAST_ACTIVITY_AT)
            .apply()
    }

    fun saveUser(user: User) {
        prefs.edit().putString(KEY_USER, gson.toJson(user)).apply()
    }

    fun getUser(): User? {
        ensureActivityTimestamp()
        if (hasExpiredSession()) {
            logout()
            return null
        }

        val json = prefs.getString(KEY_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun clearUser() {
        prefs.edit().remove(KEY_USER).apply()
    }

    fun markActivity(timestamp: Long = System.currentTimeMillis()) {
        if (rawToken() != null) {
            prefs.edit().putLong(KEY_LAST_ACTIVITY_AT, timestamp).apply()
        }
    }

    fun getLastActivityAt(): Long = prefs.getLong(KEY_LAST_ACTIVITY_AT, 0L)

    fun hasExpiredSession(now: Long = System.currentTimeMillis()): Boolean {
        val token = rawToken() ?: return false
        val lastActivityAt = getLastActivityAt()
        if (token.isBlank() || lastActivityAt <= 0L) return false
        return now - lastActivityAt >= INACTIVITY_TIMEOUT_MS
    }

    fun remainingSessionMillis(now: Long = System.currentTimeMillis()): Long {
        val lastActivityAt = getLastActivityAt()
        if (lastActivityAt <= 0L) return INACTIVITY_TIMEOUT_MS
        return (INACTIVITY_TIMEOUT_MS - (now - lastActivityAt)).coerceAtLeast(0L)
    }

    fun isLoggedIn(): Boolean = getToken() != null

    fun logout() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USER)
            .remove(KEY_LAST_ACTIVITY_AT)
            .apply()
    }
}
