package com.animalbase.app.ui.encyclopedia

import android.content.Intent
import android.os.Bundle
import android.view.*
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.FragmentEncyclopediaBinding
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class EncyclopediaFragment : Fragment() {
    private var _binding: FragmentEncyclopediaBinding? = null
    private val binding get() = _binding!!
    private val api by lazy { RetrofitClient.getApiService(requireContext()) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentEncyclopediaBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.rvAnimals.layoutManager = GridLayoutManager(requireContext(), 2)
        loadAnimals()
        binding.swipeRefresh.setOnRefreshListener { loadAnimals() }
    }

    private fun loadAnimals(category: String? = null, search: String? = null) {
        lifecycleScope.launch {
            try {
                binding.progressBar.visible()
                val response = api.getAnimals(category = category, search = search)
                binding.progressBar.gone()
                binding.swipeRefresh.isRefreshing = false
                if (response.isSuccessful) {
                    val animals = response.body()?.animals ?: emptyList()
                    binding.rvAnimals.adapter = AnimalAdapter(animals) { animal ->
                        val intent = Intent(requireContext(), AnimalDetailActivity::class.java)
                        intent.putExtra("animal_id", animal.animalId)
                        startActivity(intent)
                    }
                    binding.tvEmptyState.visibility = if (animals.isEmpty()) View.VISIBLE else View.GONE
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
