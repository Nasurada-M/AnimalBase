package com.animalbase.app.ui.profile

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityMyReportsBinding
import com.animalbase.app.ui.missing.MissingPetAdapter
import com.animalbase.app.ui.missing.MissingPetDetailActivity
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class MyReportsActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMyReportsBinding
    private val api by lazy { RetrofitClient.getApiService(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMyReportsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        binding.rvReports.layoutManager = LinearLayoutManager(this)
        loadReports()
    }

    private fun loadReports() {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getMyReports()
                binding.progressBar.gone()
                if (response.isSuccessful) {
                    val pets = response.body()?.missingPets ?: emptyList()
                    binding.rvReports.adapter = MissingPetAdapter(pets) { pet ->
                        val intent = Intent(this@MyReportsActivity, MissingPetDetailActivity::class.java)
                        intent.putExtra("missing_pet_id", pet.missingPetId)
                        startActivity(intent)
                    }
                    binding.tvEmpty.visibility = if (pets.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                showToast("Error: ${e.message}")
            }
        }
    }
}
