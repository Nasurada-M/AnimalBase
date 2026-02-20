package com.animalbase.app.utils

import android.content.Context
import android.content.SharedPreferences
import com.animalbase.app.models.User
import com.google.gson.Gson

/**
 * SessionManager — stores JWT and user data locally.
 *
 * FCM token storage removed (no Firebase).
 * Authentication uses JWT only; WebSocket is authenticated via the same JWT.
 */
class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("animalbase_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    // ── Token ─────────────────────────────────────────────────────────────────
    fun saveToken(token: String) = prefs.edit().putString("jwt_token", token).apply()
    fun getToken(): String?      = prefs.getString("jwt_token", null)
    fun clearToken()             = prefs.edit().remove("jwt_token").apply()

    // ── User ──────────────────────────────────────────────────────────────────
    fun saveUser(user: User) = prefs.edit().putString("user_data", gson.toJson(user)).apply()
    fun getUser(): User? {
        val json = prefs.getString("user_data", null) ?: return null
        return try { gson.fromJson(json, User::class.java) } catch (e: Exception) { null }
    }
    fun clearUser() = prefs.edit().remove("user_data").apply()

    // ── Auth state ────────────────────────────────────────────────────────────
    fun isLoggedIn(): Boolean = getToken() != null

    fun logout() = prefs.edit().clear().apply()
}
