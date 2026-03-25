package com.animalbase.app.ui.encyclopedia

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.animalbase.app.databinding.ItemAnimalCardBinding
import com.animalbase.app.models.Animal
import com.animalbase.app.utils.ImageLoader

class AnimalAdapter(
    private val animals: List<Animal>,
    private val onClick: (Animal) -> Unit
) : RecyclerView.Adapter<AnimalAdapter.ViewHolder>() {

    inner class ViewHolder(val binding: ItemAnimalCardBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAnimalCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val animal = animals[position]
        with(holder.binding) {
            tvAnimalName.text = animal.commonName
            tvScientificName.text = animal.scientificName ?: ""
            tvCategory.text = animal.category ?: ""
            tvConservationStatus.text = animal.conservationStatus ?: "Unknown"
            val imageUrl = animal.photos?.firstOrNull()
            ImageLoader.loadAnimalImage(holder.itemView.context, imageUrl, ivAnimalImage)
            root.setOnClickListener { onClick(animal) }
        }
    }

    override fun getItemCount() = animals.size
}
