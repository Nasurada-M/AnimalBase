package com.animalbase.app.ui.profile

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityEditProfileBinding
import com.animalbase.app.models.UpdateProfileRequest
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class EditProfileActivity : AppCompatActivity() {
    private lateinit var binding: ActivityEditProfileBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val session by lazy { SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEditProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }

        val user = session.getUser()
        user?.let {
            binding.etFullName.setText(it.fullName)
            binding.etPhone.setText(it.phoneNumber)
            binding.etAltPhone.setText(it.alternatePhone)
            binding.etAddress.setText(it.address)
        }

        binding.btnSave.setOnClickListener { saveProfile() }
    }

    private fun saveProfile() {
        val fullName = binding.etFullName.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()
        val altPhone = binding.etAltPhone.text.toString().trim()
        val address = binding.etAddress.text.toString().trim()

        if (!ValidationUtils.isValidName(fullName)) {
            binding.tilFullName.error = "Name is required"; return
        }
        if (phone.isNotEmpty() && !ValidationUtils.isValidPhoneNumber(phone)) {
            binding.tilPhone.error = "Valid phone number required"; return
        }

        binding.progressBar.visible()
        binding.btnSave.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = api.updateProfile(UpdateProfileRequest(
                    full_name = fullName,
                    phone_number = phone.ifEmpty { null },
                    alternate_phone = altPhone.ifEmpty { null },
                    address = address.ifEmpty { null }
                ))
                binding.progressBar.gone()
                binding.btnSave.isEnabled = true
                if (response.isSuccessful && response.body()?.success == true) {
                    response.body()?.user?.let { session.saveUser(it) }
                    showToast("Profile updated!")
                    finish()
                } else {
                    showToast("Update failed")
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.btnSave.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }
}
