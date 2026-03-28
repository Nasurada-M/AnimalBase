package com.animalbase.app.ui.auth

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityResetPasswordBinding
import com.animalbase.app.models.ResetPasswordRequest
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.Response
import java.io.IOException

class ResetPasswordActivity : AppCompatActivity() {

    companion object {
        private const val EXTRA_EMAIL = "extra_email"
        private const val EXTRA_RESET_TOKEN = "extra_reset_token"

        fun createIntent(context: Context, email: String, resetToken: String): Intent {
            return Intent(context, ResetPasswordActivity::class.java).apply {
                putExtra(EXTRA_EMAIL, email)
                putExtra(EXTRA_RESET_TOKEN, resetToken)
            }
        }
    }

    private lateinit var binding: ActivityResetPasswordBinding
    private var resetEmail: String = ""
    private var resetToken: String = ""
    private var isComplete = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityResetPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        resetEmail = intent.getStringExtra(EXTRA_EMAIL).orEmpty()
        resetToken = intent.getStringExtra(EXTRA_RESET_TOKEN).orEmpty()

        if (resetEmail.isBlank() || resetToken.isBlank()) {
            startActivity(ForgotPasswordActivity.createIntent(this))
            finish()
            return
        }

        binding.tvResetSubtitle.text = "Update the password for $resetEmail."
        binding.tvVerifiedEmail.text = resetEmail

        binding.btnBack.setOnClickListener {
            if (isComplete) {
                goToLogin()
            } else {
                startActivity(ForgotPasswordActivity.createIntent(this, resetEmail))
                finish()
            }
        }
        binding.btnDismissError.setOnClickListener { hideError() }
        binding.btnResetPassword.setOnClickListener { attemptResetPassword() }
        binding.btnBackToLogin.setOnClickListener { goToLogin() }

        renderState()
    }

    private fun attemptResetPassword() {
        val newPassword = binding.etNewPassword.text?.toString().orEmpty()
        val confirmPassword = binding.etConfirmPassword.text?.toString().orEmpty()

        binding.tilNewPassword.error = null
        binding.tilConfirmPassword.error = null
        clearMessages()

        if (newPassword.length < 6) {
            binding.tilNewPassword.error = "New password must be at least 6 characters."
            return
        }
        if (newPassword != confirmPassword) {
            binding.tilConfirmPassword.error = "Passwords do not match."
            return
        }

        setLoading(true)
        lifecycleScope.launch {
            val result = tryResetPasswordAcrossCandidates(newPassword, confirmPassword)
            setLoading(false)

            when {
                result.success -> {
                    showSuccess(result.message ?: "Password updated successfully.")
                    isComplete = true
                    renderState()
                }

                result.networkFailure -> {
                    showToast("Connection failed. Check the backend URL.")
                    showConnectionDialog()
                }

                else -> showError(result.message ?: "Failed to reset password.")
            }
        }
    }

    private suspend fun tryResetPasswordAcrossCandidates(
        newPassword: String,
        confirmPassword: String
    ): ActionResult {
        var lastMessage: String? = null
        var networkFailure = false

        for (baseUrl in RetrofitClient.getCandidateBaseUrls(this)) {
            val api = RetrofitClient.createApiService(this, baseUrl)
            try {
                val response = api.resetPassword(
                    ResetPasswordRequest(
                        resetToken = resetToken,
                        newPassword = newPassword,
                        confirmPassword = confirmPassword
                    )
                )
                val body = response.body()

                if (response.isSuccessful) {
                    RetrofitClient.saveBaseUrl(this, baseUrl)
                    return ActionResult(success = true, message = body?.message)
                }

                val parsed = parseError(response)
                if (response.code() in listOf(400, 404, 409, 500)) {
                    return ActionResult(success = false, message = parsed)
                }
                lastMessage = parsed
            } catch (_: IOException) {
                networkFailure = true
            } catch (e: Exception) {
                lastMessage = e.message
            }
        }

        return ActionResult(success = false, message = lastMessage, networkFailure = networkFailure)
    }

    private fun renderState() {
        binding.formContainer.visibility = if (isComplete) android.view.View.GONE else android.view.View.VISIBLE
        binding.completeContainer.visibility = if (isComplete) android.view.View.VISIBLE else android.view.View.GONE
    }

    private fun parseError(response: Response<*>): String {
        return try {
            val raw = response.errorBody()?.string().orEmpty()
            if (raw.isBlank()) return "Request failed"
            val json = JSONObject(raw)
            listOf(
                json.optString("error"),
                json.optString("details"),
                json.optString("message")
            ).firstOrNull { it.isNotBlank() } ?: "Request failed"
        } catch (_: Exception) {
            "Request failed"
        }
    }

    private fun setLoading(loading: Boolean) {
        if (loading) binding.progressBar.visible() else binding.progressBar.gone()
        listOf(binding.btnBack, binding.btnResetPassword, binding.btnBackToLogin).forEach {
            it.isEnabled = !loading
        }
    }

    private fun showSuccess(message: String) {
        binding.tvSuccess.text = message
        binding.successCard.visible()
        binding.errorCard.gone()
    }

    private fun showError(message: String) {
        binding.tvError.text = message
        binding.errorCard.visible()
        binding.successCard.gone()
    }

    private fun hideError() {
        binding.errorCard.gone()
    }

    private fun clearMessages() {
        binding.successCard.gone()
        binding.errorCard.gone()
    }

    private fun goToLogin() {
        startActivity(
            Intent(this, LoginActivity::class.java)
                .putExtra(LoginActivity.EXTRA_PREFILL_EMAIL, resetEmail)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        )
        finish()
    }

    private fun showConnectionDialog() {
        val suggestedUrl = RetrofitClient.getDefaultBaseUrl()
        val input = EditText(this).apply {
            setText(RetrofitClient.getBaseUrl(this@ResetPasswordActivity))
            hint = suggestedUrl
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setSingleLine()
        }

        AlertDialog.Builder(this)
            .setTitle("Backend URL")
            .setMessage(
                "Recommended ngrok URL: $suggestedUrl\n\n" +
                    "Local fallback examples:\n" +
                    "- Emulator: http://10.0.2.2:5000/api\n" +
                    "- Real phone: http://YOUR_LAN_IP:5000/api"
            )
            .setView(input)
            .setPositiveButton("Save") { _, _ ->
                val url = input.text.toString().trim()
                if (url.isNotEmpty()) {
                    RetrofitClient.saveBaseUrl(this, url)
                    showToast("Backend URL saved. Try again.")
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private data class ActionResult(
        val success: Boolean,
        val message: String? = null,
        val networkFailure: Boolean = false
    )
}
