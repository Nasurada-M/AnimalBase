package com.animalbase.app.ui.common

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.core.view.isVisible
import com.animalbase.app.databinding.ActivityImagePreviewBinding
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.ImageLoader

class ImagePreviewActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityImagePreviewBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityImagePreviewBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val imageUrl = intent.getStringExtra(EXTRA_IMAGE_URL)
        if (imageUrl.isNullOrBlank()) {
            finish()
            return
        }

        val imageTitle = intent.getStringExtra(EXTRA_IMAGE_TITLE)?.takeIf { it.isNotBlank() }
        binding.tvImagePreviewTitle.isVisible = imageTitle != null
        binding.tvImagePreviewTitle.text = imageTitle
        binding.btnClose.setOnClickListener { finish() }

        ImageLoader.loadPreviewImage(this, imageUrl, binding.ivImagePreview)
    }

    companion object {
        private const val EXTRA_IMAGE_URL = "image_url"
        private const val EXTRA_IMAGE_TITLE = "image_title"

        fun open(context: Context, imageUrl: String, imageTitle: String? = null) {
            context.startActivity(
                Intent(context, ImagePreviewActivity::class.java).apply {
                    putExtra(EXTRA_IMAGE_URL, imageUrl)
                    putExtra(EXTRA_IMAGE_TITLE, imageTitle)
                }
            )
        }
    }
}
