package com.animalbase.app.ui.adoption

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import com.animalbase.app.databinding.ItemPetCardBinding
import com.animalbase.app.models.Pet
import com.animalbase.app.utils.ImageLoader

class PetAdapter(
    private val pets: List<Pet>,
    private val fillCellWidth: Boolean = false,
    private val onClick: (Pet) -> Unit
) : RecyclerView.Adapter<PetAdapter.ViewHolder>() {

    inner class ViewHolder(val binding: ItemPetCardBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemPetCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        if (fillCellWidth) {
            val originalParams = binding.root.layoutParams
            val updatedParams = RecyclerView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                originalParams?.height ?: ViewGroup.LayoutParams.WRAP_CONTENT
            )
            if (originalParams is ViewGroup.MarginLayoutParams) {
                updatedParams.setMargins(
                    originalParams.leftMargin,
                    originalParams.topMargin,
                    originalParams.rightMargin,
                    originalParams.bottomMargin
                )
            }
            binding.root.layoutParams = updatedParams
        }
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val pet = pets[position]
        val ctx = holder.itemView.context
        val ageMonths = pet.ageMonths

        with(holder.binding) {
            tvPetName.text = pet.petName
            tvPetBreed.text = "${pet.breed ?: "Mixed"} · ${pet.petType}"
            tvPetGender.text = pet.gender ?: ""
            tvPetAge.text = if (ageMonths != null) {
                "${ageMonths / 12}y ${ageMonths % 12}m"
            } else {
                pet.ageCategory ?: ""
            }
            tvPetStatus.text = pet.status

            val statusColor = when (pet.status) {
                "Available" -> ctx.getColor(R.color.status_available)
                "Pending" -> ctx.getColor(R.color.status_pending)
                "Adopted" -> ctx.getColor(R.color.status_adopted)
                "Rejected" -> ctx.getColor(R.color.status_rejected)
                else -> ctx.getColor(R.color.text_secondary)
            }
            tvPetStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(statusColor)

            val imageUrl = pet.photoUrls.firstOrNull() ?: pet.photos.firstOrNull()
            ImageLoader.loadPetImage(ctx, imageUrl, ivPetImage)

            root.setOnClickListener { onClick(pet) }
        }
    }

    override fun getItemCount() = pets.size
}
