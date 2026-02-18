package com.animalbase.app.ui.missing

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityMissingPetDetailBinding
import com.animalbase.app.ui.report.ReportSightingActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.formatDisplayDate
import com.animalbase.app.utils.showToast
import kotlinx.coroutines.launch

class MissingPetDetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMissingPetDetailBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private var missingPetId: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMissingPetDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        missingPetId = intent.getIntExtra("missing_pet_id", 0)
        if (missingPetId > 0) loadMissingPet()
    }

    private fun loadMissingPet() {
        lifecycleScope.launch {
            try {
                val response = api.getMissingPetById(missingPetId)
                if (response.isSuccessful) {
                    val pet = response.body()?.missingPet ?: return@launch
                    binding.tvMissingPetName.text = pet.petName
                    binding.tvBreed.text = "${pet.breed ?: "Mixed"} · ${pet.petType}"
                    binding.tvDescription.text = pet.description ?: "No description"
                    binding.tvLastSeen.text = "Last Seen: ${pet.locationLastSeen}"
                    binding.tvDateLastSeen.text = "Date: ${pet.dateLastSeen.formatDisplayDate()}"
                    binding.tvContact.text = "Contact: ${pet.contactNumber}"
                    binding.tvContactEmail.text = "Email: ${pet.email}"
                    pet.rewardOffered?.let { binding.tvReward.text = "Reward: ₱$it" }
                    val imageUrl = pet.photoUrls?.firstOrNull() ?: pet.photos?.firstOrNull()
                    ImageLoader.loadPetImage(this@MissingPetDetailActivity, imageUrl, binding.ivMissingPetImage)

                    binding.btnContactOwner.setOnClickListener {
                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${pet.contactNumber}"))
                        startActivity(intent)
                    }
                    binding.btnReportSighting.setOnClickListener {
                        val intent = Intent(this@MissingPetDetailActivity, ReportSightingActivity::class.java)
                        intent.putExtra("missing_pet_id", missingPetId)
                        startActivity(intent)
                    }

                    // View on map
                    if (pet.latitude != null && pet.longitude != null) {
                        binding.btnViewMap.setOnClickListener {
                            val uri = Uri.parse("geo:${pet.latitude},${pet.longitude}?q=${pet.latitude},${pet.longitude}(Last+seen)")
                            startActivity(Intent(Intent.ACTION_VIEW, uri))
                        }
                    }
                }
            } catch (e: Exception) {
                showToast("Error: ${e.message}")
            }
        }
    }
}
