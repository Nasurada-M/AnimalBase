package com.animalbase.app.utils

import android.app.DatePickerDialog
import android.content.Context
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.animalbase.app.R
import com.google.android.material.snackbar.Snackbar
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.SimpleDateFormat
import java.util.*

fun Context.showToast(message: String) {
    Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
}

fun View.showSnackbar(message: String, isError: Boolean = false) {
    val snack = Snackbar.make(this, message, Snackbar.LENGTH_LONG)
    snack.show()
}

fun View.visible() { visibility = View.VISIBLE }
fun View.gone() { visibility = View.GONE }
fun View.invisible() { visibility = View.INVISIBLE }

fun Context.showDatePicker(initialValue: String? = null, onDateSelected: (String) -> Unit) {
    val cal = Calendar.getInstance()

    if (ValidationUtils.isValidDate(initialValue.orEmpty())) {
        runCatching {
            val parts = initialValue.orEmpty().split("-")
            cal.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
        }
    }

    val dialog = DatePickerDialog(this, { _, y, m, d ->
        val formatted = String.format("%04d-%02d-%02d", y, m + 1, d)
        onDateSelected(formatted)
    }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH))

    dialog.setButton(DatePickerDialog.BUTTON_NEUTRAL, getString(R.string.today)) { _, _ ->
        val today = Calendar.getInstance()
        val formatted = String.format(
            "%04d-%02d-%02d",
            today.get(Calendar.YEAR),
            today.get(Calendar.MONTH) + 1,
            today.get(Calendar.DAY_OF_MONTH)
        )
        onDateSelected(formatted)
    }

    dialog.show()
}

fun View.tintRequiredAsterisks() {
    tintRequiredAsterisksRecursive(this, ContextCompat.getColor(context, R.color.error))
}

private fun tintRequiredAsterisksRecursive(view: View, color: Int) {
    if (view is TextView) {
        val originalText = view.text?.toString().orEmpty()
        if (originalText.contains('*')) {
            val spannable = SpannableString(originalText)
            originalText.forEachIndexed { index, character ->
                if (character == '*') {
                    spannable.setSpan(
                        ForegroundColorSpan(color),
                        index,
                        index + 1,
                        Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
                    )
                }
            }
            view.text = spannable
        }
    }

    if (view is ViewGroup) {
        for (index in 0 until view.childCount) {
            tintRequiredAsterisksRecursive(view.getChildAt(index), color)
        }
    }
}

fun String.formatDisplayDate(): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val formatter = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        formatter.format(parser.parse(this) ?: return this)
    } catch (e: Exception) { this }
}

fun String.formatDateTime(): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        val formatter = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        formatter.format(parser.parse(this) ?: return this)
    } catch (e: Exception) { this }
}

fun String.formatNotificationTimestamp(): String {
    val parsedDate = parseIsoTimestamp(this) ?: return this
    val now = Date()
    val diffMillis = (now.time - parsedDate.time).coerceAtLeast(0L)
    val minuteMillis = 60_000L
    val hourMillis = 60 * minuteMillis
    val dayMillis = 24 * hourMillis

    return when {
        diffMillis < minuteMillis -> "Just now"
        diffMillis < hourMillis -> "${diffMillis / minuteMillis}m ago"
        diffMillis < dayMillis -> "${diffMillis / hourMillis}h ago"
        diffMillis < 2 * dayMillis -> "Yesterday"
        diffMillis < 7 * dayMillis -> "${diffMillis / dayMillis}d ago"
        else -> SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault()).format(parsedDate)
    }
}

private fun parseIsoTimestamp(value: String): Date? {
    val patterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ssXXX"
    )

    for (pattern in patterns) {
        val parsed = runCatching {
            SimpleDateFormat(pattern, Locale.US).apply {
                isLenient = false
                if (pattern.endsWith("'Z'")) {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
            }.parse(value)
        }.getOrNull()

        if (parsed != null) {
            return parsed
        }
    }

    return null
}

fun okhttp3.RequestBody.Companion.toRequestBody(value: String): okhttp3.RequestBody {
    return value.toRequestBody("text/plain".toMediaTypeOrNull())
}
