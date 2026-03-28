package com.animalbase.app.ui.profile

import android.os.Bundle
import com.animalbase.app.databinding.ActivityPrivacySettingsBinding
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.ProfilePreferencesStore

class PrivacySettingsActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityPrivacySettingsBinding
    private val preferences by lazy { ProfilePreferencesStore(this) }
    private var isBindingState = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrivacySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }

        setupListeners()
        renderState()
    }

    private fun setupListeners() {
        binding.switchProfileVisibility.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            preferences.setProfileVisible(isChecked)
        }

        binding.switchActivityVisible.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            preferences.setActivityVisible(isChecked)
        }

        binding.switchDataSharing.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            preferences.setDataSharing(isChecked)
        }
    }

    private fun renderState() {
        val settings = preferences.getPrivacySettings()
        isBindingState = true
        binding.switchProfileVisibility.isChecked = settings.profileVisible
        binding.switchActivityVisible.isChecked = settings.activityVisible
        binding.switchDataSharing.isChecked = settings.dataSharing
        isBindingState = false
    }
}
