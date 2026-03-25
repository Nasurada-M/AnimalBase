package com.animalbase.app.utils

/**
 * ValidationUtils: Client-side format checks matching backend validation rules
 * Mirrors the express-validator rules in backend/src/routes/auth.js
 */
object ValidationUtils {

    fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    /**
     * Password requirements (must match backend validation):
     * - Minimum 8 characters
     * - At least 1 uppercase letter
     * - At least 1 number
     * - At least 1 special character
     */
    fun isValidPassword(password: String): Pair<Boolean, String> {
        if (password.length < 8)
            return Pair(false, "Password must be at least 8 characters")
        if (!password.any { it.isUpperCase() })
            return Pair(false, "Password must contain at least one uppercase letter")
        if (!password.any { it.isDigit() })
            return Pair(false, "Password must contain at least one number")
        if (!password.any { "!@#\$%^&*(),.?\":{}|<>".contains(it) })
            return Pair(false, "Password must contain at least one special character")
        return Pair(true, "")
    }

    fun isValidPhoneNumber(phone: String): Boolean {
        val cleaned = phone.replace(Regex("[\\s\\-\\(\\)\\+]"), "")
        return cleaned.length in 7..15 && cleaned.all { it.isDigit() }
    }

    fun isValidName(name: String): Boolean = name.trim().length >= 2

    fun isValidDate(date: String): Boolean {
        return try {
            val parts = date.split("-")
            parts.size == 3 && parts[0].length == 4 && parts[1].length == 2 && parts[2].length == 2
        } catch (e: Exception) { false }
    }

    fun isValidReportForm(
        petName: String, petType: String, dateLastSeen: String,
        location: String, contactNumber: String, email: String
    ): Pair<Boolean, String> {
        if (!isValidName(petName)) return Pair(false, "Pet name is required")
        if (petType.isBlank()) return Pair(false, "Pet type is required")
        if (!isValidDate(dateLastSeen)) return Pair(false, "Valid date is required (YYYY-MM-DD)")
        if (location.isBlank()) return Pair(false, "Location is required")
        if (!isValidPhoneNumber(contactNumber)) return Pair(false, "Valid contact number is required")
        if (!isValidEmail(email)) return Pair(false, "Valid email is required")
        return Pair(true, "")
    }

    fun isValidAdoptionForm(
        fullName: String, email: String, phone: String,
        address: String, whyAdopt: String
    ): Pair<Boolean, String> {
        if (!isValidName(fullName)) return Pair(false, "Full name is required")
        if (!isValidEmail(email)) return Pair(false, "Valid email is required")
        if (!isValidPhoneNumber(phone)) return Pair(false, "Valid phone number is required")
        if (address.isBlank()) return Pair(false, "Home address is required")
        if (whyAdopt.isBlank()) return Pair(false, "Please explain why you want to adopt")
        return Pair(true, "")
    }

    fun isValidSightingForm(
        reporterEmail: String, animalType: String,
        sightingDate: String, location: String
    ): Pair<Boolean, String> {
        if (!isValidEmail(reporterEmail)) return Pair(false, "Valid reporter email is required")
        if (animalType.isBlank()) return Pair(false, "Animal type is required")
        if (!isValidDate(sightingDate)) return Pair(false, "Valid sighting date required")
        if (location.isBlank()) return Pair(false, "Sighting location is required")
        return Pair(true, "")
    }
}
