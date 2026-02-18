package com.animalbase.app.ui.auth

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityLoginBinding
import com.animalbase.app.models.LoginRequest
import com.animalbase.app.ui.home.MainActivity
import com.animalbase.app.utils.*
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val session by lazy { SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

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

        // Format validation
        if (!ValidationUtils.isValidEmail(email)) {
            binding.tilEmail.error = "Valid email is required"
            return
        }
        if (password.isEmpty()) {
            binding.tilPassword.error = "Password is required"
            return
        }
        binding.tilEmail.error = null
        binding.tilPassword.error = null

        binding.progressBar.visible()
        binding.btnLogin.isEnabled = false

        FirebaseMessaging.getInstance().token.addOnSuccessListener { fcmToken ->
            lifecycleScope.launch {
                try {
                    val response = api.login(LoginRequest(email, password, fcmToken))
                    binding.progressBar.gone()
                    binding.btnLogin.isEnabled = true
                    if (response.isSuccessful && response.body()?.success == true) {
                        val body = response.body()!!
                        session.saveToken(body.token!!)
                        body.user?.let { session.saveUser(it) }
                        startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                        finish()
                    } else {
                        showToast(response.body()?.message ?: "Login failed")
                    }
                } catch (e: Exception) {
                    binding.progressBar.gone()
                    binding.btnLogin.isEnabled = true
                    showToast("Network error: ${e.message}")
                }
            }
        }.addOnFailureListener {
            lifecycleScope.launch {
                try {
                    val response = api.login(LoginRequest(email, password))
                    binding.progressBar.gone()
                    binding.btnLogin.isEnabled = true
                    if (response.isSuccessful && response.body()?.success == true) {
                        val body = response.body()!!
                        session.saveToken(body.token!!)
                        body.user?.let { session.saveUser(it) }
                        startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                        finish()
                    } else {
                        showToast(response.body()?.message ?: "Login failed")
                    }
                } catch (e: Exception) {
                    binding.progressBar.gone()
                    binding.btnLogin.isEnabled = true
                    showToast("Network error: ${e.message}")
                }
            }
        }
    }

    private fun sendForgotPassword(email: String) {
        lifecycleScope.launch {
            try {
                api.forgotPassword(com.animalbase.app.models.ForgotPasswordRequest(email))
                showToast("If registered, reset instructions sent to $email")
            } catch (e: Exception) {
                showToast("Error: ${e.message}")
            }
        }
    }
}
