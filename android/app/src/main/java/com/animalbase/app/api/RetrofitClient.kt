package com.animalbase.app.api

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import com.animalbase.app.BuildConfig
import com.animalbase.app.utils.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.URI
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private const val PREF_NAME = "animalbase_prefs"
    private const val KEY_API_BASE_URL = "api_base_url"
    private const val DEFAULT_EMULATOR_BASE_URL = "http://10.0.2.2:5000/api"

    private val defaultCandidates = listOf(
        BuildConfig.CONFIGURED_BACKEND_URL,
        BuildConfig.BASE_URL,
        DEFAULT_EMULATOR_BASE_URL,
        "http://10.0.3.2:5000/api",
        "http://127.0.0.1:5000/api",
        "http://localhost:5000/api"
    )

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    fun getBaseUrl(context: Context): String =
        prefs(context).getString(KEY_API_BASE_URL, null)
            ?.takeIf { it.isNotBlank() }
            ?.let(::normalizeConfiguredBaseUrl)
            ?: normalizeConfiguredBaseUrl(BuildConfig.CONFIGURED_BACKEND_URL)

    fun getDefaultBaseUrl(): String = normalizeConfiguredBaseUrl(BuildConfig.CONFIGURED_BACKEND_URL)

    fun saveBaseUrl(context: Context, url: String) {
        prefs(context).edit()
            .putString(KEY_API_BASE_URL, normalizeConfiguredBaseUrl(url))
            .apply()
    }

    fun clearSavedBaseUrl(context: Context) {
        prefs(context).edit().remove(KEY_API_BASE_URL).apply()
    }

    fun getWebSocketUrl(context: Context): String =
        runCatching { buildWebSocketUrl(getBaseUrl(context)) }
            .getOrDefault(BuildConfig.WS_URL)

    fun getCandidateBaseUrls(context: Context): List<String> {
        val saved = prefs(context)
            .getString(KEY_API_BASE_URL, null)
            ?.takeIf { it.isNotBlank() }
            ?.let(::normalizeConfiguredBaseUrl)

        return (listOfNotNull(saved) + defaultCandidates)
            .map(::normalizeConfiguredBaseUrl)
            .distinctBy(::normalizeApiRootUrl)
    }

    private fun normalizeUserFacingBaseUrl(url: String): String {
        var normalized = url.trim().trimEnd('/')
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://$normalized"
        }
        return normalized
    }

    private fun normalizeConfiguredBaseUrl(url: String): String {
        val normalized = normalizeUserFacingBaseUrl(url)
        return if (normalized.endsWith("/api", ignoreCase = true)) {
            normalized
        } else {
            "$normalized/api"
        }
    }

    private fun normalizeApiRootUrl(url: String): String {
        val normalized = normalizeConfiguredBaseUrl(url)
        return if (normalized.endsWith("/api", ignoreCase = true)) {
            normalized.dropLast(4)
        } else {
            normalized
        }
    }

    private fun buildWebSocketUrl(url: String): String {
        val apiRoot = normalizeApiRootUrl(url)
        val uri = URI("$apiRoot/")
        val wsScheme = if (uri.scheme.equals("https", ignoreCase = true)) "wss" else "ws"
        return "$wsScheme://${uri.authority}/ws"
    }

    private fun getOkHttpClient(context: Context): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor { chain ->
                val token = SessionManager(context).getToken()
                val request = if (!token.isNullOrBlank()) {
                    chain.request().newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                } else {
                    chain.request()
                }
                chain.proceed(request)
            }
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    fun getApiService(context: Context): ApiService =
        createApiService(context, getBaseUrl(context))

    fun createApiService(context: Context, baseUrl: String): ApiService =
        Retrofit.Builder()
            .baseUrl("${normalizeApiRootUrl(baseUrl)}/")
            .client(getOkHttpClient(context))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)

    @Suppress("unused")
    fun isProbablyEmulator(): Boolean =
        Build.FINGERPRINT.contains("generic", true) ||
            Build.MODEL.contains("Emulator", true) ||
            Build.MODEL.contains("Android SDK built for", true) ||
            Build.MANUFACTURER.contains("Genymotion", true) ||
            (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic")) ||
            Build.PRODUCT == "google_sdk"
}
