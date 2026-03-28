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
import android.widget.ArrayAdapter
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityRegisterBinding
import com.animalbase.app.models.RegisterRequest
import com.animalbase.app.models.SendOtpRequest
import com.animalbase.app.models.User
import com.animalbase.app.models.VerifyOtpRequest
import com.animalbase.app.ui.home.MainActivity
import com.animalbase.app.utils.PhoneRegionOption
import com.animalbase.app.utils.RegionalPhoneUtils
import com.animalbase.app.utils.SessionManager
import com.animalbase.app.utils.ValidationUtils
import com.animalbase.app.utils.bindPangasinanLocationAutocomplete
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.isPangasinanLocation
import com.animalbase.app.utils.pangasinanLocationValidationMessage
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.Response
import java.io.IOException

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private val session by lazy { SessionManager(this) }
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val otpInputs by lazy {
        listOf(binding.etOtp1, binding.etOtp2, binding.etOtp3, binding.etOtp4, binding.etOtp5, binding.etOtp6)
    }

    private var verifiedEmail = false
    private var resendTimer: CountDownTimer? = null
    private var selectedPhoneRegion: PhoneRegionOption = RegionalPhoneUtils.defaultRegion()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupOtpInputs()
        setupPasswordStrength()
        setupPhoneRegionDropdown()
        bindPangasinanLocationAutocomplete(binding.etAddress, binding.tilAddress, lifecycleScope, api)
        setupClicks()
        goToStep(1)
    }

    private fun setupClicks() {
        binding.btnBack.setOnClickListener { finish() }
        binding.btnGoLogin.setOnClickListener { finish() }
        binding.btnDismissError.setOnClickListener { hideError() }

        binding.btnSendCode.setOnClickListener { sendOtp() }
        binding.btnBackFromCode.setOnClickListener {
            verifiedEmail = false
            goToStep(1)
        }
        binding.btnResendCode.setOnClickListener { sendOtp(resend = true) }
        binding.btnContinueVerify.setOnClickListener { verifyOtp() }
        binding.btnRegister.setOnClickListener { attemptRegister() }
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
                if (keyCode == KeyEvent.KEYCODE_DEL &&
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

    private fun setupPasswordStrength() {
        binding.etPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                updatePasswordStrength(s?.toString().orEmpty())
            }
        })
    }

    private fun setupPhoneRegionDropdown() {
        binding.acPhoneRegion.setAdapter(
            ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, RegionalPhoneUtils.regions)
        )
        binding.acPhoneRegion.setText(selectedPhoneRegion.toString(), false)
        RegionalPhoneUtils.bindLocalPhoneInput(binding.etPhone) { selectedPhoneRegion }
        applyPhoneRegion(selectedPhoneRegion, clearNumber = false)
        binding.acPhoneRegion.setOnItemClickListener { parent, _, position, _ ->
            val region = parent.getItemAtPosition(position) as? PhoneRegionOption ?: return@setOnItemClickListener
            applyPhoneRegion(region)
        }
    }

    private fun applyPhoneRegion(region: PhoneRegionOption, clearNumber: Boolean = false) {
        selectedPhoneRegion = region
        binding.etPhone.hint = region.placeholder
        binding.tilPhone.helperText =
            "Local number only • up to ${region.maxLocalDigits} digits"

        val current = binding.etPhone.text?.toString().orEmpty()
        binding.tilPhone.helperText =
            "Local number only - up to ${region.maxLocalDigits} digits"
        val sanitized = RegionalPhoneUtils.sanitizeLocalNumber(current, region)
        if (clearNumber) {
            binding.etPhone.setText("")
        } else if (sanitized != current) {
            binding.etPhone.setText(sanitized)
            binding.etPhone.setSelection(sanitized.length)
        }
    }

    private fun updatePasswordStrength(password: String) {
        var score = 0
        if (password.length >= 8) score++
        if (password.any { it.isUpperCase() }) score++
        if (password.any { it.isDigit() }) score++
        if (password.any { !it.isLetterOrDigit() }) score++

        val (progress, label, color) = when {
            password.isEmpty() -> Triple(0, "-", "#9CA3AF")
            score <= 1 -> Triple(25, "Weak", "#EF4444")
            score == 2 -> Triple(50, "Fair", "#F59E0B")
            score == 3 -> Triple(75, "Good", "#10B981")
            else -> Triple(100, "Strong", "#059669")
        }

        binding.passwordStrengthIndicator.progress = progress
        binding.passwordStrengthIndicator.setIndicatorColor(Color.parseColor(color))
        binding.tvPasswordStrength.text = "Strength: $label"
        binding.tvPasswordStrength.setTextColor(Color.parseColor(color))
    }

    private fun sendOtp(resend: Boolean = false) {
        val email = binding.etEmail.text.toString().trim().lowercase()
        clearFieldErrors()
        clearMessages()

        if (!ValidationUtils.hasApprovedEmailEnding(email)) {
            binding.tilEmail.error =
                "Use a valid email address with an approved ending like .com, .edu, or .ph."
            return
        }

        setLoading(true)
        lifecycleScope.launch {
            val result = trySendOtpAcrossCandidates(email)
            setLoading(false)

            when {
                result.success -> {
                    verifiedEmail = false
                    binding.tvStep2Subtitle.text = "A 6-digit code was sent to $email. Enter it below. It expires in 1 minute."
                    clearOtpInputs()
                    showSuccess(
                        if (resend) "New code sent to your email."
                        else result.message ?: "Verification code sent! Check your email inbox."
                    )
                    startResendTimer(result.expiresInSeconds ?: 60)
                    goToStep(2)
                    otpInputs.first().requestFocus()
                }
                result.networkFailure -> {
                    showToast("Connection failed. Check the backend URL.")
                    showConnectionDialog()
                }
                else -> showError(result.message ?: "Failed to send verification code.")
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
            val result = tryVerifyOtpAcrossCandidates(email, otp)
            setLoading(false)

            when {
                result.success -> {
                    verifiedEmail = true
                    binding.etEmailLocked.setText(email)
                    showSuccess(result.message ?: "Email verified successfully!")
                    resendTimer?.cancel()
                    binding.btnResendCode.isEnabled = true
                    binding.btnResendCode.text = "Resend code"
                    binding.tvOtpExpiry.text = "Email verified successfully."
                    goToStep(3)
                }
                result.networkFailure -> {
                    showToast("Connection failed. Check the backend URL.")
                    showConnectionDialog()
                }
                else -> {
                    if (result.message?.contains("Server error", ignoreCase = true) == true) {
                        showError(result.message)
                    } else {
                        clearOtpInputs()
                        otpInputs.first().requestFocus()
                        showError("Incorrect/Invalid Code. Please Try again.")
                    }
                }
            }
        }
    }

    private fun attemptRegister() {
        val fullName = binding.etFullName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim().lowercase()
        val localPhoneNumber = RegionalPhoneUtils.sanitizeLocalNumber(
            binding.etPhone.text.toString(),
            selectedPhoneRegion
        )
        val address = binding.etAddress.text.toString().trim()
        val password = binding.etPassword.text.toString()
        val confirmPassword = binding.etConfirmPassword.text.toString()

        clearFieldErrors()
        clearMessages()

        if (!verifiedEmail) {
            showError("Please verify your email before creating an account.")
            return
        }
        if (!ValidationUtils.isValidName(fullName)) {
            binding.tilFullName.error = "Full name must be at least 2 characters."
            return
        }
        if (!RegionalPhoneUtils.isValidLocalNumber(localPhoneNumber, selectedPhoneRegion)) {
            binding.tilPhone.error = RegionalPhoneUtils.validationMessage(selectedPhoneRegion)
            return
        }
        if (address.isBlank()) {
            binding.tilAddress.error = "Address is required."
            return
        }
        if (!isPangasinanLocation(address)) {
            binding.tilAddress.error = pangasinanLocationValidationMessage("Address")
            return
        }
        if (password.length < 6) {
            binding.tilPassword.error = "Password must be at least 6 characters."
            return
        }
        if (password != confirmPassword) {
            binding.tilConfirmPassword.error = "Passwords do not match."
            return
        }

        val phone = RegionalPhoneUtils.formatInternationalNumber(localPhoneNumber, selectedPhoneRegion)

        setLoading(true)
        lifecycleScope.launch {
            val result = tryRegisterAcrossCandidates(fullName, email, password, phone, address)
            setLoading(false)

            when {
                result.success && result.token != null -> {
                    session.saveToken(result.token)
                    result.user?.let { session.saveUser(it) }
                    startActivity(Intent(this@RegisterActivity, MainActivity::class.java))
                    finishAffinity()
                }
                result.networkFailure -> {
                    showToast("Connection failed. Check the backend URL.")
                    showConnectionDialog()
                }
                else -> showError(result.message ?: "Registration failed.")
            }
        }
    }

    private fun goToStep(step: Int) {
        binding.step1Container.visibility = if (step == 1) View.VISIBLE else View.GONE
        binding.step2Container.visibility = if (step == 2) View.VISIBLE else View.GONE
        binding.step3Container.visibility = if (step == 3) View.VISIBLE else View.GONE
        updateStepUI(step)
    }

    private fun updateStepUI(activeStep: Int) {
        val circles = listOf(binding.stepCircle1, binding.stepCircle2, binding.stepCircle3)
        val icons = listOf(binding.stepIcon1, binding.stepIcon2, binding.stepIcon3)
        val labels = listOf(binding.stepLabel1, binding.stepLabel2, binding.stepLabel3)
        val lines = listOf(binding.stepLine1, binding.stepLine2)
        val iconRes = listOf(R.drawable.ic_email, R.drawable.ic_key, R.drawable.ic_person)

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
                if (index + 2 <= activeStep) R.drawable.bg_step_line_active else R.drawable.bg_step_line_inactive
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

    private suspend fun trySendOtpAcrossCandidates(email: String): ActionResult {
        var lastMessage: String? = null
        var networkFailure = false

        for (baseUrl in RetrofitClient.getCandidateBaseUrls(this)) {
            val api = RetrofitClient.createApiService(this, baseUrl)
            try {
                val response = api.sendOtp(SendOtpRequest(email))
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
                if (response.code() in listOf(400, 409, 500)) {
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

    private suspend fun tryVerifyOtpAcrossCandidates(email: String, otp: String): ActionResult {
        var lastMessage: String? = null
        var networkFailure = false

        for (baseUrl in RetrofitClient.getCandidateBaseUrls(this)) {
            val api = RetrofitClient.createApiService(this, baseUrl)
            try {
                val response = api.verifyOtp(VerifyOtpRequest(email, otp))
                val body = response.body()

                if (response.isSuccessful && body?.verified == true) {
                    RetrofitClient.saveBaseUrl(this, baseUrl)
                    return ActionResult(success = true, message = body.message)
                }

                val parsed = parseError(response)
                if (response.code() in listOf(400, 409, 500)) {
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

    private suspend fun tryRegisterAcrossCandidates(
        fullName: String,
        email: String,
        password: String,
        phone: String,
        address: String
    ): RegisterAttemptResult {
        var lastMessage: String? = null
        var networkFailure = false

        for (baseUrl in RetrofitClient.getCandidateBaseUrls(this)) {
            val api = RetrofitClient.createApiService(this, baseUrl)
            try {
                val response = api.register(
                    RegisterRequest(
                        fullName = fullName,
                        email = email,
                        password = password,
                        phone = phone,
                        address = address
                    )
                )

                val body = response.body()
                if (response.isSuccessful && body?.token != null) {
                    RetrofitClient.saveBaseUrl(this, baseUrl)
                    return RegisterAttemptResult(success = true, token = body.token, user = body.user)
                }

                val message = parseError(response)
                if (response.code() in listOf(400, 401, 409, 500)) {
                    return RegisterAttemptResult(success = false, message = message)
                }
                lastMessage = message
            } catch (_: IOException) {
                networkFailure = true
            } catch (e: Exception) {
                lastMessage = e.message
            }
        }

        return RegisterAttemptResult(success = false, message = lastMessage, networkFailure = networkFailure)
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
            binding.btnContinueVerify,
            binding.btnRegister,
            binding.btnBackFromCode,
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

    private fun clearFieldErrors() {
        listOf(
            binding.tilEmail,
            binding.tilFullName,
            binding.tilPhone,
            binding.tilAddress,
            binding.tilPassword,
            binding.tilConfirmPassword
        ).forEach { it.error = null }
    }

    private fun clearOtpInputs() {
        otpInputs.forEach { it.setText("") }
    }

    private fun getOtp(): String = otpInputs.joinToString("") { it.text?.toString().orEmpty() }

    private fun showConnectionDialog() {
        val suggestedUrl = RetrofitClient.getDefaultBaseUrl()
        val input = EditText(this).apply {
            setText(RetrofitClient.getBaseUrl(this@RegisterActivity))
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
        val expiresInSeconds: Int? = null
    )

    private data class RegisterAttemptResult(
        val success: Boolean,
        val token: String? = null,
        val user: User? = null,
        val message: String? = null,
        val networkFailure: Boolean = false
    )
}
