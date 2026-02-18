package com.animalbase.app.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.FragmentHomeBinding
import com.animalbase.app.ui.adoption.PetAdapter
import com.animalbase.app.ui.adoption.PetDetailActivity
import com.animalbase.app.ui.missing.MissingPetAdapter
import com.animalbase.app.ui.missing.MissingPetDetailActivity
import com.animalbase.app.ui.notifications.NotificationsActivity
import com.animalbase.app.ui.profile.ProfileActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.SessionManager
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val api by lazy { RetrofitClient.getApiService(requireContext()) }
    private val session by lazy { SessionManager(requireContext()) }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
        loadData()
        binding.swipeRefresh.setOnRefreshListener { loadData() }
    }

    private fun setupUI() {
        // Set user name
        val user = session.getUser()
        binding.tvUserName.text = user?.fullName ?: "AnimalBase"
        user?.profilePhotoUrl?.let {
            ImageLoader.loadProfileImage(requireContext(), it, binding.ivProfileAvatar)
        }

        // Profile click
        binding.ivProfileAvatar.setOnClickListener {
            startActivity(Intent(requireContext(), ProfileActivity::class.java))
        }

        // See all pets
        binding.tvSeeAllPets.setOnClickListener {
            (requireActivity() as? MainActivity)?.let {
                it.supportFragmentManager.beginTransaction()
                    .replace(com.animalbase.app.R.id.fragmentContainer, com.animalbase.app.ui.adoption.AdoptionFragment())
                    .commit()
            }
        }

        // See all missing
        binding.tvSeeAllMissing.setOnClickListener {
            (requireActivity() as? MainActivity)?.let {
                it.supportFragmentManager.beginTransaction()
                    .replace(com.animalbase.app.R.id.fragmentContainer, com.animalbase.app.ui.missing.MissingPetsFragment())
                    .commit()
            }
        }

        // Category chips
        binding.chipGroupCategories.setOnCheckedStateChangeListener { _, checkedIds ->
            val type = when {
                checkedIds.contains(com.animalbase.app.R.id.chipDog) -> "Dog"
                checkedIds.contains(com.animalbase.app.R.id.chipCat) -> "Cat"
                checkedIds.contains(com.animalbase.app.R.id.chipBird) -> "Bird"
                checkedIds.contains(com.animalbase.app.R.id.chipSmall) -> "Small Animal"
                else -> null
            }
            loadPets(type)
        }

        // Setup recycler views
        binding.rvFeaturedPets.layoutManager =
            LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        binding.rvMissingPets.layoutManager = LinearLayoutManager(requireContext())
    }

    private fun loadData() {
        loadPets(null)
        loadMissingPets()
    }

    private fun loadPets(type: String? = null) {
        lifecycleScope.launch {
            try {
                val response = api.getPets(type = type, limit = 10)
                if (response.isSuccessful) {
                    val pets = response.body()?.pets ?: emptyList()
                    binding.rvFeaturedPets.adapter = PetAdapter(pets) { pet ->
                        val intent = Intent(requireContext(), PetDetailActivity::class.java)
                        intent.putExtra("pet_id", pet.petId)
                        startActivity(intent)
                    }
                }
                binding.swipeRefresh.isRefreshing = false
            } catch (e: Exception) {
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun loadMissingPets() {
        lifecycleScope.launch {
            try {
                val response = api.getMissingPets(status = "Missing", limit = 5)
                if (response.isSuccessful) {
                    val pets = response.body()?.missingPets ?: emptyList()
                    binding.rvMissingPets.adapter = MissingPetAdapter(pets) { pet ->
                        val intent = Intent(requireContext(), MissingPetDetailActivity::class.java)
                        intent.putExtra("missing_pet_id", pet.missingPetId)
                        startActivity(intent)
                    }
                }
            } catch (e: Exception) { }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
