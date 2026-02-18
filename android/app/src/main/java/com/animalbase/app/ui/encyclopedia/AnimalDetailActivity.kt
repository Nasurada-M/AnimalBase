package com.animalbase.app.ui.encyclopedia

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityAnimalDetailBinding
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.SessionManager
import com.animalbase.app.utils.showToast
import kotlinx.coroutines.launch

class AnimalDetailActivity : AppCompatActivity() {
    private lateinit var binding: ActivityAnimalDetailBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val session by lazy { SessionManager(this) }
    private var animalId: Int = 0
    private var isFavorite = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAnimalDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        animalId = intent.getIntExtra("animal_id", 0)
        if (animalId > 0) loadAnimal()

        binding.fabFavorite.setOnClickListener { toggleFavorite() }
    }

    private fun loadAnimal() {
        lifecycleScope.launch {
            try {
                val response = api.getAnimalById(animalId)
                if (response.isSuccessful) {
                    val animal = response.body()?.animal ?: return@launch
                    supportActionBar?.title = animal.commonName
                    binding.tvCommonName.text = animal.commonName
                    binding.tvScientificName.text = animal.scientificName ?: ""
                    binding.tvCategory.text = "Category: ${animal.category ?: "N/A"}"
                    binding.tvHabitat.text = "Habitat: ${animal.habitat ?: "N/A"}"
                    binding.tvConservationStatus.text = "Conservation: ${animal.conservationStatus ?: "Unknown"}"
                    binding.tvDiet.text = "Diet: ${animal.diet ?: "N/A"}"
                    binding.tvLifespan.text = "Lifespan: ${animal.lifespan ?: "N/A"}"
                    binding.tvSizeWeight.text = "Size/Weight: ${animal.sizeWeight ?: "N/A"}"
                    binding.tvDescription.text = animal.description ?: "No description"
                    binding.tvFacts.text = animal.interestingFacts ?: ""
                    val imageUrl = animal.photos?.firstOrNull()
                    ImageLoader.loadAnimalImage(this@AnimalDetailActivity, imageUrl, binding.ivAnimalImage)
                }
            } catch (e: Exception) {
                showToast("Error: ${e.message}")
            }
        }
    }

    private fun toggleFavorite() {
        if (!session.isLoggedIn()) { showToast("Login to save favorites"); return }
        lifecycleScope.launch {
            try {
                if (isFavorite) {
                    api.removeFromFavorites(animalId)
                    isFavorite = false
                    showToast("Removed from favorites")
                } else {
                    api.addToFavorites(animalId)
                    isFavorite = true
                    showToast("Added to favorites")
                }
                binding.fabFavorite.setImageResource(
                    if (isFavorite) android.R.drawable.star_on else android.R.drawable.star_off
                )
            } catch (e: Exception) { showToast("Error: ${e.message}") }
        }
    }
}
