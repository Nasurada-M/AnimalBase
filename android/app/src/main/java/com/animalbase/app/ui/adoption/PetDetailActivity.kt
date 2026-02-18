package com.animalbase.app.ui.adoption

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityPetDetailBinding
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.SessionManager
import com.animalbase.app.utils.showToast
import kotlinx.coroutines.launch

class PetDetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPetDetailBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val session by lazy { SessionManager(this) }
    private var petId: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPetDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }

        petId = intent.getIntExtra("pet_id", 0)
        if (petId > 0) loadPet()

        binding.btnAdoptNow.setOnClickListener {
            if (!session.isLoggedIn()) {
                showToast("Please log in to apply for adoption")
                return@setOnClickListener
            }
            val intent = Intent(this, AdoptionFormActivity::class.java)
            intent.putExtra("pet_id", petId)
            startActivity(intent)
        }
    }

    private fun loadPet() {
        lifecycleScope.launch {
            try {
                val response = api.getPetById(petId)
                if (response.isSuccessful) {
                    val pet = response.body()?.pet ?: return@launch
                    binding.tvPetDetailName.text = pet.petName
                    binding.tvPetDetailBreed.text = "${pet.breed ?: "Mixed"} · ${pet.petType}"
                    binding.tvPetDetailDescription.text = pet.description ?: "No description available"
                    binding.tvPetColor.text = "Color: ${pet.colorAppearance ?: "N/A"}"
                    binding.tvPetFeatures.text = "Features: ${pet.distinctiveFeatures ?: "N/A"}"
                    binding.chipGender.text = pet.gender ?: "Unknown"
                    binding.chipAge.text = if (pet.ageMonths != null) "${pet.ageMonths / 12}y ${pet.ageMonths % 12}m" else pet.ageCategory ?: "Unknown"
                    binding.chipWeight.text = pet.weight ?: "Unknown"
                    binding.tvShelterName.text = pet.shelterName ?: "N/A"
                    binding.tvShelterAddress.text = pet.shelterAddress ?: ""
                    binding.tvShelterPhone.text = pet.shelterPhone ?: ""
                    binding.tvPetDetailStatus.text = pet.status

                    val statusColor = when (pet.status) {
                        "Available" -> getColor(R.color.status_available)
                        "Pending" -> getColor(R.color.status_pending)
                        "Adopted" -> getColor(R.color.status_adopted)
                        else -> getColor(R.color.text_secondary)
                    }
                    binding.tvPetDetailStatus.backgroundTintList =
                        android.content.res.ColorStateList.valueOf(statusColor)

                    val imageUrl = pet.photoUrls?.firstOrNull() ?: pet.photos?.firstOrNull()
                    ImageLoader.loadPetImage(this@PetDetailActivity, imageUrl, binding.ivPetDetailImage)

                    // Disable adopt button if not available
                    if (pet.status != "Available") {
                        binding.btnAdoptNow.isEnabled = false
                        binding.btnAdoptNow.text = "Not Available"
                    }
                }
            } catch (e: Exception) {
                showToast("Error: ${e.message}")
            }
        }
    }
}
