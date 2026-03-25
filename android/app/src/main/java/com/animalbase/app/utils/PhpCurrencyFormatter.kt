package com.animalbase.app.utils

import java.text.NumberFormat
import java.util.Locale

object PhpCurrencyFormatter {
    private val formatter: NumberFormat = NumberFormat.getIntegerInstance(Locale("en", "PH"))

    fun sanitizeAmountInput(value: String): String =
        value.filter { it.isDigit() }.take(12)

    fun formatAmount(amount: String): String? {
        val sanitized = sanitizeAmountInput(amount)
        if (sanitized.isBlank()) return null

        val wholeNumber = sanitized.toLongOrNull() ?: return null
        return "₱ ${formatter.format(wholeNumber)}"
    }

    fun formatRewardValue(value: String?): String? {
        val trimmedValue = value?.trim().orEmpty()
        if (trimmedValue.isBlank()) return null

        val normalizedValue = trimmedValue
            .replace("PHP", "", ignoreCase = true)
            .replace("₱", "")
            .replace(",", "")
            .trim()

        return if (normalizedValue.all { it.isDigit() }) {
            formatAmount(normalizedValue)
        } else {
            trimmedValue
        }
    }
}
