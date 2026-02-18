package com.animalbase.app.ui.adoption

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import com.animalbase.app.databinding.ItemPetCardBinding
import com.animalbase.app.models.Pet
import com.animalbase.app.utils.ImageLoader

class PetAdapter(
    private val pets: List<Pet>,
    private val onClick: (Pet) -> Unit
) : RecyclerView.Adapter<PetAdapter.ViewHolder>() {

    inner class ViewHolder(val binding: ItemPetCardBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemPetCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val pet = pets[position]
        val ctx = holder.itemView.context
        with(holder.binding) {
            tvPetName.text = pet.petName
            tvPetBreed.text = "${pet.breed ?: "Mixed"} · ${pet.petType}"
            tvPetGender.text = pet.gender ?: ""
            tvPetAge.text = if (pet.ageMonths != null) "${pet.ageMonths / 12}y ${pet.ageMonths % 12}m"
                           else pet.ageCategory ?: ""
            tvPetStatus.text = pet.status

            // Status badge color
            // ======================================================
            // STATUS COLORS: Change in colors.xml
            //   status_available, status_pending, status_adopted, status_rejected
            // ======================================================
            val statusColor = when (pet.status) {
                "Available" -> ctx.getColor(R.color.status_available)
                "Pending" -> ctx.getColor(R.color.status_pending)
                "Adopted" -> ctx.getColor(R.color.status_adopted)
                "Rejected" -> ctx.getColor(R.color.status_rejected)
                else -> ctx.getColor(R.color.text_secondary)
            }
            tvPetStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(statusColor)

            // Load image (first photo URL or null)
            val imageUrl = pet.photoUrls?.firstOrNull() ?: pet.photos?.firstOrNull()
            ImageLoader.loadPetImage(ctx, imageUrl, ivPetImage)

            root.setOnClickListener { onClick(pet) }
        }
    }

    override fun getItemCount() = pets.size
}
