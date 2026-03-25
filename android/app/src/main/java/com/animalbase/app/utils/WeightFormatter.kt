package com.animalbase.app.utils

private val weightValuePattern = Regex("""^\s*(\d+(?:\.\d+)?|\.\d+)\s*(?:kg)?\s*$""", RegexOption.IGNORE_CASE)
private val numericWeightPattern = Regex("""^[\d.\s]+$""")

private fun normalizeNumericWeight(value: String): String {
    val sanitized = value.replace(Regex("""[^0-9.]"""), "")
    val parts = sanitized.split('.')
    val integerPart = parts.firstOrNull().orEmpty()
    val decimalPart = parts.drop(1).joinToString("")
    val combined = if (decimalPart.isNotEmpty()) {
        "$integerPart.$decimalPart"
    } else {
        integerPart
    }

    return if (combined.startsWith(".")) "0$combined" else combined
}

fun normalizeWeightForStorage(value: String?): String? {
    val trimmed = value?.trim().orEmpty()
    if (trimmed.isEmpty()) return null

    val matchedValue = weightValuePattern.matchEntire(trimmed)?.groupValues?.getOrNull(1) ?: trimmed
    val normalized = normalizeNumericWeight(matchedValue)

    return normalized.takeIf { it.isNotBlank() }?.let { "$it kg" }
}

fun formatWeightForDisplay(value: String?, emptyLabel: String = "-"): String {
    val trimmed = value?.trim().orEmpty()
    if (trimmed.isEmpty()) return emptyLabel

    return if (weightValuePattern.matches(trimmed) || numericWeightPattern.matches(trimmed)) {
        "${normalizeNumericWeight(weightValuePattern.matchEntire(trimmed)?.groupValues?.getOrNull(1) ?: trimmed)} kg"
    } else {
        trimmed
    }
}
