package com.animalbase.app.ui.profile

import android.content.Intent
import android.os.Bundle
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityMyReportsBinding
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.ui.missing.MissingPetAdapter
import com.animalbase.app.ui.missing.MissingPetDetailActivity
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class MyReportsActivity : SessionAwareActivity() {
    private lateinit var binding: ActivityMyReportsBinding
    private val api by lazy { RetrofitClient.getApiService(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMyReportsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        binding.rvReports.layoutManager = LinearLayoutManager(this)
    }

    override fun onResume() {
        super.onResume()
        loadReports()
    }

    private fun loadReports() {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getMyReports()
                binding.progressBar.gone()
                if (response.isSuccessful) {
                    val pets = response.body()?.missingPets?.filter { it.status == "Missing" } ?: emptyList()
                    val adapter = MissingPetAdapter(
                        onView = { pet ->
                            val intent = Intent(this@MyReportsActivity, MissingPetDetailActivity::class.java)
                            intent.putExtra("missing_pet_id", pet.missingPetId)
                            startActivity(intent)
                        },
                        onSighting = { pet ->
                            val intent = Intent(this@MyReportsActivity, com.animalbase.app.ui.report.ReportSightingActivity::class.java)
                            intent.putExtra("missing_pet_id", pet.missingPetId)
                            startActivity(intent)
                        }
                    )
                    adapter.submitList(pets)
                    binding.rvReports.adapter = adapter
                    binding.tvEmpty.visibility = if (pets.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                showToast("Error: ${e.message}")
            }
        }
    }
}
