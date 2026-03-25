package com.animalbase.app.ui.base

import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import com.animalbase.app.ui.auth.LoginActivity
import com.animalbase.app.utils.NotificationPollingWorker
import com.animalbase.app.utils.SessionManager

abstract class SessionAwareActivity : AppCompatActivity() {

    protected val session by lazy { SessionManager(this) }

    private val timeoutHandler = Handler(Looper.getMainLooper())
    private var isHandlingTimeout = false

    private val timeoutRunnable = Runnable {
        if (session.isLoggedIn()) {
            expireSession(showMessage = true)
        }
    }

    override fun onResume() {
        super.onResume()
        if (!requiresAuthenticatedSession()) return

        when {
            session.hasExpiredSession() -> expireSession(showMessage = true)
            !session.isLoggedIn() -> expireSession(showMessage = false)
            else -> refreshSessionActivity()
        }
    }

    override fun onPause() {
        super.onPause()
        timeoutHandler.removeCallbacks(timeoutRunnable)
    }

    override fun onUserInteraction() {
        super.onUserInteraction()
        if (requiresAuthenticatedSession() && session.isLoggedIn()) {
            refreshSessionActivity()
        }
    }

    protected open fun requiresAuthenticatedSession(): Boolean = true

    protected fun refreshSessionActivity() {
        session.markActivity()
        timeoutHandler.removeCallbacks(timeoutRunnable)
        timeoutHandler.postDelayed(timeoutRunnable, session.remainingSessionMillis())
    }

    protected fun expireSession(showMessage: Boolean) {
        if (isHandlingTimeout) return
        isHandlingTimeout = true

        timeoutHandler.removeCallbacks(timeoutRunnable)
        NotificationPollingWorker.cancel(this)
        session.logout()

        startActivity(
            Intent(this, LoginActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                putExtra("session_expired", showMessage)
            }
        )
        finish()
    }
}
