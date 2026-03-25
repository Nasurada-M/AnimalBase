package com.animalbase.app.ui.applications

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.R
import com.animalbase.app.databinding.ItemApplicationCardBinding
import com.animalbase.app.models.AdoptionApplication
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.formatDateTime

class ApplicationCardAdapter(
    private val onClick: (AdoptionApplication) -> Unit
) : RecyclerView.Adapter<ApplicationCardAdapter.ViewHolder>() {

    private val items = mutableListOf<AdoptionApplication>()

    inner class ViewHolder(val binding: ItemApplicationCardBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemApplicationCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        val context = holder.itemView.context

        with(holder.binding) {
            tvPetName.text = item.petName ?: "Pet #${item.petId}"
            tvPetType.text = item.petType ?: "Application"
            tvDate.text = "Submitted ${item.submittedAt?.formatDateTime() ?: ""}"
            tvStatus.text = item.status

            val tint = when (item.status) {
                "Approved" -> context.getColor(R.color.status_found)
                "Rejected" -> context.getColor(R.color.status_missing)
                else -> context.getColor(R.color.status_pending)
            }
            tvStatus.backgroundTintList = ColorStateList.valueOf(tint)

            ImageLoader.loadPetImage(context, item.petImageUrl, ivPetImage)
            root.setOnClickListener { onClick(item) }
        }
    }

    override fun getItemCount(): Int = items.size

    fun submitList(applications: List<AdoptionApplication>) {
        items.clear()
        items.addAll(applications)
        notifyDataSetChanged()
    }
}
