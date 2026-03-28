package com.animalbase.app.ui.missing

import android.content.Intent
import android.graphics.Paint
import android.net.Uri
import android.os.Bundle
import android.view.View
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityMissingPetDetailBinding
import com.animalbase.app.databinding.ItemSightingMessageBinding
import com.animalbase.app.models.MissingPet
import com.animalbase.app.models.Sighting
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.ui.common.ImagePreviewActivity
import com.animalbase.app.ui.report.ReportSightingActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.PhpCurrencyFormatter
import com.animalbase.app.utils.formatDisplayDate
import com.animalbase.app.utils.formatNotificationTimestamp
import com.animalbase.app.utils.formatWeightForDisplay
import com.animalbase.app.utils.gone
import com.animalbase.app.utils.showToast
import com.animalbase.app.utils.visible
import kotlinx.coroutines.launch

class MissingPetDetailActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityMissingPetDetailBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private var missingPetId: Int = 0
    private var currentImageUrl: String? = null
    private var isOwnerReport: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMissingPetDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }

        missingPetId = intent.getIntExtra("missing_pet_id", 0)
        if (missingPetId > 0) loadMissingPet()

        binding.ivMissingPetImage.setOnClickListener {
            val imageUrl = currentImageUrl?.takeIf { value -> value.isNotBlank() } ?: return@setOnClickListener
            ImagePreviewActivity.open(this, imageUrl, binding.tvMissingPetName.text?.toString())
        }
    }

    private fun loadMissingPet() {
        lifecycleScope.launch {
            try {
                val response = api.getMissingPetById(missingPetId)
                if (response.isSuccessful) {
                    response.body()?.let(::bindPet)
                } else {
                    showToast("Failed to load missing pet")
                }
            } catch (e: Exception) {
                showToast(e.message ?: "Failed to load missing pet")
            }
        }
    }

    private fun bindPet(pet: MissingPet) {
        val currentUser = session.getUser()
        val normalizedUserEmail = currentUser?.email?.trim()?.lowercase().orEmpty()
        val isOwner =
            (pet.reportedById != null && pet.reportedById == currentUser?.effectiveUserId)
                || (
                normalizedUserEmail.isNotBlank()
                    && pet.ownerEmail?.trim()?.lowercase() == normalizedUserEmail
                )
        val imageUrl = pet.photoUrls.firstOrNull() ?: pet.photos.firstOrNull() ?: pet.imageUrl
        val reward = PhpCurrencyFormatter.formatRewardValue(pet.rewardOffered)
        val features = pet.distinctiveFeatures?.takeIf { it.isNotBlank() }
        val contactEmail = pet.email?.takeIf { it.isNotBlank() }
        val contactNumber = pet.contactNumber?.takeIf { it.isNotBlank() }
        val formattedDate = pet.dateLastSeen?.formatDisplayDate() ?: "Unknown date"

        isOwnerReport = isOwner

        binding.tvMissingPetName.text = pet.petName
        binding.tvBreed.text = listOfNotNull(pet.breed, pet.petType).joinToString(" - ")
        binding.tvStatus.text = pet.status
        binding.tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(
            getColor(if (pet.status == "Found") R.color.status_found else R.color.status_missing)
        )
        binding.tvDescription.text = pet.description ?: "No description provided."
        binding.tvPetInfo.text = buildString {
            appendLine("Type: ${pet.petType}")
            appendLine("Breed: ${pet.breed ?: "Unknown"}")
            appendLine("Gender: ${pet.gender ?: "Unknown"}")
            appendLine("Age: ${pet.age ?: "-"}")
            appendLine("Weight: ${formatWeightForDisplay(pet.weight, "-")}")
            append("Colour: ${pet.colorAppearance ?: "Unknown"}")
        }
        binding.tvLastSeen.text = "Last Seen: ${pet.locationLastSeen ?: "Unknown location"}"
        binding.tvDateLastSeen.text = "Date: $formattedDate"
        binding.tvOwnerName.text = pet.ownerName ?: "Unknown reporter"
        binding.tvContactEmail.text = contactEmail ?: "No email provided"
        binding.tvContact.text = contactNumber ?: "No phone provided"

        binding.cardReward.visibility = if (reward != null) View.VISIBLE else View.GONE
        binding.tvReward.text = reward

        binding.tvFeaturesLabel.visibility = if (features != null) View.VISIBLE else View.GONE
        binding.tvFeatures.visibility = if (features != null) View.VISIBLE else View.GONE
        binding.tvFeatures.text = features

        currentImageUrl = imageUrl
        binding.ivMissingPetImage.isClickable = !imageUrl.isNullOrBlank()
        binding.ivMissingPetImage.isFocusable = !imageUrl.isNullOrBlank()
        binding.ivMissingPetImage.contentDescription = if (imageUrl.isNullOrBlank()) {
            null
        } else {
            "${pet.petName} photo"
        }
        ImageLoader.loadPetDetailImage(this, imageUrl, binding.ivMissingPetImage)

        val shouldShowContact = !isOwner && (contactEmail != null || contactNumber != null)
        binding.cardReporterContact.visibility = if (shouldShowContact) View.VISIBLE else View.GONE
        binding.btnContactOwner.visibility =
            if (shouldShowContact && contactNumber != null) View.VISIBLE else View.GONE

        if (contactEmail != null && shouldShowContact) {
            binding.tvContactEmail.setTextColor(getColor(R.color.primary))
            binding.tvContactEmail.paintFlags =
                binding.tvContactEmail.paintFlags or Paint.UNDERLINE_TEXT_FLAG
            binding.tvContactEmail.setOnClickListener { openGmailCompose(contactEmail) }
        } else {
            binding.tvContactEmail.setTextColor(getColor(R.color.text_secondary))
            binding.tvContactEmail.paintFlags =
                binding.tvContactEmail.paintFlags and Paint.UNDERLINE_TEXT_FLAG.inv()
            binding.tvContactEmail.setOnClickListener(null)
        }

        if (contactNumber != null && shouldShowContact) {
            binding.tvContact.setTextColor(getColor(R.color.primary))
            binding.tvContact.paintFlags = binding.tvContact.paintFlags or Paint.UNDERLINE_TEXT_FLAG
            binding.tvContact.setOnClickListener { openDialer(contactNumber) }
        } else {
            binding.tvContact.setTextColor(getColor(R.color.text_secondary))
            binding.tvContact.paintFlags =
                binding.tvContact.paintFlags and Paint.UNDERLINE_TEXT_FLAG.inv()
            binding.tvContact.setOnClickListener(null)
        }

        binding.btnContactOwner.setOnClickListener {
            if (contactNumber.isNullOrBlank()) {
                showToast("No contact number available")
            } else {
                openDialer(contactNumber)
            }
        }

        binding.btnMarkFound.visibility = if (pet.status == "Missing" && isOwner) View.VISIBLE else View.GONE
        binding.btnMarkFound.setOnClickListener { markPetAsFound() }
        binding.btnReportSighting.visibility = if (pet.status == "Missing" && !isOwner) View.VISIBLE else View.GONE
        binding.btnReportSighting.setOnClickListener {
            startActivity(Intent(this, ReportSightingActivity::class.java).apply {
                putExtra("missing_pet_id", missingPetId)
            })
        }

        if (isOwner) {
            loadSightings()
        } else {
            binding.cardSightings.gone()
        }
    }

    private fun loadSightings() {
        binding.cardSightings.visible()
        binding.layoutSightingsContainer.removeAllViews()
        binding.layoutSightingsContainer.gone()
        binding.layoutSightingsEmpty.visible()
        binding.tvSightingsSubtitle.text = "Submitted sightings from other users will appear here."
        binding.tvSightingsEmptyTitle.text = "Loading sighting messages..."
        binding.tvSightingsEmptySubtitle.text = "Checking recent community updates for this report."

        lifecycleScope.launch {
            try {
                val response = api.getSightings(missingPetId)
                if (response.isSuccessful) {
                    bindSightings(response.body().orEmpty())
                } else {
                    showSightingsError()
                }
            } catch (_: Exception) {
                showSightingsError()
            }
        }
    }

    private fun bindSightings(sightings: List<Sighting>) {
        if (!isOwnerReport) {
            binding.cardSightings.gone()
            return
        }

        binding.cardSightings.visible()
        binding.layoutSightingsContainer.removeAllViews()

        if (sightings.isEmpty()) {
            binding.layoutSightingsContainer.gone()
            binding.layoutSightingsEmpty.visible()
            binding.tvSightingsSubtitle.text = "Submitted sightings from other users will appear here."
            binding.tvSightingsEmptyTitle.text = "No sighting messages yet"
            binding.tvSightingsEmptySubtitle.text =
                "When someone submits a sighting for this report, it will appear here."
            return
        }

        binding.layoutSightingsEmpty.gone()
        binding.layoutSightingsContainer.visible()
        binding.tvSightingsSubtitle.text =
            "${sightings.size} sighting message${if (sightings.size == 1) "" else "s"} from the community."

        sightings.forEach { sighting ->
            val itemBinding = ItemSightingMessageBinding.inflate(
                layoutInflater,
                binding.layoutSightingsContainer,
                false
            )
            bindSightingCard(itemBinding, sighting)
            binding.layoutSightingsContainer.addView(itemBinding.root)
        }
    }

    private fun bindSightingCard(itemBinding: ItemSightingMessageBinding, sighting: Sighting) {
        val imageUrl = sighting.imageUrl?.takeIf { it.isNotBlank() }
        val displayReporter = sighting.reporterName?.takeIf { it.isNotBlank() } ?: "Community member"
        val displayTimestamp = sighting.reportedAt
            ?.takeIf { it.isNotBlank() }
            ?.formatNotificationTimestamp()
            ?: "Recently submitted"
        val displayLocation = sighting.locationSeen?.takeIf { it.isNotBlank() } ?: "Location not provided"
        val displayDate = sighting.dateSeen?.takeIf { it.isNotBlank() }?.formatDisplayDate() ?: "Unknown date"
        val displayDescription = sighting.description?.takeIf { it.isNotBlank() }
            ?: "No additional details were included."

        itemBinding.tvReporterName.text = displayReporter
        itemBinding.tvReportedAt.text = displayTimestamp
        itemBinding.tvLocationSeen.text = displayLocation
        itemBinding.tvDateSeen.text = "Seen on $displayDate"
        itemBinding.tvDescription.text = displayDescription
        itemBinding.tvReporterEmail.text =
            "Email: ${sighting.reporterEmail?.takeIf { it.isNotBlank() } ?: "No email provided"}"
        itemBinding.tvReporterPhone.text =
            "Phone: ${sighting.reporterPhone?.takeIf { it.isNotBlank() } ?: "No phone provided"}"

        if (imageUrl == null) {
            itemBinding.cardSightingPhoto.gone()
            itemBinding.cardSightingPhoto.setOnClickListener(null)
            itemBinding.ivSightingPhoto.setImageResource(R.drawable.ic_placeholder_pet)
            return
        }

        itemBinding.cardSightingPhoto.visible()
        ImageLoader.loadAnyImage(this, imageUrl, itemBinding.ivSightingPhoto)
        itemBinding.cardSightingPhoto.setOnClickListener {
            ImagePreviewActivity.open(this, imageUrl, "${binding.tvMissingPetName.text} sighting photo")
        }
    }

    private fun showSightingsError() {
        if (!isOwnerReport) {
            binding.cardSightings.gone()
            return
        }

        binding.cardSightings.visible()
        binding.layoutSightingsContainer.gone()
        binding.layoutSightingsEmpty.visible()
        binding.tvSightingsSubtitle.text = "Submitted sightings from other users will appear here."
        binding.tvSightingsEmptyTitle.text = "Unable to load sighting messages"
        binding.tvSightingsEmptySubtitle.text = "Please reopen this report to refresh the latest updates."
    }

    private fun openGmailCompose(email: String) {
        val gmailUri = Uri.parse("https://mail.google.com/mail/?view=cm&fs=1&to=${Uri.encode(email)}")
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, gmailUri))
        }.onFailure {
            showToast("Unable to open Gmail compose")
        }
    }

    private fun openDialer(number: String) {
        startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number")))
    }

    private fun markPetAsFound() {
        binding.btnMarkFound.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = api.markMissingPetFound(missingPetId)
                if (response.isSuccessful) {
                    showToast("Report marked as found")
                    setResult(RESULT_OK)
                    finish()
                } else {
                    showToast("Failed to update report")
                    binding.btnMarkFound.isEnabled = true
                }
            } catch (e: Exception) {
                showToast(e.message ?: "Failed to update report")
                binding.btnMarkFound.isEnabled = true
            }
        }
    }
}
