package com.animalbase.app.ui.missing

import android.content.Intent
import android.os.Bundle
import android.view.*
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.FragmentMissingPetsBinding
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class MissingPetsFragment : Fragment() {
    private var _binding: FragmentMissingPetsBinding? = null
    private val binding get() = _binding!!
    private val api by lazy { RetrofitClient.getApiService(requireContext()) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMissingPetsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.rvMissingPets.layoutManager = LinearLayoutManager(requireContext())
        loadMissingPets()
        binding.swipeRefresh.setOnRefreshListener { loadMissingPets() }
        binding.btnReportMissing.setOnClickListener {
            startActivity(Intent(requireContext(), com.animalbase.app.ui.report.ReportMissingActivity::class.java))
        }
    }

    private fun loadMissingPets(status: String? = "Missing") {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getMissingPets(status = status)
                binding.progressBar.gone()
                binding.swipeRefresh.isRefreshing = false
                if (response.isSuccessful) {
                    val pets = response.body()?.missingPets ?: emptyList()
                    binding.rvMissingPets.adapter = MissingPetAdapter(pets) { pet ->
                        val intent = Intent(requireContext(), MissingPetDetailActivity::class.java)
                        intent.putExtra("missing_pet_id", pet.missingPetId)
                        startActivity(intent)
                    }
                    binding.tvEmptyState.visibility = if (pets.isEmpty()) View.VISIBLE else View.GONE
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
