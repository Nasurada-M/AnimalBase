package com.animalbase.app.ui.adoption

import android.content.Intent
import android.os.Bundle
import android.view.*
import android.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.FragmentAdoptionBinding
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class AdoptionFragment : Fragment() {
    private var _binding: FragmentAdoptionBinding? = null
    private val binding get() = _binding!!
    private val api by lazy { RetrofitClient.getApiService(requireContext()) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAdoptionBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.rvPets.layoutManager = GridLayoutManager(requireContext(), 2)
        loadPets()
        binding.swipeRefresh.setOnRefreshListener { loadPets() }

        // Filter chips
        binding.chipGroupFilter.setOnCheckedStateChangeListener { _, checkedIds ->
            val type = when {
                checkedIds.contains(com.animalbase.app.R.id.chipFilterDog) -> "Dog"
                checkedIds.contains(com.animalbase.app.R.id.chipFilterCat) -> "Cat"
                checkedIds.contains(com.animalbase.app.R.id.chipFilterBird) -> "Bird"
                else -> null
            }
            loadPets(type = type)
        }
    }

    private fun loadPets(search: String? = null, type: String? = null) {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getPets(type = type, search = search)
                binding.progressBar.gone()
                binding.swipeRefresh.isRefreshing = false
                if (response.isSuccessful) {
                    val pets = response.body()?.pets ?: emptyList()
                    binding.rvPets.adapter = PetAdapter(pets) { pet ->
                        val intent = Intent(requireContext(), PetDetailActivity::class.java)
                        intent.putExtra("pet_id", pet.petId)
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
