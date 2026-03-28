package com.animalbase.app.ui.profile

import android.os.Bundle
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityMyApplicationsBinding
import com.animalbase.app.models.AdoptionApplication
import com.animalbase.app.ui.applications.ApplicationCardAdapter
import com.animalbase.app.ui.applications.ApplicationDetailsDialog
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class MyApplicationsActivity : SessionAwareActivity() {
    private lateinit var binding: ActivityMyApplicationsBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val applicationAdapter by lazy { ApplicationCardAdapter(::showApplicationDetails) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMyApplicationsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        binding.rvApplications.layoutManager = LinearLayoutManager(this)
        binding.rvApplications.adapter = applicationAdapter
        loadApplications()
    }

    private fun loadApplications() {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getMyApplications()
                binding.progressBar.gone()
                if (response.isSuccessful) {
                    val apps = response.body() ?: emptyList()
                    applicationAdapter.submitList(apps)
                    binding.tvEmpty.visibility = if (apps.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                showToast("Error: ${e.message}")
            }
        }
    }

    private fun showApplicationDetails(application: AdoptionApplication) {
        ApplicationDetailsDialog.show(this, application)
    }
}
