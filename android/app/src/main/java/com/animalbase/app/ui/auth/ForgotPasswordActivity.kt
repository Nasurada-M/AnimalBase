package com.animalbase.app.ui.auth

import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.os.CountDownTimer
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.KeyEvent
import android.view.View
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityForgotPasswordBinding
import com.animalbase.app.models.SendOtpRequest
import com.animalbase.app.models.VerifyOtpRequest
import com.animalbase.app.utils.ValidationUtils
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.Response
import java.io.IOException

class ForgotPasswordActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_EMAIL = "extra_email"

        fun createIntent(context: android.content.Context, email: String? = null): Intent {
            return Intent(context, ForgotPasswordActivity::class.java).apply {
                if (!email.isNullOrBlank()) {
                    putExtra(EXTRA_EMAIL, email)
                }
            }
        }
    }

    private lateinit var binding: ActivityForgotPasswordBinding
    private val otpInputs by lazy {
        listOf(
            binding.etOtp1,
            binding.etOtp2,
            binding.etOtp3,
            binding.etOtp4,
            binding.etOtp5,
            binding.etOtp6
        )
    }

    private var resendTimer: CountDownTimer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.etEmail.setText(intent.getStringExtra(EXTRA_EMAIL).orEmpty())

        setupOtpInputs()
        setupClicks()
        goToStep(1)
    }

    private fun setupClicks() {
        binding.btnBack.setOnClickListener { finish() }
        binding.btnDismissError.setOnClickListener { hideError() }
        binding.btnSendCode.setOnClickListener { sendOtp() }
        binding.btnBackToEmail.setOnClickListener {
            clearMessages()
            goToStep(1)
        }
        binding.btnResendCode.setOnClickListener { sendOtp(resend = true) }
        binding.btnVerifyCode.setOnClickListener { verifyOtp() }
        binding.btnGoLogin.setOnClickListener { finish() }
    }

    private fun setupOtpInputs() {
        otpInputs.forEachIndexed { index, editText ->
            editText.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

                override fun afterTextChanged(s: Editable?) {
                    if (s?.length == 1 && index < otpInputs.lastIndex) {
                        otpInputs[index + 1].requestFocus()
                    }
                }
            })

            editText.setOnKeyListener { _, keyCode, event ->
                if (
                    keyCode == KeyEvent.KEYCODE_DEL &&
                    event.action == KeyEvent.ACTION_DOWN &&
                    editText.text.isNullOrEmpty() &&
                    index > 0
                ) {
                    otpInputs[index - 1].requestFocus()
                    otpInputs[index - 1].setText("")
                    true
                } else {
                    false
                }
            }
        }
    }

    private fun sendOtp(resend: Boolean = false) {
        val email = binding.etEmail.text.toString().trim().lowercase()
        binding.tilEmail.error = null
        clearMessages()

        if (!ValidationUtils.isValidEmail(email)) {
            binding.tilEmail.error = "Please enter a valid email address."
            return
        }

        setLoading(true)
        lifecycleScope.launch {
            val result = trySendResetOtpAcrossCandidates(email)
            setLoading(false)

            when {
                result.success -> {
                    binding.tvStep2Subtitle.text =
                        "A 6-digit reset code was sent to $email. Enter it below. It expires in 1 minute."
                    clearOtpInputs()
                    showSuccess(
                        if (resend) {
                            "A new password reset code was sent."
                        } else {
                            result.message ?: "Password reset code sent."
                        }
                    )
                    startResendTimer(result.expiresInSeconds ?: 60)
                    goToStep(2)
                    otpInputs.first().requestFocus()
                }

                result.networkFailure -> {
                    showToast("Connection failed. Check the backend URL.")
                    showConnectionDialog()
                }

                else -> showError(result.message ?: "Failed to send password reset code.")
            }
        }
    }

    private fun verifyOtp() {
        val email = binding.etEmail.text.toString().trim().lowercase()
        val otp = getOtp()
        clearMessages()

        if (otp.length != 6) {
            showError("Enter the full 6-digit code.")
            return
        }

        setLoading(true)
        lifecycleScope.launch {
            val result = tryVerifyResetOtpAcrossCandidates(email, otp)
            setLoading(false)

            when {
                result.success && !result.resetToken.isNullOrBlank() -> {
                    startActivity(ResetPasswordActivity.createIntent(this@ForgotPasswordActivity, email, result.resetToken))
                    finish()
                }

                result.networkFailure -> {
                    showToast("Connection failed. Check the backend URL.")
                    showConnectionDialog()
                }

                else -> {
                    clearOtpInputs()
                    otpInputs.first().requestFocus()
                    showError(result.message ?: "Incorrect or expired code. Please try again.")
                }
            }
        }
    }

    private fun goToStep(step: Int) {
        binding.step1Container.visibility = if (step == 1) View.VISIBLE else View.GONE
        binding.step2Container.visibility = if (step == 2) View.VISIBLE else View.GONE
        updateStepUI(step)
    }

    private fun updateStepUI(activeStep: Int) {
        val circles = listOf(binding.stepCircle1, binding.stepCircle2, binding.stepCircle3)
        val icons = listOf(binding.stepIcon1, binding.stepIcon2, binding.stepIcon3)
        val labels = listOf(binding.stepLabel1, binding.stepLabel2, binding.stepLabel3)
        val lines = listOf(binding.stepLine1, binding.stepLine2)
        val iconRes = listOf(R.drawable.ic_email, R.drawable.ic_key, R.drawable.ic_lock)

        circles.indices.forEach { index ->
            when {
                index + 1 < activeStep -> {
                    circles[index].setBackgroundResource(R.drawable.bg_step_done)
                    icons[index].setImageResource(R.drawable.ic_check)
                    icons[index].imageTintList = ColorStateList.valueOf(Color.WHITE)
                    labels[index].setTextColor(Color.parseColor("#A78BFA"))
                }

                index + 1 == activeStep -> {
                    circles[index].setBackgroundResource(R.drawable.bg_step_active)
                    icons[index].setImageResource(iconRes[index])
                    icons[index].imageTintList = ColorStateList.valueOf(Color.WHITE)
                    labels[index].setTextColor(Color.parseColor("#7C3AED"))
                }

                else -> {
                    circles[index].setBackgroundResource(R.drawable.bg_step_inactive)
                    icons[index].setImageResource(iconRes[index])
                    icons[index].imageTintList = ColorStateList.valueOf(Color.parseColor("#D1D5DB"))
                    labels[index].setTextColor(Color.parseColor("#D1D5DB"))
                }
            }
        }

        lines.indices.forEach { index ->
            lines[index].setBackgroundResource(
                if (index + 2 <= activeStep) {
                    R.drawable.bg_step_line_active
                } else {
                    R.drawable.bg_step_line_inactive
                }
            )
        }
    }

    private fun startResendTimer(durationSeconds: Int) {
        resendTimer?.cancel()
        binding.btnResendCode.isEnabled = false
        binding.btnResendCode.text = "Resend in ${durationSeconds}s"
        binding.tvOtpExpiry.text = "Code expires in ${durationSeconds}s"

        resendTimer = object : CountDownTimer(durationSeconds * 1000L, 1_000L) {
            override fun onTick(millisUntilFinished: Long) {
                val secondsLeft = (millisUntilFinished / 1000).toInt()
                binding.btnResendCode.text = "Resend in ${secondsLeft}s"
                binding.tvOtpExpiry.text = "Code expires in ${secondsLeft}s"
            }

            override fun onFinish() {
                binding.btnResendCode.isEnabled = true
                binding.btnResendCode.text = "Resend code"
                binding.tvOtpExpiry.text = "Code expired. Request a new code."
            }
        }.start()
    }

    private suspend fun trySendResetOtpAcrossCandidates(email: String): ActionResult {
        var lastMessage: String? = null
        var networkFailure = false

        for (baseUrl in RetrofitClient.getCandidateBaseUrls(this)) {
            val api = RetrofitClient.createApiService(this, baseUrl)
            try {
                val response = api.sendResetOtp(SendOtpRequest(email))
                val body = response.body()

                if (response.isSuccessful) {
                    RetrofitClient.saveBaseUrl(this, baseUrl)
                    return ActionResult(
                        success = true,
                        message = body?.message,
                        expiresInSeconds = body?.expiresInSeconds
                    )
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

    private suspend fun tryVerifyResetOtpAcrossCandidates(email: String, otp: String): ActionResult {
        var lastMessage: String? = null
        var networkFailure = false

        for (baseUrl in RetrofitClient.getCandidateBaseUrls(this)) {
            val api = RetrofitClient.createApiService(this, baseUrl)
            try {
                val response = api.verifyResetOtp(VerifyOtpRequest(email, otp))
                val body = response.body()

                if (response.isSuccessful && body?.verified == true && !body.resetToken.isNullOrBlank()) {
                    RetrofitClient.saveBaseUrl(this, baseUrl)
                    return ActionResult(
                        success = true,
                        message = body.message,
                        resetToken = body.resetToken
                    )
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
        listOf(
            binding.btnBack,
            binding.btnSendCode,
            binding.btnVerifyCode,
            binding.btnBackToEmail,
            binding.btnResendCode,
            binding.btnGoLogin
        ).forEach { it.isEnabled = !loading }
    }

    private fun showSuccess(message: String) {
        binding.tvSuccess.text = message
        binding.successCard.visible()
        binding.errorCard.gone()
        binding.successCard.postDelayed({ binding.successCard.gone() }, 3000)
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

    private fun clearOtpInputs() {
        otpInputs.forEach { it.setText("") }
    }

    private fun getOtp(): String = otpInputs.joinToString("") { it.text?.toString().orEmpty() }

    private fun showConnectionDialog() {
        val suggestedUrl = RetrofitClient.getDefaultBaseUrl()
        val input = EditText(this).apply {
            setText(RetrofitClient.getBaseUrl(this@ForgotPasswordActivity))
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

    override fun onDestroy() {
        super.onDestroy()
        resendTimer?.cancel()
    }

    private data class ActionResult(
        val success: Boolean,
        val message: String? = null,
        val networkFailure: Boolean = false,
        val expiresInSeconds: Int? = null,
        val resetToken: String? = null
    )
}
