package com.animalbase.app.utils

import android.content.Context
import android.content.SharedPreferences
import com.animalbase.app.models.User
import com.google.gson.Gson

/**
 * SessionManager: Stores and retrieves login state using SharedPreferences
 * Token is used in all authenticated API calls (added by Retrofit interceptor)
 */
class SessionManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("animalbase_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun saveToken(token: String) = prefs.edit().putString("jwt_token", token).apply()
    fun getToken(): String? = prefs.getString("jwt_token", null)
    fun clearToken() = prefs.edit().remove("jwt_token").apply()

    fun saveUser(user: User) = prefs.edit().putString("user_data", gson.toJson(user)).apply()
    fun getUser(): User? {
        val json = prefs.getString("user_data", null) ?: return null
        return try { gson.fromJson(json, User::class.java) } catch (e: Exception) { null }
    }
    fun clearUser() = prefs.edit().remove("user_data").apply()

    fun saveFcmToken(token: String) = prefs.edit().putString("fcm_token", token).apply()
    fun getFcmToken(): String? = prefs.getString("fcm_token", null)

    fun isLoggedIn(): Boolean = getToken() != null

    fun logout() {
        prefs.edit().clear().apply()
    }
}
