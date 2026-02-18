package com.animalbase.app.ui.missing

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import com.animalbase.app.databinding.ItemMissingPetBinding
import com.animalbase.app.models.MissingPet
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.formatDisplayDate

class MissingPetAdapter(
    private val pets: List<MissingPet>,
    private val onClick: (MissingPet) -> Unit
) : RecyclerView.Adapter<MissingPetAdapter.ViewHolder>() {

    inner class ViewHolder(val binding: ItemMissingPetBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemMissingPetBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val pet = pets[position]
        val ctx = holder.itemView.context
        with(holder.binding) {
            tvMissingPetName.text = pet.petName
            tvMissingPetBreed.text = "${pet.breed ?: "Mixed"} · ${pet.petType}"
            tvLastSeen.text = "Last seen: ${pet.locationLastSeen}"
            tvReportDate.text = "Reported: ${pet.createdAt?.formatDisplayDate() ?: ""}"
            tvMissingStatus.text = pet.status

            val statusColor = when (pet.status) {
                "Missing" -> ctx.getColor(R.color.status_missing)
                "Found" -> ctx.getColor(R.color.status_found)
                else -> ctx.getColor(R.color.text_secondary)
            }
            tvMissingStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(statusColor)

            val imageUrl = pet.photoUrls?.firstOrNull() ?: pet.photos?.firstOrNull()
            ImageLoader.loadPetImage(ctx, imageUrl, ivMissingPetImage)
            root.setOnClickListener { onClick(pet) }
        }
    }

    override fun getItemCount() = pets.size
}
