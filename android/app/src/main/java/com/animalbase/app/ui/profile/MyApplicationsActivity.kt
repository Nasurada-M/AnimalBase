package com.animalbase.app.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityMyApplicationsBinding
import com.animalbase.app.databinding.ItemApplicationBinding
import com.animalbase.app.models.AdoptionApplication
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class MyApplicationsActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMyApplicationsBinding
    private val api by lazy { RetrofitClient.getApiService(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMyApplicationsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        binding.rvApplications.layoutManager = LinearLayoutManager(this)
        loadApplications()
    }

    private fun loadApplications() {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getMyApplications()
                binding.progressBar.gone()
                if (response.isSuccessful) {
                    val apps = response.body()?.applications ?: emptyList()
                    binding.rvApplications.adapter = ApplicationAdapter(apps)
                    binding.tvEmpty.visibility = if (apps.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                showToast("Error: ${e.message}")
            }
        }
    }

    inner class ApplicationAdapter(private val apps: List<AdoptionApplication>) :
        RecyclerView.Adapter<ApplicationAdapter.VH>() {
        inner class VH(val b: ItemApplicationBinding) : RecyclerView.ViewHolder(b.root)
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
            VH(ItemApplicationBinding.inflate(LayoutInflater.from(parent.context), parent, false))
        override fun getItemCount() = apps.size
        override fun onBindViewHolder(holder: VH, position: Int) {
            val app = apps[position]
            holder.b.tvPetName.text = app.petName ?: "Pet #${app.petId}"
            holder.b.tvShelterName.text = app.shelterName ?: ""
            holder.b.tvStatus.text = app.status
            holder.b.tvDate.text = app.createdAt?.formatDateTime() ?: ""
            val statusColor = when (app.status) {
                "Approved" -> getColor(com.animalbase.app.R.color.status_available)
                "Rejected" -> getColor(com.animalbase.app.R.color.status_rejected)
                else -> getColor(com.animalbase.app.R.color.status_pending)
            }
            holder.b.tvStatus.setTextColor(statusColor)
        }
    }
}
