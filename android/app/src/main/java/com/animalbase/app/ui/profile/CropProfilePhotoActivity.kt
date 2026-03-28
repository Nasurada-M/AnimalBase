package com.animalbase.app.ui.profile

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.animalbase.app.databinding.ActivityCropProfilePhotoBinding
import com.animalbase.app.utils.showToast
import java.io.File
import java.io.FileOutputStream
import java.util.Locale

class CropProfilePhotoActivity : AppCompatActivity() {

    companion object {
        private const val EXTRA_SOURCE_URI = "source_uri"
        private const val EXTRA_SOURCE_PATH = "source_path"
        const val EXTRA_CROPPED_PATH = "cropped_path"
        private const val MAX_BITMAP_DIMENSION = 2048

        fun createIntent(context: Context, sourceUri: Uri): Intent {
            return Intent(context, CropProfilePhotoActivity::class.java).apply {
                data = sourceUri
                clipData = ClipData.newUri(context.contentResolver, "profile_source", sourceUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                putExtra(EXTRA_SOURCE_URI, sourceUri.toString())
            }
        }

        fun createIntent(context: Context, sourceFile: File): Intent {
            return Intent(context, CropProfilePhotoActivity::class.java).apply {
                putExtra(EXTRA_SOURCE_PATH, sourceFile.absolutePath)
            }
        }
    }

    private lateinit var binding: ActivityCropProfilePhotoBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCropProfilePhotoBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.setNavigationOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }

        binding.btnCancel.setOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }

        binding.btnResetCrop.setOnClickListener {
            binding.profileCropView.resetCrop()
        }

        binding.sliderZoom.addOnChangeListener { _, value, fromUser ->
            if (fromUser) {
                binding.profileCropView.setZoom(value)
            }
            binding.tvZoomValue.text = String.format(Locale.US, "%.2fx", value)
        }

        binding.profileCropView.setOnZoomChangedListener { zoom ->
            if (kotlin.math.abs(binding.sliderZoom.value - zoom) > 0.01f) {
                binding.sliderZoom.value = zoom
            }
            binding.tvZoomValue.text = String.format(Locale.US, "%.2fx", zoom)
        }

        binding.btnUsePhoto.setOnClickListener {
            exportCrop()
        }

        val sourceFile = intent.getStringExtra(EXTRA_SOURCE_PATH)
            ?.takeIf { it.isNotBlank() }
            ?.let(::File)
        val sourceUri = intent.data ?: intent.getStringExtra(EXTRA_SOURCE_URI)?.let(Uri::parse)
        if (sourceFile == null && sourceUri == null) {
            showToast("Unable to open the selected image")
            finish()
            return
        }

        val bitmap = sourceFile?.let(::decodeScaledBitmap) ?: sourceUri?.let(::decodeScaledBitmap)
        if (bitmap == null) {
            sourceFile?.delete()
            showToast("Unable to load the selected image")
            finish()
            return
        }

        binding.profileCropView.setImageBitmap(bitmap)
        sourceFile?.delete()
        binding.sliderZoom.value = binding.profileCropView.getZoom()
        binding.tvZoomValue.text = String.format(Locale.US, "%.2fx", binding.profileCropView.getZoom())
    }

    private fun decodeScaledBitmap(file: File): Bitmap? {
        if (!file.exists()) return null

        val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, boundsOptions)
        if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) return null

        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = calculateSampleSize(boundsOptions)
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }

        return BitmapFactory.decodeFile(file.absolutePath, decodeOptions)
    }

    private fun decodeScaledBitmap(uri: Uri): Bitmap? {
        val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, boundsOptions)
        } ?: return null
        if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) return null

        val sampleSize = calculateSampleSize(boundsOptions)
        val decodeOptions = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }

        return contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, decodeOptions)
        }
    }

    private fun calculateSampleSize(options: BitmapFactory.Options): Int {
        var sampleSize = 1
        var width = options.outWidth
        var height = options.outHeight

        while (width / sampleSize > MAX_BITMAP_DIMENSION || height / sampleSize > MAX_BITMAP_DIMENSION) {
            sampleSize *= 2
        }

        return sampleSize.coerceAtLeast(1)
    }

    private fun exportCrop() {
        val croppedBitmap = binding.profileCropView.exportCroppedBitmap()
        if (croppedBitmap == null) {
            showToast("Unable to crop image")
            return
        }

        runCatching {
            val outputFile = File.createTempFile("profile_crop_", ".jpg", cacheDir)
            FileOutputStream(outputFile).use { stream ->
                croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 92, stream)
            }
            setResult(
                RESULT_OK,
                Intent().putExtra(EXTRA_CROPPED_PATH, outputFile.absolutePath)
            )
            finish()
        }.onFailure {
            showToast(it.message ?: "Unable to save cropped image")
        }
    }
}
