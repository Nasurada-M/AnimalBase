package com.animalbase.app.ui.report

import android.net.Uri
import android.os.Bundle
import android.widget.ArrayAdapter
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityReportMissingBinding
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch
import okhttp3.MediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import java.io.File
import java.io.FileOutputStream

class ReportMissingActivity : AppCompatActivity() {

    private lateinit var binding: ActivityReportMissingBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val session by lazy { SessionManager(this) }
    private val selectedPhotos = mutableListOf<Uri>()
    private var selectedLat: Double? = null
    private var selectedLng: Double? = null

    private val photoPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        uris?.let {
            val remaining = 5 - selectedPhotos.size
            selectedPhotos.addAll(it.take(remaining))
            showPhotoCount()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReportMissingBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }

        // Pre-fill contact from user profile
        val user = session.getUser()
        user?.let {
            binding.etContactEmail.setText(it.email)
            binding.etContactNumber.setText(it.phoneNumber)
        }

        // Setup dropdowns
        val petTypes = arrayOf("Dog", "Cat", "Bird", "Small Animal", "Rabbit", "Fish", "Other")
        binding.acPetType.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, petTypes))
        val genders = arrayOf("Male", "Female", "Unknown")
        binding.acGender.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, genders))
        val ages = arrayOf("Young", "Adult", "Senior")
        binding.acAgeCategory.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, ages))

        // Date picker
        binding.etDateLastSeen.setOnClickListener {
            showDatePicker { date -> binding.etDateLastSeen.setText(date) }
        }

        // Photo picker
        binding.btnAddPhotos.setOnClickListener {
            if (selectedPhotos.size < 5) photoPickerLauncher.launch("image/*")
            else showToast("Maximum 5 photos allowed")
        }

        // Map picker
        binding.btnPickOnMap.setOnClickListener {
            val intent = android.content.Intent(this, com.animalbase.app.ui.map.MapActivity::class.java)
            intent.putExtra("mode", "pick")
            startActivityForResult(intent, MAP_REQUEST_CODE)
        }

        binding.btnSubmitReport.setOnClickListener { submitReport() }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == MAP_REQUEST_CODE && resultCode == RESULT_OK) {
            selectedLat = data?.getDoubleExtra("latitude", 0.0)
            selectedLng = data?.getDoubleExtra("longitude", 0.0)
            val address = data?.getStringExtra("address")
            if (address != null) binding.etLocation.setText(address)
        }
    }

    private fun showPhotoCount() {
        binding.btnAddPhotos.text = "${selectedPhotos.size}/5 Photos"
    }

    private fun submitReport() {
        val petName = binding.etPetName.text.toString().trim()
        val petType = binding.acPetType.text.toString().trim()
        val dateLastSeen = binding.etDateLastSeen.text.toString().trim()
        val location = binding.etLocation.text.toString().trim()
        val contactNumber = binding.etContactNumber.text.toString().trim()
        val email = binding.etContactEmail.text.toString().trim()

        // Validate
        val (valid, error) = ValidationUtils.isValidReportForm(petName, petType, dateLastSeen, location, contactNumber, email)
        if (!valid) { showToast(error); return }

        binding.progressBar.visible()
        binding.btnSubmitReport.isEnabled = false

        lifecycleScope.launch {
            try {
                val rb = { v: String? -> v?.toRequestBody(okhttp3.MediaType.parse("text/plain")) }
                val req = { v: String -> v.toRequestBody(okhttp3.MediaType.parse("text/plain")) }

                val photoParts = selectedPhotos.mapIndexed { index, uri ->
                    val file = uriToFile(uri)
                    MultipartBody.Part.createFormData(
                        "photos", file.name,
                        RequestBody.create(MediaType.parse("image/*"), file)
                    )
                }

                val response = api.reportMissingPet(
                    petName = req(petName),
                    petType = req(petType),
                    breed = rb(binding.etBreed.text.toString().trim().ifEmpty { null }),
                    gender = rb(binding.acGender.text.toString().trim().ifEmpty { null }),
                    ageCategory = rb(binding.acAgeCategory.text.toString().trim().ifEmpty { null }),
                    colorAppearance = rb(binding.etColor.text.toString().trim().ifEmpty { null }),
                    description = null,
                    distinctiveFeatures = rb(binding.etFeatures.text.toString().trim().ifEmpty { null }),
                    dateLastSeen = req(dateLastSeen),
                    locationLastSeen = req(location),
                    latitude = rb(selectedLat?.toString()),
                    longitude = rb(selectedLng?.toString()),
                    contactNumber = req(contactNumber),
                    alternateContact = rb(binding.etAltContact.text.toString().trim().ifEmpty { null }),
                    email = req(email),
                    rewardOffered = rb(binding.etReward.text.toString().trim().ifEmpty { null }),
                    photos = photoParts.ifEmpty { null }
                )
                binding.progressBar.gone()
                binding.btnSubmitReport.isEnabled = true
                if (response.isSuccessful && response.body()?.success == true) {
                    showToast("Missing pet report submitted!")
                    finish()
                } else {
                    showToast(response.body()?.message ?: "Submission failed")
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.btnSubmitReport.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }

    private fun uriToFile(uri: Uri): File {
        val file = File.createTempFile("photo_", ".jpg", cacheDir)
        contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(file).use { output -> input.copyTo(output) }
        }
        return file
    }

    companion object { const val MAP_REQUEST_CODE = 1001 }
}
