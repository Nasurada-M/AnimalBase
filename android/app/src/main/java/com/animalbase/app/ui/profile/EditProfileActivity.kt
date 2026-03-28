package com.animalbase.app.ui.profile

import android.os.Bundle
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityEditProfileBinding
import com.animalbase.app.models.UpdateProfileRequest
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class EditProfileActivity : SessionAwareActivity() {
    private lateinit var binding: ActivityEditProfileBinding
    private val api by lazy { RetrofitClient.getApiService(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEditProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }
        RegionalPhoneUtils.bindLocalPhoneInput(binding.etPhone)
        binding.etAddress.filters = arrayOf(petTextInputFilter(multiline = true, allowComma = true))
        bindPangasinanLocationAutocomplete(binding.etAddress, binding.tilAddress, lifecycleScope, api)

        val user = session.getUser()
        user?.let {
            binding.etFullName.setText(it.fullName)
            binding.etEmail.setText(it.email)
            binding.etPhone.setText(RegionalPhoneUtils.sanitizeLocalNumber(it.phone.orEmpty()))
            binding.etAddress.setText(it.address.orEmpty())
            binding.tvProfilePreviewName.text = it.fullName.ifBlank { "AnimalBase User" }
            binding.tvProfilePreviewEmail.text = it.email.ifBlank { "No email available" }
            ImageLoader.loadProfileImage(this, it.profilePhotoUrl, binding.ivProfilePreview)
        }

        binding.btnSave.setOnClickListener { saveProfile() }
    }

    private fun saveProfile() {
        val fullName = binding.etFullName.text.toString().trim()
        val phone = RegionalPhoneUtils.sanitizeLocalNumber(binding.etPhone.text.toString())
        val address = binding.etAddress.text.toString().trim()

        binding.tilFullName.error = null
        binding.tilPhone.error = null
        binding.tilAddress.error = null

        if (!ValidationUtils.isValidName(fullName)) {
            binding.tilFullName.error = "Name is required"; return
        }
        if (phone.isNotEmpty() && !RegionalPhoneUtils.isValidLocalNumber(phone)) {
            binding.tilPhone.error = RegionalPhoneUtils.validationMessage(); return
        }
        if (address.isNotEmpty() && !isPangasinanLocation(address)) {
            binding.tilAddress.error = pangasinanLocationValidationMessage("Address")
            return
        }

        binding.progressBar.visible()
        binding.btnSave.isEnabled = false
        lifecycleScope.launch {
            try {
                val response = api.updateProfile(UpdateProfileRequest(
                    fullName = fullName,
                    phone = phone.ifEmpty { null },
                    address = address.ifEmpty { null }
                ))
                binding.progressBar.gone()
                binding.btnSave.isEnabled = true
                if (response.isSuccessful) {
                    response.body()?.let { session.saveUser(it) }
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
