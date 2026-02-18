package com.animalbase.app.utils

import android.content.Context
import android.widget.ImageView
import com.animalbase.app.R
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.request.RequestOptions

/**
 * ImageLoader utility
 *
 * ======================================================
 * TO CHANGE PLACEHOLDER IMAGES:
 *
 * Pet placeholder (line ~22):
 *   Change R.drawable.ic_placeholder_pet
 *   → Replace with your own drawable resource
 *   → OR replace the file res/drawable/ic_placeholder_pet.xml
 *
 * Person placeholder (line ~34):
 *   Change R.drawable.ic_placeholder_person
 *   → Replace with your own drawable resource
 *   → OR replace the file res/drawable/ic_placeholder_person.xml
 *
 * Animal encyclopedia placeholder (line ~46):
 *   Change R.drawable.ic_placeholder_pet (same as pet)
 * ======================================================
 */
object ImageLoader {

    fun loadPetImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(context)
            .load(url)
            // ← CHANGE PLACEHOLDER: replace R.drawable.ic_placeholder_pet
            .placeholder(R.drawable.ic_placeholder_pet)
            .error(R.drawable.ic_placeholder_pet)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .centerCrop()
            .into(imageView)
    }

    fun loadProfileImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(context)
            .load(url)
            // ← CHANGE PLACEHOLDER: replace R.drawable.ic_placeholder_person
            .placeholder(R.drawable.ic_placeholder_person)
            .error(R.drawable.ic_placeholder_person)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .circleCrop()
            .into(imageView)
    }

    fun loadAnimalImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(context)
            .load(url)
            // ← CHANGE PLACEHOLDER: replace R.drawable.ic_placeholder_pet
            .placeholder(R.drawable.ic_placeholder_pet)
            .error(R.drawable.ic_placeholder_pet)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .centerCrop()
            .into(imageView)
    }

    fun loadAnyImage(context: Context, url: String?, imageView: ImageView, placeholderRes: Int = R.drawable.ic_placeholder_pet) {
        Glide.with(context)
            .load(url)
            .placeholder(placeholderRes)
            .error(placeholderRes)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .into(imageView)
    }
}
