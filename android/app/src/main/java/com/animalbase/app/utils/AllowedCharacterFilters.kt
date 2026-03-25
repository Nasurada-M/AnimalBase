package com.animalbase.app.utils

import android.text.InputFilter

private fun Char.isAllowedPetTextCharacter(multiline: Boolean, allowComma: Boolean): Boolean {
    return isLetterOrDigit()
        || this == ' '
        || this == '.'
        || this == '-'
        || (allowComma && this == ',')
        || (multiline && (this == '\n' || this == '\r'))
}

fun petTextInputFilter(multiline: Boolean = false, allowComma: Boolean = false): InputFilter = InputFilter { source, start, end, _, _, _ ->
    val filtered = buildString {
        for (index in start until end) {
            val character = source[index]
            if (character.isAllowedPetTextCharacter(multiline, allowComma)) {
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

fun petPhoneInputFilter(): InputFilter = InputFilter { source, start, end, _, _, _ ->
    val filtered = buildString {
        for (index in start until end) {
            val character = source[index]
            if (character.isDigit() || character == ' ' || character == '.' || character == '-') {
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
