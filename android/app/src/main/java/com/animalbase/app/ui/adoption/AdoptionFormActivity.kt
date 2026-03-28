package com.animalbase.app.ui.adoption

import android.content.res.ColorStateList
import android.os.Bundle
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityAdoptionFormBinding
import com.animalbase.app.models.AdoptionApplicationRequest
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.RegionalPhoneUtils
import com.animalbase.app.utils.ValidationUtils
import com.animalbase.app.utils.bindPangasinanLocationAutocomplete
import com.animalbase.app.utils.isPangasinanLocation
import com.animalbase.app.utils.pangasinanLocationValidationMessage
import com.animalbase.app.utils.petTextInputFilter
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.tintRequiredAsterisks
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import org.json.JSONObject

class AdoptionFormActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityAdoptionFormBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private var petId: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdoptionFormBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.setDisplayShowTitleEnabled(true)
        binding.toolbar.navigationIcon?.setTint(getColor(android.R.color.white))
        binding.toolbar.setNavigationOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }
        binding.root.tintRequiredAsterisks()

        petId = intent.getIntExtra("pet_id", 0)
        RegionalPhoneUtils.bindLocalPhoneInput(binding.etPhone)
        binding.etAddress.filters = arrayOf(petTextInputFilter(multiline = true, allowComma = true))
        bindPangasinanLocationAutocomplete(binding.etAddress, binding.tilAddress, lifecycleScope, api)

        val user = session.getUser()
        user?.let {
            binding.etFullName.setText(it.fullName)
            binding.etEmail.setText(it.email)
            binding.etPhone.setText(RegionalPhoneUtils.sanitizeLocalNumber(it.phone.orEmpty()))
            binding.etAddress.setText(
                buildString {
                    it.address?.forEach { character ->
                        if (character.isLetterOrDigit() || character == ' ' || character == '.' || character == '-' || character == ',' || character == '\n' || character == '\r') {
                            append(character)
                        }
                    }
                }
            )
        }

        if (petId > 0) {
            loadPetPreview()
        }

        binding.btnSubmitApplication.setOnClickListener { submitApplication() }
    }

    private fun loadPetPreview() {
        lifecycleScope.launch {
            try {
                val response = api.getPetById(petId)
                if (!response.isSuccessful) return@launch

                val pet = response.body() ?: return@launch
                val breed = pet.breed?.takeIf { it.isNotBlank() } ?: "Mixed Breed"
                val type = pet.petType.ifBlank { "Pet" }
                val imageUrl = pet.photoUrls.firstOrNull() ?: pet.photos.firstOrNull()

                binding.tvPetPreviewName.text = pet.petName.ifBlank { "Selected Pet" }
                binding.tvPetPreviewMeta.text = listOf(breed, type)
                    .filter { it.isNotBlank() }
                    .joinToString(" - ")
                binding.tvPetPreviewStatus.text = pet.status

                val statusTextColor = when (pet.status) {
                    "Available" -> getColor(R.color.status_available)
                    "Pending" -> getColor(R.color.status_pending)
                    "Adopted" -> getColor(R.color.status_adopted)
                    else -> getColor(R.color.text_secondary)
                }
                val statusBackgroundColor = when (pet.status) {
                    "Available" -> getColor(R.color.status_available_soft)
                    "Pending" -> getColor(R.color.status_pending_soft)
                    "Adopted" -> getColor(R.color.status_adopted_soft)
                    else -> getColor(R.color.status_neutral_soft)
                }

                binding.tvPetPreviewStatus.backgroundTintList =
                    ColorStateList.valueOf(statusBackgroundColor)
                binding.tvPetPreviewStatus.setTextColor(statusTextColor)

                ImageLoader.loadPetImage(this@AdoptionFormActivity, imageUrl, binding.ivPetPreview)
            } catch (_: Exception) {
                // Keep the static preview card content if the pet lookup fails.
            }
        }
    }

    private fun submitApplication() {
        val fullName = binding.etFullName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val phone = RegionalPhoneUtils.sanitizeLocalNumber(binding.etPhone.text.toString())
        val address = binding.etAddress.text.toString().trim()
        val whyAdopt = binding.etWhyAdopt.text.toString().trim()
        val whyChosen = binding.etWhyChosen.text.toString().trim()
        val experience = binding.etExperience.text.toString().trim()
        binding.tilAddress.error = null

        val (valid, error) = ValidationUtils.isValidAdoptionForm(fullName, email, phone, address, whyAdopt)
        if (!valid) {
            showToast(error)
            return
        }
        if (!isPangasinanLocation(address)) {
            binding.tilAddress.error = pangasinanLocationValidationMessage("Home address")
            return
        }
        binding.tilAddress.error = null

        binding.progressBar.visible()
        binding.btnSubmitApplication.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = api.submitAdoptionApplication(
                    AdoptionApplicationRequest(
                        petId = petId,
                        fullName = fullName,
                        email = email,
                        phone = phone,
                        homeAddress = address,
                        previousPetExperience = experience.ifEmpty { null },
                        whyAdopt = whyAdopt,
                        whyChooseYou = whyChosen.ifEmpty { null }
                    )
                )
                binding.progressBar.gone()
                binding.btnSubmitApplication.isEnabled = true
                if (response.isSuccessful) {
                    showToast("Application submitted successfully!")
                    finish()
                } else {
                    val message = response.errorBody()?.string()?.let {
                        runCatching { JSONObject(it).optString("error") }.getOrNull()
                    }
                    showToast(message ?: "Submission failed")
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.btnSubmitApplication.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }
}
