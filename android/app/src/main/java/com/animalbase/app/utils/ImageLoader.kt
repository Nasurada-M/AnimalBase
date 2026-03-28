package com.animalbase.app.utils

import android.content.Context
import android.util.Base64
import android.widget.ImageView
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import java.net.URI

object ImageLoader {

    private val localAssetHosts = setOf(
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "10.0.2.2",
        "10.0.3.2",
        "::1",
        "[::1]"
    )

    private fun resolveImageSource(context: Context, url: String?): Any? {
        val normalized = url?.trim().orEmpty()
        if (normalized.isEmpty()) return null

        if (normalized.startsWith("data:image/", ignoreCase = true)) {
            val commaIndex = normalized.indexOf(',')
            if (commaIndex in 1 until normalized.lastIndex) {
                return try {
                    Base64.decode(normalized.substring(commaIndex + 1), Base64.DEFAULT)
                } catch (_: IllegalArgumentException) {
                    normalized
                }
            }
        }

        if (normalized.startsWith("/uploads/")) {
            return "${RetrofitClient.getApiRootUrl(context)}$normalized"
        }

        if (normalized.startsWith("uploads/")) {
            return "${RetrofitClient.getApiRootUrl(context)}/$normalized"
        }

        val uri = runCatching { URI(normalized) }.getOrNull()
        val host = uri?.host?.lowercase()
        val path = uri?.path.orEmpty()
        if (host != null && host in localAssetHosts && path.startsWith("/uploads/")) {
            return "${RetrofitClient.getApiRootUrl(context)}$path"
        }

        return normalized
    }

    fun loadPetImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(imageView)
            .load(resolveImageSource(context, url))
            .placeholder(R.drawable.ic_placeholder_pet)
            .error(R.drawable.ic_placeholder_pet)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .centerCrop()
            .into(imageView)
    }

    fun loadPetDetailImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(imageView)
            .load(resolveImageSource(context, url))
            .placeholder(R.drawable.ic_placeholder_pet)
            .error(R.drawable.ic_placeholder_pet)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .fitCenter()
            .into(imageView)
    }

    fun loadProfileImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(imageView)
            .load(resolveImageSource(context, url))
            .placeholder(R.drawable.ic_placeholder_person)
            .error(R.drawable.ic_placeholder_person)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .circleCrop()
            .into(imageView)
    }

    fun loadProfileCardImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(imageView)
            .load(resolveImageSource(context, url))
            .placeholder(R.drawable.ic_placeholder_person)
            .error(R.drawable.ic_placeholder_person)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .centerCrop()
            .into(imageView)
    }

    fun loadAnimalImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(imageView)
            .load(resolveImageSource(context, url))
            .placeholder(R.drawable.ic_placeholder_pet)
            .error(R.drawable.ic_placeholder_pet)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .centerCrop()
            .into(imageView)
    }

    fun loadPreviewImage(context: Context, url: String?, imageView: ImageView) {
        Glide.with(imageView)
            .load(resolveImageSource(context, url))
            .placeholder(R.drawable.ic_placeholder_pet)
            .error(R.drawable.ic_placeholder_pet)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .fitCenter()
            .into(imageView)
    }

    fun loadAnyImage(context: Context, url: String?, imageView: ImageView, placeholderRes: Int = R.drawable.ic_placeholder_pet) {
        Glide.with(imageView)
            .load(resolveImageSource(context, url))
            .placeholder(placeholderRes)
            .error(placeholderRes)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .into(imageView)
    }
}
