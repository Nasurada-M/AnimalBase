package com.animalbase.app.ui.report

import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.View
import android.widget.ArrayAdapter
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityReportSightingBinding
import com.animalbase.app.models.MissingPet
import com.animalbase.app.models.SightingReportRequest
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showDatePicker
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import org.json.JSONObject

class ReportSightingActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityReportSightingBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private var missingPets: List<MissingPet> = emptyList()
    private var selectedPet: MissingPet? = null
    private var linkedMissingPetId: Int? = null
    private var selectedPhotoUri: Uri? = null

    private val photoPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        selectedPhotoUri = uri
        updatePhotoPreview(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReportSightingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }

        linkedMissingPetId = intent.getIntExtra("missing_pet_id", 0).takeIf { it > 0 }

        session.getUser()?.let { user ->
            binding.etReporterName.setText(user.fullName)
            binding.etReporterEmail.setText(user.email)
            binding.etReporterPhone.setText(user.phone)
        }

        binding.etDateSeen.setOnClickListener {
            showDatePicker { binding.etDateSeen.setText(it) }
        }
        updatePhotoPreview(null)
        binding.btnPickPhoto.setOnClickListener { photoPickerLauncher.launch("image/*") }
        binding.btnSubmitSighting.setOnClickListener { submitSighting() }

        loadMissingPets()
    }

    private fun loadMissingPets() {
        lifecycleScope.launch {
            try {
                val response = api.getMissingPets(status = "Missing")
                missingPets = if (response.isSuccessful) response.body().orEmpty() else emptyList()
                setupMissingPetSelector()
            } catch (e: Exception) {
                showToast(e.message ?: "Failed to load missing pets")
            }
        }
    }

    private fun setupMissingPetSelector() {
        val petLabels = missingPets.map { "${it.petName} (${listOfNotNull(it.breed, it.petType).joinToString(" · ")})" }
        binding.acMissingPet.setAdapter(
            ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, petLabels)
        )

        binding.acMissingPet.setOnItemClickListener { _, _, position, _ ->
            selectedPet = missingPets.getOrNull(position)
            renderSelectedPet()
        }

        selectedPet = linkedMissingPetId?.let { id -> missingPets.firstOrNull { it.id == id } }
        renderSelectedPet()
    }

    private fun renderSelectedPet() {
        val pet = selectedPet
        val lockedToPet = linkedMissingPetId != null

        binding.tilMissingPet.visibility = if (lockedToPet) View.GONE else View.VISIBLE
        binding.cardSelectedPet.visibility = if (pet != null) View.VISIBLE else View.GONE
        binding.tvSubtitle.text = if (pet != null) {
            "Reporting sighting for ${pet?.petName}."
        } else {
            "Tell us which pet you spotted and where."
        }

        pet ?: return
        binding.tvSelectedPetName.text = pet.petName
        binding.tvSelectedPetMeta.text = listOfNotNull(pet.breed, pet.petType).joinToString(" · ")
        ImageLoader.loadPetImage(
            this,
            pet.photoUrls.firstOrNull() ?: pet.photos.firstOrNull() ?: pet.imageUrl,
            binding.ivSelectedPet
        )
    }

    private fun submitSighting() {
        val petId = selectedPet?.id ?: run {
            showToast("Please select which pet you spotted.")
            return
        }

        val payload = SightingReportRequest(
            reporterName = binding.etReporterName.text?.toString().orEmpty().trim(),
            reporterEmail = binding.etReporterEmail.text?.toString().orEmpty().trim(),
            reporterPhone = binding.etReporterPhone.text?.toString().orEmpty().trim(),
            locationSeen = binding.etLocationSeen.text?.toString().orEmpty().trim(),
            dateSeen = binding.etDateSeen.text?.toString().orEmpty().trim(),
            description = binding.etDescription.text?.toString().orEmpty().trim(),
            imageUrl = selectedPhotoUri?.let(::uriToDataUrl)
        )

        if (payload.reporterName.isBlank() || payload.reporterEmail.isBlank() || payload.reporterPhone.isBlank() ||
            payload.locationSeen.isBlank() || payload.dateSeen.isBlank() || payload.description.isBlank()
        ) {
            showToast("Please fill in all required fields.")
            return
        }

        binding.progressBar.visible()
        binding.btnSubmitSighting.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = api.submitSighting(petId, payload)
                if (response.isSuccessful) {
                    showToast("Your sighting has been submitted.")
                    finish()
                } else {
                    val message = response.errorBody()?.string()?.let {
                        runCatching { JSONObject(it).optString("error") }.getOrNull()
                    }
                    showToast(message ?: "Failed to submit sighting")
                }
            } catch (e: Exception) {
                showToast(e.message ?: "Failed to submit sighting")
            } finally {
                binding.progressBar.gone()
                binding.btnSubmitSighting.isEnabled = true
            }
        }
    }

    private fun uriToDataUrl(uri: Uri): String? {
        return runCatching {
            val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
            val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            "data:$mimeType;base64,$base64"
        }.getOrNull()
    }

    private fun updatePhotoPreview(uri: Uri?) {
        if (uri == null) {
            binding.layoutPhotoPlaceholder.visible()
            binding.ivPhotoPreview.setImageResource(com.animalbase.app.R.drawable.ic_transparent)
            return
        }

        binding.layoutPhotoPlaceholder.gone()
        ImageLoader.loadAnyImage(this, uri.toString(), binding.ivPhotoPreview)
    }
}
