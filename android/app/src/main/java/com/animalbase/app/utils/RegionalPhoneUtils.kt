package com.animalbase.app.utils

import android.text.Editable
import android.text.InputFilter
import android.text.TextWatcher
import android.widget.EditText

data class PhoneRegionOption(
    val code: String,
    val label: String,
    val dialCode: String,
    val minLocalDigits: Int,
    val maxLocalDigits: Int,
    val placeholder: String,
    val dropLeadingZero: Boolean = false,
) {
    override fun toString(): String = dialCode
}

object RegionalPhoneUtils {
    val regions: List<PhoneRegionOption> = listOf(
        PhoneRegionOption(
            code = "PH",
            label = "Philippines",
            dialCode = "+63",
            minLocalDigits = 11,
            maxLocalDigits = 11,
            placeholder = "09123456789",
            dropLeadingZero = true,
        ),
    )

    fun defaultRegion(): PhoneRegionOption = regions.first()

    private fun digitsOnlyInputFilter(): InputFilter = InputFilter { source, start, end, _, _, _ ->
        val filtered = buildString {
            for (index in start until end) {
                val character = source[index]
                if (character.isDigit()) {
                    append(character)
                }
            }
        }

        when {
            filtered.length == end - start -> null
            filtered.isEmpty() -> ""
            else -> filtered
        }
    }

    fun bindLocalPhoneInput(
        editText: EditText,
        regionProvider: () -> PhoneRegionOption = ::defaultRegion
    ) {
        editText.filters = arrayOf(digitsOnlyInputFilter())

        editText.addTextChangedListener(object : TextWatcher {
            private var isUpdating = false

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

            override fun afterTextChanged(s: Editable?) {
                if (isUpdating) return

                val region = regionProvider()
                val current = s?.toString().orEmpty()
                val sanitized = sanitizeLocalNumber(current, region)
                if (current == sanitized) return

                isUpdating = true
                editText.setText(sanitized)
                editText.setSelection(sanitized.length)
                isUpdating = false
            }
        })

        val region = regionProvider()
        editText.hint = region.placeholder
        val current = editText.text?.toString().orEmpty()
        val sanitized = sanitizeLocalNumber(current, region)
        if (current != sanitized) {
            editText.setText(sanitized)
            editText.setSelection(sanitized.length)
        }
    }

    fun sanitizeLocalNumber(value: String, region: PhoneRegionOption = defaultRegion()): String {
        val digitsOnly = value.filter { it.isDigit() }

        return when {
            digitsOnly.startsWith("63") -> "0${digitsOnly.drop(2)}".take(region.maxLocalDigits)
            digitsOnly.startsWith("9") -> "0$digitsOnly".take(region.maxLocalDigits)
            else -> digitsOnly.take(region.maxLocalDigits)
        }
    }

    fun isValidLocalNumber(value: String, region: PhoneRegionOption = defaultRegion()): Boolean =
        Regex("^09\\d{9}$").matches(sanitizeLocalNumber(value, region))

    fun formatInternationalNumber(value: String, region: PhoneRegionOption = defaultRegion()): String {
        val sanitized = sanitizeLocalNumber(value, region)
        if (sanitized.isBlank()) return ""

        return if (region.dropLeadingZero && sanitized.startsWith("0")) {
            "${region.dialCode} ${sanitized.drop(1)}"
        } else {
            "${region.dialCode} $sanitized"
        }
    }

    fun validationMessage(region: PhoneRegionOption = defaultRegion()): String =
        "Enter a valid ${region.label} mobile number with 11 digits, starting with 09."
}
