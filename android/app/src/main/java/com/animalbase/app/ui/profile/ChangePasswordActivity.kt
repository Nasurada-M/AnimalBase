package com.animalbase.app.ui.profile

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityChangePasswordBinding
import com.animalbase.app.models.ChangePasswordRequest
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class ChangePasswordActivity : AppCompatActivity() {
    private lateinit var binding: ActivityChangePasswordBinding
    private val api by lazy { RetrofitClient.getApiService(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChangePasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        binding.btnChangePassword.setOnClickListener { changePassword() }
    }

    private fun changePassword() {
        val current = binding.etCurrentPassword.text.toString()
        val newPw = binding.etNewPassword.text.toString()
        val confirm = binding.etConfirmPassword.text.toString()

        if (current.isEmpty()) { binding.tilCurrentPassword.error = "Current password required"; return }
        val (valid, error) = ValidationUtils.isValidPassword(newPw)
        if (!valid) { binding.tilNewPassword.error = error; return }
        if (newPw != confirm) { binding.tilConfirmPassword.error = "Passwords do not match"; return }

        binding.progressBar.visible()
        binding.btnChangePassword.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = api.changePassword(ChangePasswordRequest(current, newPw))
                binding.progressBar.gone()
                binding.btnChangePassword.isEnabled = true
                if (response.isSuccessful && response.body()?.success == true) {
                    showToast("Password changed successfully!")
                    finish()
                } else {
                    showToast(response.body()?.message ?: "Failed to change password")
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.btnChangePassword.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }
}
