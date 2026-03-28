package com.animalbase.app.ui.adoption

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityPetDetailBinding
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.ui.common.ImagePreviewActivity
import com.animalbase.app.utils.formatWeightForDisplay
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.showToast
import kotlinx.coroutines.launch
import org.json.JSONObject

class PetDetailActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityPetDetailBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private var petId: Int = 0
    private var currentImageUrl: String? = null
    private var currentImageTitle: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPetDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.setDisplayShowTitleEnabled(false)
        binding.toolbar.navigationIcon?.setTint(getColor(android.R.color.white))
        binding.toolbar.setNavigationOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }

        petId = intent.getIntExtra("pet_id", 0)
        if (petId > 0) loadPet()

        binding.ivPetDetailImage.setOnClickListener {
            val imageUrl = currentImageUrl?.takeIf { value -> value.isNotBlank() } ?: return@setOnClickListener
            ImagePreviewActivity.open(
                this,
                imageUrl,
                currentImageTitle ?: binding.tvAboutTitle.text?.toString()
            )
        }

        binding.btnAdoptNow.setOnClickListener {
            if (!session.isLoggedIn()) {
                showToast("Please log in to apply for adoption")
                return@setOnClickListener
            }
            lifecycleScope.launch {
                try {
                    val response = api.getMyApplications()
                    if (response.isSuccessful) {
                        val hasPendingApplication = response.body().orEmpty().any { application ->
                            application.petId == petId && application.status.equals("Pending", ignoreCase = true)
                        }

                        if (hasPendingApplication) {
                            showToast(getString(R.string.error_pending_application_for_pet))
                            return@launch
                        }
                    }
                } catch (_: Exception) {
                    // Fall back to the server-side validation on submit if this pre-check cannot complete.
                }

                val intent = Intent(this@PetDetailActivity, AdoptionFormActivity::class.java)
                intent.putExtra("pet_id", petId)
                startActivity(intent)
            }
        }
    }

    private fun loadPet() {
        lifecycleScope.launch {
            try {
                val response = api.getPetById(petId)
                if (response.isSuccessful) {
                    val pet = response.body() ?: return@launch
                    val ageMonths = pet.ageMonths
                    val petName = pet.petName.ifBlank { "this pet" }
                    val description = pet.description?.takeIf { it.isNotBlank() }
                        ?: "This lovely companion is waiting for a safe, caring home."
                    val breed = pet.breed?.takeIf { it.isNotBlank() } ?: "Mixed Breed"
                    val type = pet.petType.ifBlank { "Unknown" }
                    val gender = pet.gender?.takeIf { it.isNotBlank() } ?: "Unknown"
                    val age = if (ageMonths != null) {
                        "${ageMonths / 12}y ${ageMonths % 12}m"
                    } else {
                        pet.ageCategory?.takeIf { it.isNotBlank() } ?: "Unknown"
                    }
                    val weight = formatWeightForDisplay(pet.weight, "Not specified")
                    val color = pet.colorAppearance?.takeIf { it.isNotBlank() } ?: "Not specified"
                    val features = pet.distinctiveFeatures?.takeIf { it.isNotBlank() }
                    val shelterName = pet.shelterName?.takeIf { it.isNotBlank() } ?: "AnimalBase Shelter House"
                    val displayPetName = petName.replaceFirstChar { it.uppercase() }

                    binding.tvAboutTitle.text = "About $displayPetName"
                    binding.tvPetDetailBreed.text = listOf(breed, type)
                        .filter { it.isNotBlank() }
                        .joinToString(" - ")
                    binding.tvPetDetailDescription.text = description

                    binding.tvInfoPetName.text = pet.petName.ifBlank { "Unknown" }
                    binding.tvInfoPetType.text = type
                    binding.tvInfoBreed.text = breed
                    binding.tvInfoGender.text = gender
                    binding.tvInfoAge.text = age
                    binding.tvInfoWeight.text = weight
                    binding.tvInfoColor.text = color

                    binding.tvShelterName.text = shelterName
                    bindShelterRow(binding.rowShelterAddress, binding.tvShelterAddress, pet.shelterAddress)
                    bindShelterRow(binding.rowShelterEmail, binding.tvShelterEmail, pet.shelterEmail)
                    bindShelterRow(binding.rowShelterPhone, binding.tvShelterPhone, pet.shelterPhone)

                    if (features.isNullOrBlank()) {
                        binding.tvFeaturesHeader.visibility = View.GONE
                        binding.tvPetFeatures.visibility = View.GONE
                    } else {
                        binding.tvFeaturesHeader.visibility = View.VISIBLE
                        binding.tvPetFeatures.visibility = View.VISIBLE
                        binding.tvPetFeatures.text = features
                    }

                    binding.tvPetDetailStatus.text = pet.status

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
                    binding.tvPetDetailStatus.backgroundTintList =
                        ColorStateList.valueOf(statusBackgroundColor)
                    binding.tvPetDetailStatus.setTextColor(statusTextColor)

                    val imageUrl = pet.photoUrls.firstOrNull() ?: pet.photos.firstOrNull()
                    currentImageUrl = imageUrl
                    currentImageTitle = displayPetName
                    binding.ivPetDetailImage.isClickable = !imageUrl.isNullOrBlank()
                    binding.ivPetDetailImage.isFocusable = !imageUrl.isNullOrBlank()
                    binding.ivPetDetailImage.contentDescription = if (imageUrl.isNullOrBlank()) {
                        null
                    } else {
                        "$displayPetName photo"
                    }
                    ImageLoader.loadPetDetailImage(this@PetDetailActivity, imageUrl, binding.ivPetDetailImage)

                    binding.btnAdoptNow.text = "Adopt ${pet.petName.ifBlank { "Now" }}"
                    binding.btnAdoptNow.isEnabled = true
                    binding.btnAdoptNow.alpha = 1f

                    if (pet.status != "Available") {
                        binding.btnAdoptNow.isEnabled = false
                        binding.btnAdoptNow.alpha = 0.65f
                        binding.btnAdoptNow.text = "Currently Unavailable"
                    }
                }
            } catch (e: Exception) {
                showToast(parseApiErrorMessage(e.message))
            }
        }
    }

    private fun bindShelterRow(container: View, textView: TextView, value: String?) {
        val content = value?.takeIf { it.isNotBlank() }
        container.visibility = if (content == null) View.GONE else View.VISIBLE
        if (content != null) {
            textView.text = content
        }
    }

    private fun parseApiErrorMessage(rawMessage: String?): String {
        if (rawMessage.isNullOrBlank()) {
            return getString(R.string.error_generic)
        }

        return runCatching {
            JSONObject(rawMessage).optString("error").ifBlank { rawMessage }
        }.getOrDefault(rawMessage)
    }
}
