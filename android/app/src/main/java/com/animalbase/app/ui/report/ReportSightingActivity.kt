package com.animalbase.app.ui.report

import android.net.Uri
import android.os.Bundle
import android.widget.ArrayAdapter
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityReportSightingBinding
import com.animalbase.app.utils.*
import kotlinx.coroutines.launch
import okhttp3.MediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import java.io.File
import java.io.FileOutputStream

class ReportSightingActivity : AppCompatActivity() {

    private lateinit var binding: ActivityReportSightingBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val selectedPhotos = mutableListOf<Uri>()
    private var selectedLat: Double? = null
    private var selectedLng: Double? = null
    private var linkedMissingPetId: Int? = null

    private val photoPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        uris?.let {
            val remaining = 5 - selectedPhotos.size
            selectedPhotos.addAll(it.take(remaining))
            binding.btnAddPhotos.text = "${selectedPhotos.size}/5 Photos"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReportSightingBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }

        linkedMissingPetId = intent.getIntExtra("missing_pet_id", 0).takeIf { it > 0 }

        val animalTypes = arrayOf("Dog", "Cat", "Bird", "Small Animal", "Rabbit", "Other")
        binding.acAnimalType.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, animalTypes))

        binding.etSightingDate.setOnClickListener {
            showDatePicker { date -> binding.etSightingDate.setText(date) }
        }

        binding.btnAddPhotos.setOnClickListener {
            if (selectedPhotos.size < 5) photoPickerLauncher.launch("image/*")
            else showToast("Maximum 5 photos allowed")
        }

        binding.btnPickOnMap.setOnClickListener {
            val intent = android.content.Intent(this, com.animalbase.app.ui.map.MapActivity::class.java)
            intent.putExtra("mode", "pick")
            startActivityForResult(intent, 1002)
        }

        binding.btnSubmitSighting.setOnClickListener { submitSighting() }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1002 && resultCode == RESULT_OK) {
            selectedLat = data?.getDoubleExtra("latitude", 0.0)
            selectedLng = data?.getDoubleExtra("longitude", 0.0)
            val address = data?.getStringExtra("address")
            if (address != null) binding.etSightingLocation.setText(address)
        }
    }

    private fun submitSighting() {
        val reporterEmail = binding.etReporterEmail.text.toString().trim()
        val animalType = binding.acAnimalType.text.toString().trim()
        val sightingDate = binding.etSightingDate.text.toString().trim()
        val location = binding.etSightingLocation.text.toString().trim()

        val (valid, error) = ValidationUtils.isValidSightingForm(reporterEmail, animalType, sightingDate, location)
        if (!valid) { showToast(error); return }

        binding.progressBar.visible()
        binding.btnSubmitSighting.isEnabled = false

        lifecycleScope.launch {
            try {
                val rb = { v: String? -> v?.toRequestBody(okhttp3.MediaType.parse("text/plain")) }
                val req = { v: String -> v.toRequestBody(okhttp3.MediaType.parse("text/plain")) }
                val photoParts = selectedPhotos.map { uri ->
                    val file = uriToFile(uri)
                    MultipartBody.Part.createFormData("photos", file.name,
                        RequestBody.create(MediaType.parse("image/*"), file))
                }
                val response = api.reportSighting(
                    missingPetId = rb(linkedMissingPetId?.toString()),
                    reporterName = rb(binding.etReporterName.text.toString().trim().ifEmpty { null }),
                    reporterEmail = req(reporterEmail),
                    reporterPhone = rb(binding.etReporterPhone.text.toString().trim().ifEmpty { null }),
                    animalType = req(animalType),
                    breed = null,
                    colorAppearance = rb(binding.etSightingColor.text.toString().trim().ifEmpty { null }),
                    description = rb(binding.etSightingDescription.text.toString().trim().ifEmpty { null }),
                    sightingDate = req(sightingDate),
                    location = req(location),
                    latitude = rb(selectedLat?.toString()),
                    longitude = rb(selectedLng?.toString()),
                    isUnidentified = rb(binding.switchUnidentified.isChecked.toString()),
                    photos = photoParts.ifEmpty { null }
                )
                binding.progressBar.gone()
                binding.btnSubmitSighting.isEnabled = true
                if (response.isSuccessful && response.body()?.success == true) {
                    showToast("Sighting report submitted!")
                    finish()
                } else {
                    showToast("Submission failed")
                }
            } catch (e: Exception) {
                binding.progressBar.gone()
                binding.btnSubmitSighting.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }

    private fun uriToFile(uri: Uri): File {
        val file = File.createTempFile("sighting_", ".jpg", cacheDir)
        contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(file).use { output -> input.copyTo(output) }
        }
        return file
    }
}
