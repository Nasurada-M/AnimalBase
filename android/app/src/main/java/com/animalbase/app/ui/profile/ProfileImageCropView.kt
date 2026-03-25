package com.animalbase.app.ui.profile

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import androidx.core.content.ContextCompat
import com.animalbase.app.R
import kotlin.math.max
import kotlin.math.min

class ProfileImageCropView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)
    private val overlayPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.overlay_dark)
    }
    private val framePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = dp(3f)
    }
    private val guidePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = dp(1f)
        alpha = 120
    }
    private val overlayPath = Path()
    private val drawMatrix = Matrix()
    private val cropRect = RectF()
    private val cropRadius = dp(28f)
    private val framePadding = dp(24f)
    private val maxZoom = 4f

    private var bitmap: Bitmap? = null
    private var baseScale = 1f
    private var zoom = 1f
    private var translationX = 0f
    private var translationY = 0f
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var isDragging = false
    private var zoomChangedListener: ((Float) -> Unit)? = null

    private val scaleGestureDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val nextZoom = (zoom * detector.scaleFactor).coerceIn(1f, maxZoom)
                applyZoom(nextZoom, detector.focusX, detector.focusY)
                return true
            }
        }
    )

    fun setImageBitmap(nextBitmap: Bitmap) {
        bitmap = nextBitmap
        resetCrop()
    }

    fun resetCrop() {
        val source = bitmap ?: return
        if (width == 0 || height == 0) return

        updateCropRect()
        baseScale = max(cropRect.width() / source.width, cropRect.height() / source.height)
        zoom = 1f

        val displayWidth = source.width * baseScale
        val displayHeight = source.height * baseScale

        translationX = cropRect.centerX() - displayWidth / 2f
        translationY = cropRect.centerY() - displayHeight / 2f

        constrainTranslation()
        updateMatrix()
        zoomChangedListener?.invoke(zoom)
        invalidate()
    }

    fun setZoom(nextZoom: Float) {
        applyZoom(nextZoom.coerceIn(1f, maxZoom), cropRect.centerX(), cropRect.centerY())
    }

    fun setOnZoomChangedListener(listener: (Float) -> Unit) {
        zoomChangedListener = listener
    }

    fun getZoom(): Float = zoom

    fun exportCroppedBitmap(outputSize: Int = 1080): Bitmap? {
        val source = bitmap ?: return null
        if (cropRect.width() <= 0f) return null

        val result = Bitmap.createBitmap(outputSize, outputSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(result)
        val exportMatrix = Matrix(drawMatrix)
        val ratio = outputSize / cropRect.width()

        exportMatrix.postTranslate(-cropRect.left, -cropRect.top)
        exportMatrix.postScale(ratio, ratio)

        canvas.drawBitmap(source, exportMatrix, imagePaint)
        return result
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        updateCropRect()
        if (bitmap != null) {
            resetCrop()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        bitmap?.let { canvas.drawBitmap(it, drawMatrix, imagePaint) }

        overlayPath.reset()
        overlayPath.fillType = Path.FillType.EVEN_ODD
        overlayPath.addRect(0f, 0f, width.toFloat(), height.toFloat(), Path.Direction.CW)
        overlayPath.addRoundRect(cropRect, cropRadius, cropRadius, Path.Direction.CCW)
        canvas.drawPath(overlayPath, overlayPaint)

        val thirdWidth = cropRect.width() / 3f
        val thirdHeight = cropRect.height() / 3f
        canvas.drawRoundRect(cropRect, cropRadius, cropRadius, framePaint)
        canvas.drawLine(cropRect.left + thirdWidth, cropRect.top, cropRect.left + thirdWidth, cropRect.bottom, guidePaint)
        canvas.drawLine(cropRect.left + thirdWidth * 2f, cropRect.top, cropRect.left + thirdWidth * 2f, cropRect.bottom, guidePaint)
        canvas.drawLine(cropRect.left, cropRect.top + thirdHeight, cropRect.right, cropRect.top + thirdHeight, guidePaint)
        canvas.drawLine(cropRect.left, cropRect.top + thirdHeight * 2f, cropRect.right, cropRect.top + thirdHeight * 2f, guidePaint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (bitmap == null) return false

        scaleGestureDetector.onTouchEvent(event)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                parent?.requestDisallowInterceptTouchEvent(true)
                isDragging = true
                lastTouchX = event.x
                lastTouchY = event.y
                return true
            }

            MotionEvent.ACTION_MOVE -> {
                if (!scaleGestureDetector.isInProgress && isDragging) {
                    val deltaX = event.x - lastTouchX
                    val deltaY = event.y - lastTouchY

                    translationX += deltaX
                    translationY += deltaY
                    constrainTranslation()
                    updateMatrix()
                    invalidate()

                    lastTouchX = event.x
                    lastTouchY = event.y
                }
                return true
            }

            MotionEvent.ACTION_UP,
            MotionEvent.ACTION_CANCEL -> {
                isDragging = false
                parent?.requestDisallowInterceptTouchEvent(false)
                return true
            }
        }

        return super.onTouchEvent(event)
    }

    private fun applyZoom(nextZoom: Float, focusX: Float, focusY: Float) {
        if (bitmap == null || cropRect.width() <= 0f) return

        val clampedZoom = nextZoom.coerceIn(1f, maxZoom)
        if (clampedZoom == zoom) return

        val scaleFactor = clampedZoom / zoom
        translationX = focusX - ((focusX - translationX) * scaleFactor)
        translationY = focusY - ((focusY - translationY) * scaleFactor)
        zoom = clampedZoom

        constrainTranslation()
        updateMatrix()
        zoomChangedListener?.invoke(zoom)
        invalidate()
    }

    private fun constrainTranslation() {
        val source = bitmap ?: return
        val displayedWidth = source.width * baseScale * zoom
        val displayedHeight = source.height * baseScale * zoom

        translationX = if (displayedWidth <= cropRect.width()) {
            cropRect.centerX() - displayedWidth / 2f
        } else {
            translationX.coerceIn(cropRect.right - displayedWidth, cropRect.left)
        }

        translationY = if (displayedHeight <= cropRect.height()) {
            cropRect.centerY() - displayedHeight / 2f
        } else {
            translationY.coerceIn(cropRect.bottom - displayedHeight, cropRect.top)
        }
    }

    private fun updateMatrix() {
        val source = bitmap ?: return
        drawMatrix.reset()
        val scale = baseScale * zoom
        drawMatrix.postScale(scale, scale)
        drawMatrix.postTranslate(translationX, translationY)
    }

    private fun updateCropRect() {
        val availableSize = min(width - framePadding * 2f, height - framePadding * 2f)
        val safeSize = max(availableSize, 0f)
        val left = (width - safeSize) / 2f
        val top = (height - safeSize) / 2f
        cropRect.set(left, top, left + safeSize, top + safeSize)
    }

    private fun dp(value: Float): Float = value * resources.displayMetrics.density
}
