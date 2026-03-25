package com.animalbase.app.ui.applications

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.LayoutInflater
import android.view.WindowManager
import androidx.appcompat.app.AlertDialog
import androidx.core.view.ViewCompat
import com.animalbase.app.R
import com.animalbase.app.databinding.DialogApplicationDetailsBinding
import com.animalbase.app.models.AdoptionApplication
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.formatDateTime

object ApplicationDetailsDialog {

    fun show(context: Context, app: AdoptionApplication) {
        val binding = DialogApplicationDetailsBinding.inflate(LayoutInflater.from(context))
        val dialog = AlertDialog.Builder(context)
            .setView(binding.root)
            .create()

        bindContent(context, binding, app, dialog)

        dialog.setOnShowListener {
            dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            val width = (context.resources.displayMetrics.widthPixels * 0.92f).toInt()
            dialog.window?.setLayout(width, WindowManager.LayoutParams.WRAP_CONTENT)
        }

        dialog.show()
    }

    private fun bindContent(
        context: Context,
        binding: DialogApplicationDetailsBinding,
        app: AdoptionApplication,
        dialog: AlertDialog
    ) {
        binding.tvPetName.text = app.petName ?: "Pet #${app.petId}"
        binding.tvPetType.text = app.petType ?: "Application"
        binding.tvApplicantName.text = app.fullName
        binding.tvApplicantEmail.text = app.email
        binding.tvApplicantPhone.text = app.phone
        binding.tvApplicantAddress.text = app.homeAddress
        binding.tvExperience.text = app.previousPetExperience.orFallback()
        binding.tvWhyAdopt.text = app.whyAdopt.orFallback()
        binding.tvWhyChosen.text = app.whyChooseYou.orFallback()
        binding.tvSubmittedAt.text = "Submitted: ${app.submittedAt?.formatDateTime() ?: "N/A"}"
        binding.tvUpdatedAt.text = "Updated: ${app.updatedAt?.formatDateTime() ?: "N/A"}"

        ImageLoader.loadPetImage(context, app.petImageUrl, binding.ivPetImage)

        val adminRemark = app.adminRemark?.trim().orEmpty()
        binding.layoutAdminRemark.visibility = if (adminRemark.isNotEmpty()) android.view.View.VISIBLE else android.view.View.GONE
        binding.tvAdminRemark.text = adminRemark

        val statusUi = when (app.status) {
            "Approved" -> StatusUi(
                label = "Approved",
                iconRes = R.drawable.ic_check_circle,
                textColor = context.getColor(R.color.status_available),
                backgroundColor = context.getColor(R.color.status_available_soft),
                bannerBackground = context.getColor(R.color.status_available_soft),
                bannerStroke = context.getColor(R.color.status_available),
                bannerText = "Congratulations! Your application has been approved! The shelter will contact you within 3-5 business days."
            )
            "Rejected" -> StatusUi(
                label = "Rejected",
                iconRes = R.drawable.ic_error_circle,
                textColor = context.getColor(R.color.status_rejected),
                backgroundColor = context.getColor(R.color.status_rejected_soft),
                bannerBackground = context.getColor(R.color.status_rejected_soft),
                bannerStroke = context.getColor(R.color.status_rejected),
                bannerText = "Unfortunately your application was not approved this time. Consider reaching out to the shelter for feedback."
            )
            else -> StatusUi(
                label = "Pending",
                iconRes = R.drawable.ic_info,
                textColor = context.getColor(R.color.status_pending),
                backgroundColor = context.getColor(R.color.status_pending_soft),
                bannerBackground = context.getColor(R.color.status_pending_soft),
                bannerStroke = context.getColor(R.color.status_pending),
                bannerText = "Your application is still pending review. The shelter will update you as soon as a decision is made."
            )
        }

        binding.tvStatus.text = statusUi.label
        binding.ivStatusIcon.setImageResource(statusUi.iconRes)
        binding.ivStatusIcon.imageTintList = ColorStateList.valueOf(statusUi.textColor)
        binding.tvStatus.setTextColor(statusUi.textColor)
        ViewCompat.setBackgroundTintList(binding.statusChip, ColorStateList.valueOf(statusUi.backgroundColor))

        binding.cardStatusMessage.setCardBackgroundColor(statusUi.bannerBackground)
        binding.cardStatusMessage.strokeColor = statusUi.bannerStroke
        binding.tvStatusMessage.text = statusUi.bannerText
        binding.tvStatusMessage.setTextColor(statusUi.textColor)

        binding.btnCloseTop.setOnClickListener { dialog.dismiss() }
        binding.btnCloseBottom.setOnClickListener { dialog.dismiss() }
    }

    private fun String?.orFallback(): String = this?.takeIf { it.isNotBlank() } ?: "Not provided"

    private data class StatusUi(
        val label: String,
        val iconRes: Int,
        val textColor: Int,
        val backgroundColor: Int,
        val bannerBackground: Int,
        val bannerStroke: Int,
        val bannerText: String
    )
}
