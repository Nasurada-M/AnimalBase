package com.animalbase.app.utils

import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.TextView
import com.animalbase.app.models.LocationSuggestion
import androidx.lifecycle.LifecycleCoroutineScope
import com.animalbase.app.api.ApiService
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val PANGASINAN_REGEX = Regex("\\bPangasinan\\b", RegexOption.IGNORE_CASE)
private val QUERY_SPLIT_REGEX = Regex("[,\\s]+")
private const val SEARCH_DEBOUNCE_MS = 300L
private const val MINIMUM_QUERY_LENGTH = 2

private val LOCAL_PANGASINAN_SUGGESTIONS = listOf(
    LocationSuggestion("Agno, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Aguilar, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Alaminos City, Pangasinan, Philippines", "City"),
    LocationSuggestion("Alcala, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Anda, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Asingan, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Balungao, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Bani, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Basista, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Bautista, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Bayambang, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Binalonan, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Binmaley, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Bolinao, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Bugallon, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Burgos, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Calasiao, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Dagupan City, Pangasinan, Philippines", "City"),
    LocationSuggestion("Dasol, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Infanta, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Labrador, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Laoac, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Lingayen, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Mabini, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Malasiqui, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Manaoag, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Mangaldan, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Mangatarem, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Mapandan, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Natividad, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Pozorrubio, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Rosales, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("San Carlos City, Pangasinan, Philippines", "City"),
    LocationSuggestion("San Fabian, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("San Jacinto, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("San Manuel, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("San Nicolas, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("San Quintin, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Santa Barbara, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Santa Maria, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Santo Tomas, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Sison, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Sual, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Tayug, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Umingan, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Urbiztondo, Pangasinan, Philippines", "Municipality"),
    LocationSuggestion("Urdaneta City, Pangasinan, Philippines", "City"),
    LocationSuggestion("Villasis, Pangasinan, Philippines", "Municipality"),
)

fun isPangasinanLocation(value: String?): Boolean =
    !value.isNullOrBlank() && PANGASINAN_REGEX.containsMatchIn(value.trim())

fun pangasinanLocationValidationMessage(fieldLabel: String): String =
    "$fieldLabel must be in Pangasinan, Philippines."

private fun buildSuggestionAdapter(
    autoCompleteTextView: AutoCompleteTextView,
): ArrayAdapter<LocationSuggestion> = object : ArrayAdapter<LocationSuggestion>(
    autoCompleteTextView.context,
    android.R.layout.simple_list_item_2,
    android.R.id.text1,
    mutableListOf()
) {
    override fun getView(position: Int, convertView: View?, parent: ViewGroup): View =
        bindView(position, convertView, parent)

    override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View =
        bindView(position, convertView, parent)

    private fun bindView(position: Int, convertView: View?, parent: ViewGroup): View {
        val view = convertView ?: LayoutInflater.from(context)
            .inflate(android.R.layout.simple_list_item_2, parent, false)
        val suggestion = getItem(position)
        val primary = view.findViewById<TextView>(android.R.id.text1)
        val secondary = view.findViewById<TextView>(android.R.id.text2)

        primary.text = suggestion?.label.orEmpty()
        primary.maxLines = 2
        secondary.text = suggestion?.kind?.let { "$it in Pangasinan" } ?: "Pangasinan, Philippines"
        secondary.visibility = if (secondary.text.isNullOrBlank()) View.GONE else View.VISIBLE

        return view
    }
}

private fun suggestionMatchScore(query: String, suggestion: LocationSuggestion): Int {
    val normalizedQuery = query.trim().lowercase()
    val label = suggestion.label.lowercase()
    val tokens = QUERY_SPLIT_REGEX.split(label).filter { it.isNotBlank() }

    var score = 0
    if (label.startsWith(normalizedQuery)) score += 400
    if (tokens.any { it.startsWith(normalizedQuery) }) score += 250
    if (label.contains(normalizedQuery)) score += 100
    if (suggestion.kind?.equals("City", ignoreCase = true) == true) score += 10

    return score - label.length
}

private fun buildFallbackSuggestions(query: String): List<LocationSuggestion> {
    val normalizedQuery = query.trim().lowercase()
    return LOCAL_PANGASINAN_SUGGESTIONS
        .filter { suggestion ->
            val label = suggestion.label.lowercase()
            label.contains(normalizedQuery)
                || QUERY_SPLIT_REGEX.split(label).any { token -> token.startsWith(normalizedQuery) }
        }
        .sortedByDescending { suggestionMatchScore(query, it) }
        .take(8)
}

private fun mergeSuggestions(
    query: String,
    remoteSuggestions: List<LocationSuggestion>,
): List<LocationSuggestion> {
    val mergedByLabel = linkedMapOf<String, LocationSuggestion>()

    (remoteSuggestions + buildFallbackSuggestions(query)).forEach { suggestion ->
        val normalizedLabel = suggestion.label.trim().lowercase()
        if (normalizedLabel.isNotEmpty() && normalizedLabel !in mergedByLabel) {
            mergedByLabel[normalizedLabel] = suggestion
        }
    }

    return mergedByLabel.values
        .sortedByDescending { suggestionMatchScore(query, it) }
        .take(8)
}

fun bindPangasinanLocationAutocomplete(
    autoCompleteTextView: AutoCompleteTextView,
    inputLayout: TextInputLayout,
    scope: LifecycleCoroutineScope,
    api: ApiService,
) {
    val adapter = buildSuggestionAdapter(autoCompleteTextView)

    autoCompleteTextView.setAdapter(adapter)
    autoCompleteTextView.threshold = 1

    var searchJob: Job? = null

    autoCompleteTextView.addTextChangedListener(object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit

        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

        override fun afterTextChanged(s: Editable?) {
            inputLayout.error = null
            searchJob?.cancel()

            val query = s?.toString().orEmpty().trim()
            if (query.length < MINIMUM_QUERY_LENGTH) {
                adapter.clear()
                adapter.notifyDataSetChanged()
                autoCompleteTextView.dismissDropDown()
                return
            }

            searchJob = scope.launch {
                delay(SEARCH_DEBOUNCE_MS)

                val response = runCatching { api.searchPangasinanLocations(query) }.getOrNull()
                val latestQuery = autoCompleteTextView.text?.toString().orEmpty().trim()
                if (latestQuery != query) return@launch

                val suggestions = if (response?.isSuccessful == true) {
                    mergeSuggestions(query, response.body().orEmpty())
                } else {
                    buildFallbackSuggestions(query)
                }

                adapter.clear()
                adapter.addAll(suggestions)
                adapter.notifyDataSetChanged()

                if (suggestions.isNotEmpty() && autoCompleteTextView.hasFocus()) {
                    autoCompleteTextView.showDropDown()
                } else {
                    autoCompleteTextView.dismissDropDown()
                }
            }
        }
    })

    autoCompleteTextView.setOnItemClickListener { _, _, _, _ ->
        inputLayout.error = null
    }

    autoCompleteTextView.setOnFocusChangeListener { _, hasFocus ->
        if (hasFocus && (autoCompleteTextView.text?.length ?: 0) >= MINIMUM_QUERY_LENGTH && adapter.count > 0) {
            autoCompleteTextView.showDropDown()
        }
    }

    autoCompleteTextView.setOnClickListener {
        if ((autoCompleteTextView.text?.length ?: 0) >= MINIMUM_QUERY_LENGTH && adapter.count > 0) {
            autoCompleteTextView.showDropDown()
        }
    }
}
