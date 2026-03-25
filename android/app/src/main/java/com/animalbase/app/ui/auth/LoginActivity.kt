package com.animalbase.app.ui.auth

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityLoginBinding
import com.animalbase.app.models.LoginRequest
import com.animalbase.app.ui.home.MainActivity
import com.animalbase.app.utils.ValidationUtils
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.IOException

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val session by lazy { com.animalbase.app.utils.SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (intent.getBooleanExtra("session_expired", false)) {
            showSessionExpiredMessage()
        }
        binding.btnDismissSessionExpired.setOnClickListener { hideSessionExpiredMessage() }
        binding.btnLogin.setOnClickListener { attemptLogin() }
        binding.btnGoRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
        binding.tvForgotPassword.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            if (email.isEmpty()) {
                showToast("Enter your email first")
                return@setOnClickListener
            }
            sendForgotPassword(email)
        }
    }

    private fun attemptLogin() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString()

        binding.tilEmail.error = null
        binding.tilPassword.error = null

        if (!ValidationUtils.isValidEmail(email)) {
            binding.tilEmail.error = "Valid email is required"
            return
        }
        if (password.isEmpty()) {
            binding.tilPassword.error = "Password is required"
            return
        }

        binding.progressBar.visible()
        binding.btnLogin.isEnabled = false

        lifecycleScope.launch {
            val result = tryLoginAcrossCandidates(email, password)
            binding.progressBar.gone()
            binding.btnLogin.isEnabled = true

            when {
                result.success && result.token != null -> {
                    session.saveToken(result.token)
                    result.userJson?.let { session.saveUser(it) }
                    startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                    finish()
                }
                result.networkFailure -> showConnectionDialog()
                else -> showToast(result.message ?: "Login failed. Check your email and password.")
            }
        }
    }

    private fun showSessionExpiredMessage() {
        binding.tvSessionExpiredMessage.text = getString(com.animalbase.app.R.string.session_expired_message)
        binding.sessionExpiredCard.visible()
    }

    private fun hideSessionExpiredMessage() {
        binding.sessionExpiredCard.gone()
        intent.removeExtra("session_expired")
    }

    private suspend fun tryLoginAcrossCandidates(email: String, password: String): LoginAttemptResult {
        var lastMessage: String? = null
        var lastNetworkFailure = false

        for (baseUrl in RetrofitClient.getCandidateBaseUrls(this)) {
            val api = RetrofitClient.createApiService(this, baseUrl)
            try {
                val response = api.login(LoginRequest(email, password))
                val body = response.body()
                if (response.isSuccessful && body?.token != null) {
                    RetrofitClient.saveBaseUrl(this, baseUrl)
                    return LoginAttemptResult(success = true, token = body.token, userJson = body.user)
                }

                val message = try {
                    response.errorBody()?.string()?.let { JSONObject(it).optString("error") }
                } catch (_: Exception) {
                    null
                }

                if (response.code() in listOf(400, 401, 409)) {
                    return LoginAttemptResult(success = false, message = message ?: "Invalid email or password")
                }

                lastMessage = message
            } catch (_: IOException) {
                lastNetworkFailure = true
            } catch (e: Exception) {
                lastMessage = e.message
            }
        }

        return LoginAttemptResult(success = false, message = lastMessage, networkFailure = lastNetworkFailure)
    }

    private fun sendForgotPassword(email: String) {
        lifecycleScope.launch {
            try {
                RetrofitClient.getApiService(this@LoginActivity)
                    .forgotPassword(com.animalbase.app.models.ForgotPasswordRequest(email))
                showToast("If registered, reset instructions sent to $email")
            } catch (e: Exception) {
                showToast("Error: ${e.message}")
            }
        }
    }

    private fun showConnectionDialog() {
        val dp8 = (8 * resources.displayMetrics.density).toInt()
        val dp16 = dp8 * 2
        val suggestedUrl = RetrofitClient.getDefaultBaseUrl()

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp16, dp8, dp16, dp8)
        }

        val hint = TextView(this).apply {
            text = "Recommended ngrok URL:\n$suggestedUrl\n\nLocal fallbacks:\n- Emulator: http://10.0.2.2:5000/api\n- Real phone: http://YOUR_LAN_IP:5000/api"
            setPadding(0, 0, 0, dp8)
            setTextColor(resources.getColor(android.R.color.darker_gray, null))
            textSize = 12f
        }

        val input = EditText(this).apply {
            setText(RetrofitClient.getBaseUrl(this@LoginActivity))
            setHint(suggestedUrl)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine()
        }

        layout.addView(hint)
        layout.addView(input)

        AlertDialog.Builder(this)
            .setTitle("Set Backend URL")
            .setMessage("Can't reach the server. Make sure the backend is running and ngrok is forwarding port 5000, then enter the backend URL ending in /api.")
            .setView(layout)
            .setPositiveButton("Save & Retry") { _, _ ->
                val url = input.text.toString().trim()
                if (url.isNotEmpty()) {
                    RetrofitClient.saveBaseUrl(this, url)
                    showToast("Saved! Try logging in again.")
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private data class LoginAttemptResult(
        val success: Boolean,
        val token: String? = null,
        val userJson: com.animalbase.app.models.User? = null,
        val message: String? = null,
        val networkFailure: Boolean = false
    )
}
