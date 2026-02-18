package com.animalbase.app.utils

import android.app.DatePickerDialog
import android.content.Context
import android.view.View
import android.widget.Toast
import com.google.android.material.snackbar.Snackbar
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

fun Context.showDatePicker(onDateSelected: (String) -> Unit) {
    val cal = Calendar.getInstance()
    DatePickerDialog(this, { _, y, m, d ->
        val formatted = String.format("%04d-%02d-%02d", y, m + 1, d)
        onDateSelected(formatted)
    }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
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

fun okhttp3.RequestBody.Companion.toRequestBody(value: String): okhttp3.RequestBody {
    return value.toRequestBody(okhttp3.MediaType.parse("text/plain"))
}
