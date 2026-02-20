package com.animalbase.app.ui.auth

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityRegisterBinding
import com.animalbase.app.models.RegisterRequest
import com.animalbase.app.ui.home.MainActivity
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

/** RegisterActivity — no Firebase; validation mirrors backend express-validator rules. */
class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private val api     by lazy { RetrofitClient.getApiService(this) }
    private val session by lazy { SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)
        binding.btnRegister.setOnClickListener { attemptRegister() }
        binding.btnGoLogin.setOnClickListener  { finish() }
    }

    private fun attemptRegister() {
        val fullName        = binding.etFullName.text.toString().trim()
        val email           = binding.etEmail.text.toString().trim()
        val phone           = binding.etPhone.text.toString().trim()
        val password        = binding.etPassword.text.toString()
        val confirmPassword = binding.etConfirmPassword.text.toString()

        // Clear previous errors
        listOf(binding.tilFullName, binding.tilEmail, binding.tilPhone,
               binding.tilPassword, binding.tilConfirmPassword)
            .forEach { it.error = null }

        // Client-side format validation (mirrors backend rules in auth.js)
        if (!ValidationUtils.isValidName(fullName)) {
            binding.tilFullName.error = "Full name required (min. 2 characters)"; return
        }
        if (!ValidationUtils.isValidEmail(email)) {
            binding.tilEmail.error = "Valid email is required"; return
        }
        if (phone.isNotEmpty() && !ValidationUtils.isValidPhoneNumber(phone)) {
            binding.tilPhone.error = "Valid phone number required"; return
        }
        val (pwOk, pwErr) = ValidationUtils.isValidPassword(password)
        if (!pwOk) { binding.tilPassword.error = pwErr; return }
        if (password != confirmPassword) {
            binding.tilConfirmPassword.error = "Passwords do not match"; return
        }

        binding.progressBar.visible()
        binding.btnRegister.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = api.register(
                    RegisterRequest(fullName, email, password, phone.ifEmpty { null })
                )
                binding.progressBar.gone()
                binding.btnRegister.isEnabled = true

                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    session.saveToken(body.token!!)
                    body.user?.let { session.saveUser(it) }
                    startActivity(Intent(this@RegisterActivity, MainActivity::class.java))
                    finishAffinity()
                } else {
                    showToast(response.body()?.message ?: "Registration failed")
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.btnRegister.isEnabled = true
                showToast("Network error: ${e.message}")
            }
        }
    }
}
