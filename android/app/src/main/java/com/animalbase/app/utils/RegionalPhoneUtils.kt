package com.animalbase.app.utils

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
