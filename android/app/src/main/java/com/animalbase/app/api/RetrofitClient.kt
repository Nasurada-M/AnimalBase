package com.animalbase.app.api

import android.content.Context
import com.animalbase.app.BuildConfig
import com.animalbase.app.utils.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    // ======================================================
    // BASE URL: Change in app/build.gradle defaultConfig
    //   buildConfigField "String", "BASE_URL", '"http://10.0.2.2:3000"'
    // ======================================================
    private var baseUrl = BuildConfig.BASE_URL

    private fun getOkHttpClient(context: Context): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor { chain ->
                val token = SessionManager(context).getToken()
                val request = if (token != null) {
                    chain.request().newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                } else {
                    chain.request()
                }
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    fun getApiService(context: Context): ApiService {
        return Retrofit.Builder()
            .baseUrl("$baseUrl/")
            .client(getOkHttpClient(context))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
