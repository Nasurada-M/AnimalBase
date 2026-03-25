package com.animalbase.app.ui.report

import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.widget.ArrayAdapter
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityReportMissingBinding
import com.animalbase.app.models.MissingPetReportRequest
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.PhpCurrencyFormatter
import com.animalbase.app.utils.petTextInputFilter
import com.animalbase.app.utils.normalizeWeightForStorage
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showDatePicker
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch
import org.json.JSONObject

private data class RewardCurrencyOption(
    val code: String,
    val symbol: String,
) {
    override fun toString(): String = "$code ($symbol)"
}

private const val DEFAULT_REWARD_CURRENCY = "PHP"

private val REWARD_CURRENCY_OPTIONS = listOf(
    RewardCurrencyOption("AED", "AED"),
    RewardCurrencyOption("ARS", "AR$"),
    RewardCurrencyOption("AUD", "A$"),
    RewardCurrencyOption("BDT", "৳"),
    RewardCurrencyOption("BHD", "BD"),
    RewardCurrencyOption("BND", "B$"),
    RewardCurrencyOption("BRL", "R$"),
    RewardCurrencyOption("CAD", "C$"),
    RewardCurrencyOption("CHF", "CHF"),
    RewardCurrencyOption("CLP", "CLP$"),
    RewardCurrencyOption("CNY", "CN¥"),
    RewardCurrencyOption("COP", "COL$"),
    RewardCurrencyOption("CZK", "Kč"),
    RewardCurrencyOption("DKK", "kr"),
    RewardCurrencyOption("DZD", "DA"),
    RewardCurrencyOption("EGP", "E£"),
    RewardCurrencyOption("EUR", "€"),
    RewardCurrencyOption("FJD", "FJ$"),
    RewardCurrencyOption("GBP", "£"),
    RewardCurrencyOption("GHS", "GH₵"),
    RewardCurrencyOption("GTQ", "Q"),
    RewardCurrencyOption("HKD", "HK$"),
    RewardCurrencyOption("HUF", "Ft"),
    RewardCurrencyOption("IDR", "Rp"),
    RewardCurrencyOption("ILS", "₪"),
    RewardCurrencyOption("INR", "₹"),
    RewardCurrencyOption("JMD", "J$"),
    RewardCurrencyOption("JOD", "JD"),
    RewardCurrencyOption("JPY", "¥"),
    RewardCurrencyOption("KES", "KSh"),
    RewardCurrencyOption("KRW", "₩"),
    RewardCurrencyOption("KWD", "KD"),
    RewardCurrencyOption("LKR", "Rs"),
    RewardCurrencyOption("MAD", "MAD"),
    RewardCurrencyOption("MXN", "MX$"),
    RewardCurrencyOption("MYR", "RM"),
    RewardCurrencyOption("NGN", "₦"),
    RewardCurrencyOption("NOK", "kr"),
    RewardCurrencyOption("NPR", "Rs"),
    RewardCurrencyOption("NZD", "NZ$"),
    RewardCurrencyOption("OMR", "OMR"),
    RewardCurrencyOption("PEN", "S/"),
    RewardCurrencyOption("PHP", "₱"),
    RewardCurrencyOption("PKR", "₨"),
    RewardCurrencyOption("PLN", "zł"),
    RewardCurrencyOption("QAR", "QR"),
    RewardCurrencyOption("RON", "lei"),
    RewardCurrencyOption("RUB", "₽"),
    RewardCurrencyOption("SAR", "SAR"),
    RewardCurrencyOption("SEK", "kr"),
    RewardCurrencyOption("SGD", "S$"),
    RewardCurrencyOption("THB", "฿"),
    RewardCurrencyOption("TRY", "₺"),
    RewardCurrencyOption("TWD", "NT$"),
    RewardCurrencyOption("UAH", "₴"),
    RewardCurrencyOption("USD", "$"),
    RewardCurrencyOption("VND", "₫"),
    RewardCurrencyOption("XAF", "FCFA"),
    RewardCurrencyOption("XOF", "CFA"),
    RewardCurrencyOption("ZAR", "R"),
)

class ReportMissingActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityReportMissingBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private var selectedPhotoUri: Uri? = null

    private val photoPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        selectedPhotoUri = uri
        updatePhotoPreview(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReportMissingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }
        binding.etPetName.filters = arrayOf(petTextInputFilter())
        binding.etBreed.filters = arrayOf(petTextInputFilter())
        binding.etColorAppearance.filters = arrayOf(petTextInputFilter(allowComma = true))
        binding.etDescription.filters = arrayOf(petTextInputFilter(multiline = true, allowComma = true))
        binding.etDistinctiveFeatures.filters = arrayOf(petTextInputFilter(multiline = true, allowComma = true))
        binding.etLastSeenLocation.filters = arrayOf(petTextInputFilter(allowComma = true))

        binding.acPetType.setAdapter(
            ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, listOf("Dog", "Cat", "Bird", "Rabbit", "Other"))
        )
        binding.acGender.setAdapter(
            ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, listOf("Male", "Female", "Unknown"))
        )
        binding.etAge.setAdapter(
            ArrayAdapter(
                this,
                android.R.layout.simple_dropdown_item_1line,
                listOf("Under 1 year", "1-3 years", "4-7 years", "8+ years", "Unknown")
            )
        )

        session.getUser()?.let { user ->
            binding.etOwnerName.setText(user.fullName)
            binding.etOwnerEmail.setText(user.email)
            binding.etOwnerPhone.setText(user.phone)
        }

        updatePhotoPreview(null)
        binding.etLastSeenDate.setOnClickListener {
            showDatePicker { binding.etLastSeenDate.setText(it) }
        }
        binding.btnPickPhoto.setOnClickListener { photoPickerLauncher.launch("image/*") }
        binding.btnSubmitReport.setOnClickListener { submitReport() }
    }

    private fun submitReport() {
        val payload = MissingPetReportRequest(
            petName = binding.etPetName.text?.toString().orEmpty().trim(),
            type = binding.acPetType.text?.toString().orEmpty().trim(),
            breed = binding.etBreed.text?.toString().orEmpty().trim(),
            gender = binding.acGender.text?.toString().orEmpty().trim(),
            age = binding.etAge.text?.toString()?.trim()?.ifEmpty { null },
            weight = normalizeWeightForStorage(binding.etWeight.text?.toString()),
            colorAppearance = binding.etColorAppearance.text?.toString().orEmpty().trim(),
            description = binding.etDescription.text?.toString().orEmpty().trim(),
            distinctiveFeatures = binding.etDistinctiveFeatures.text?.toString()?.trim()?.ifEmpty { null },
            imageUrl = selectedPhotoUri?.let(::uriToDataUrl),
            lastSeenLocation = binding.etLastSeenLocation.text?.toString().orEmpty().trim(),
            lastSeenDate = binding.etLastSeenDate.text?.toString().orEmpty().trim(),
            rewardOffered = PhpCurrencyFormatter.formatAmount(
                binding.etRewardAmount.text?.toString().orEmpty()
            ),
            ownerName = binding.etOwnerName.text?.toString().orEmpty().trim(),
            ownerEmail = binding.etOwnerEmail.text?.toString().orEmpty().trim(),
            ownerPhone = binding.etOwnerPhone.text?.toString().orEmpty().trim()
        )

        if (payload.petName.isBlank() || payload.type.isBlank() || payload.breed.isBlank() ||
            payload.gender.isBlank() || payload.age.isNullOrBlank() || payload.colorAppearance.isBlank() || payload.description.isBlank() ||
            payload.lastSeenLocation.isBlank() || payload.lastSeenDate.isBlank() ||
            payload.ownerName.isBlank() || payload.ownerEmail.isBlank() || payload.ownerPhone.isBlank()
        ) {
            showToast("Please fill in all required fields.")
            return
        }

        binding.progressBar.visible()
        binding.btnSubmitReport.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = api.submitMissingPet(payload)
                if (response.isSuccessful) {
                    showToast("Your missing pet report has been posted.")
                    finish()
                } else {
                    val message = response.errorBody()?.string()?.let {
                        runCatching { JSONObject(it).optString("error") }.getOrNull()
                    }
                    showToast(message ?: "Failed to submit report")
                }
            } catch (e: Exception) {
                showToast(e.message ?: "Failed to submit report")
            } finally {
                binding.progressBar.gone()
                binding.btnSubmitReport.isEnabled = true
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
