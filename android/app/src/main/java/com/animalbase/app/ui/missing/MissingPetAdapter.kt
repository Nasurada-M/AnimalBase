package com.animalbase.app.ui.missing

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import com.animalbase.app.databinding.ItemMissingPetBinding
import com.animalbase.app.models.MissingPet
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.PhpCurrencyFormatter

class MissingPetAdapter(
    private val onView: (MissingPet) -> Unit,
    private val onSighting: (MissingPet) -> Unit,
    private val isOwner: (MissingPet) -> Boolean = { false }
) : RecyclerView.Adapter<MissingPetAdapter.ViewHolder>() {

    private val pets = mutableListOf<MissingPet>()

    inner class ViewHolder(val binding: ItemMissingPetBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemMissingPetBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val pet = pets[position]
        val context = holder.itemView.context

        with(holder.binding) {
            tvMissingPetName.text = pet.petName
            tvMissingPetBreed.text = listOfNotNull(pet.breed, pet.petType).joinToString(" · ")
            tvLastSeen.text = pet.locationLastSeen ?: "Last seen location unavailable"

            tvMissingStatus.text = pet.status
            val tint = when (pet.status) {
                "Found" -> context.getColor(R.color.status_found)
                else -> context.getColor(R.color.status_missing)
            }
            tvMissingStatus.backgroundTintList = ColorStateList.valueOf(tint)

            val reward = PhpCurrencyFormatter.formatRewardValue(pet.rewardOffered)
            cardReward.visibility = if (reward != null) android.view.View.VISIBLE else android.view.View.GONE
            tvReward.text = reward

            ImageLoader.loadPetImage(
                context,
                pet.photoUrls.firstOrNull() ?: pet.photos.firstOrNull() ?: pet.imageUrl,
                ivMissingPetImage
            )

            root.setOnClickListener { onView(pet) }
            btnView.setOnClickListener { onView(pet) }
            btnSighting.visibility = if (pet.status == "Missing" && !isOwner(pet)) android.view.View.VISIBLE else android.view.View.GONE
            btnSighting.setOnClickListener { onSighting(pet) }
        }
    }

    override fun getItemCount(): Int = pets.size

    fun submitList(items: List<MissingPet>) {
        pets.clear()
        pets.addAll(items)
        notifyDataSetChanged()
    }
}
