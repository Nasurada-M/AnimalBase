package com.animalbase.app.utils

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.animalbase.app.api.RetrofitClient
import java.util.concurrent.TimeUnit

/**
 * NotificationPollingWorker
 *
 * WorkManager background job — polls /api/notifications every 15 minutes.
 * This is the fallback when the WebSocket is not connected (app in background,
 * device woke from sleep, etc.).
 *
 * No Firebase, no paid service. Uses only the existing PostgreSQL notifications
 * table that is already part of the schema.
 *
 * ======================================================
 * POLLING INTERVAL (line ~49):
 *   Change the 15 / TimeUnit.MINUTES to your preferred interval.
 *   Minimum enforced by Android is 15 minutes.
 * ======================================================
 *
 * How it works:
 *   1. Fetches unread notifications from the backend REST endpoint
 *   2. Posts a local Android notification for each unread item
 *   3. The full list is refreshed when the user opens the Notifications screen
 */
class NotificationPollingWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {

    private val TAG = "AnimalBase-Poll"

    override suspend fun doWork(): Result {
        val session = SessionManager(applicationContext)
        val user = session.getUser()
        if (!session.isLoggedIn() || user == null) return Result.success()

        return try {
            val api = RetrofitClient.getApiService(applicationContext)
            val response = api.getNotifications()
            if (response.isSuccessful) {
                val store = NotificationStateStore(applicationContext)
                val notifications = store.applyVisibleState(
                    user.effectiveUserId,
                    response.body()?.notifications ?: emptyList()
                )

                notifications
                    .filter { !it.isRead && store.shouldShowSystemNotification(user.effectiveUserId, it.id) }
                    .take(3)   // avoid spamming the tray
                    .forEach { n ->
                        NotificationHelper.show(
                            applicationContext,
                            n.title,
                            n.message,
                            n.id,
                            NotificationNavigator.tabForRoute(n.route)
                        )
                        store.markAsDelivered(user.effectiveUserId, n.id)
                    }
                Log.d(TAG, "Polled: ${notifications.size} notifications")
            }
            Result.success()
        } catch (e: Exception) {
            Log.w(TAG, "Poll failed: ${e.message}")
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "animalbase_notification_poll"

        /**
         * Enqueue the recurring poll.
         * Call from MainActivity after the user logs in.
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            // ← CHANGE POLLING INTERVAL HERE (line ~68):
            val request = PeriodicWorkRequestBuilder<NotificationPollingWorker>(
                15, TimeUnit.MINUTES   // minimum allowed by Android
            )
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
            Log.d("AnimalBase-Poll", "Notification polling scheduled (15 min)")
        }

        /** Cancel the recurring poll (on logout). */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }
}
