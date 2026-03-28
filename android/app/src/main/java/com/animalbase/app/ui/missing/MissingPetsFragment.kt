package com.animalbase.app.ui.missing

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.FragmentMissingPetsBinding
import com.animalbase.app.models.MissingPet
import com.animalbase.app.ui.report.ReportMissingActivity
import com.animalbase.app.ui.report.ReportSightingActivity
import com.animalbase.app.utils.SessionManager
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class MissingPetsFragment : Fragment() {

    private var _binding: FragmentMissingPetsBinding? = null
    private val binding get() = _binding!!
    private val api by lazy { RetrofitClient.getApiService(requireContext()) }
    private val session by lazy { SessionManager(requireContext()) }
    private val adapter by lazy {
        MissingPetAdapter(
            onView = { pet ->
                startActivity(Intent(requireContext(), MissingPetDetailActivity::class.java).apply {
                    putExtra("missing_pet_id", pet.missingPetId)
                })
            },
            onSighting = { pet ->
                startActivity(Intent(requireContext(), ReportSightingActivity::class.java).apply {
                    putExtra("missing_pet_id", pet.missingPetId)
                })
            },
            isOwner = ::isCurrentUsersPet
        )
    }

    private var allPets: List<MissingPet> = emptyList()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMissingPetsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.rvMissingPets.layoutManager = LinearLayoutManager(requireContext())
        binding.rvMissingPets.adapter = adapter
        binding.swipeRefresh.setOnRefreshListener { loadMissingPets() }
        binding.tilSearch.setEndIconOnClickListener {
            binding.etSearch.text?.clear()
        }
        binding.tilSearch.isEndIconVisible = false
        binding.etSearch.doAfterTextChanged { filterPets(it?.toString().orEmpty()) }
        binding.btnReportMissing.setOnClickListener {
            startActivity(Intent(requireContext(), ReportMissingActivity::class.java))
        }
        binding.btnReportSighting.setOnClickListener {
            startActivity(Intent(requireContext(), ReportSightingActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            loadMissingPets()
        }
    }

    private fun loadMissingPets() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getMissingPets(status = "Missing")
                allPets = if (response.isSuccessful) {
                    sortPetsForDisplay(response.body().orEmpty())
                } else {
                    emptyList()
                }
                filterPets(binding.etSearch.text?.toString().orEmpty())
            } catch (e: Exception) {
                requireContext().showToast(e.message ?: "Failed to load missing pets")
            } finally {
                binding.progressBar.gone()
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun filterPets(query: String) {
        binding.tilSearch.isEndIconVisible = query.isNotBlank()
        val filtered = allPets.filter { pet ->
            if (query.isBlank()) return@filter true
            val term = query.trim().lowercase()
            listOfNotNull(pet.petName, pet.breed, pet.petType, pet.locationLastSeen)
                .any { it.lowercase().contains(term) }
        }

        adapter.submitList(filtered)
        binding.emptyState.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun isCurrentUsersPet(pet: MissingPet): Boolean {
        val currentUser = session.getUser()
        val normalizedUserEmail = currentUser?.email?.trim()?.lowercase().orEmpty()

        return (
            currentUser != null &&
                pet.reportedById != null &&
                currentUser.effectiveUserId == pet.reportedById
            ) || (
                normalizedUserEmail.isNotBlank() &&
                    pet.ownerEmail?.trim()?.lowercase() == normalizedUserEmail
                )
    }

    private fun sortPetsForDisplay(pets: List<MissingPet>): List<MissingPet> {
        return pets.sortedWith(
            compareByDescending<MissingPet> { isCurrentUsersPet(it) }
                .thenByDescending { it.reportedAt.orEmpty() }
                .thenBy { it.petName.lowercase() }
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
