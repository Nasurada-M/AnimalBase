package com.animalbase.app.ui.adoption

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityAdoptionFormBinding
import com.animalbase.app.models.AdoptionApplicationRequest
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch

class AdoptionFormActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAdoptionFormBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private var petId: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdoptionFormBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        petId = intent.getIntExtra("pet_id", 0)

        // Pre-fill from user profile
        val session = SessionManager(this)
        val user = session.getUser()
        user?.let {
            binding.etFullName.setText(it.fullName)
            binding.etEmail.setText(it.email)
            binding.etPhone.setText(it.phoneNumber)
            binding.etAddress.setText(it.address)
        }

        binding.btnSubmitApplication.setOnClickListener { submitApplication() }
    }

    private fun submitApplication() {
        val fullName = binding.etFullName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()
        val address = binding.etAddress.text.toString().trim()
        val whyAdopt = binding.etWhyAdopt.text.toString().trim()
        val whyChosen = binding.etWhyChosen.text.toString().trim()
        val experience = binding.etExperience.text.toString().trim()

        // Validation
        val (valid, error) = ValidationUtils.isValidAdoptionForm(fullName, email, phone, address, whyAdopt)
        if (!valid) { showToast(error); return }

        binding.progressBar.visible()
        binding.btnSubmitApplication.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = api.submitAdoptionApplication(
                    AdoptionApplicationRequest(
                        pet_id = petId,
                        full_name = fullName,
                        email = email,
                        phone_number = phone,
                        home_address = address,
                        previous_pet_experience = experience.ifEmpty { null },
                        why_adopt = whyAdopt,
                        why_chosen = whyChosen.ifEmpty { null }
                    )
                )
                binding.progressBar.gone()
                binding.btnSubmitApplication.isEnabled = true
                if (response.isSuccessful && response.body()?.success == true) {
                    showToast("Application submitted successfully!")
                    finish()
                } else {
                    showToast(response.body()?.message ?: "Submission failed")
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.btnSubmitApplication.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }
}
