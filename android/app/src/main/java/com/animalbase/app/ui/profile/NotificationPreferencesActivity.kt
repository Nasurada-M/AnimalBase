package com.animalbase.app.ui.profile

import android.os.Bundle
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.databinding.ActivityNotificationPreferencesBinding
import com.animalbase.app.models.UpdateProfileRequest
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.utils.ProfilePreferencesStore
import com.animalbase.app.utils.showToast
import kotlinx.coroutines.launch

class NotificationPreferencesActivity : SessionAwareActivity() {

    companion object {
        private const val KEY_NEW_PETS = "new_pets"
        private const val KEY_PET_FINDER = "pet_finder"
    }

    private lateinit var binding: ActivityNotificationPreferencesBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val preferences by lazy { ProfilePreferencesStore(this) }
    private var isBindingState = false
    private var savingRemoteKey: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityNotificationPreferencesBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressedDispatcher.onBackPressed() }

        setupListeners()
        renderState()
    }

    override fun onResume() {
        super.onResume()
        renderState()
    }

    private fun setupListeners() {
        binding.switchApplicationUpdates.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            preferences.setApplicationUpdatesEnabled(isChecked)
        }

        binding.switchWeeklyDigest.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            preferences.setWeeklyDigestEnabled(isChecked)
        }

        binding.switchPromotions.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            preferences.setPromotionsEnabled(isChecked)
        }

        binding.switchNewPets.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            updateRemotePreference(KEY_NEW_PETS, isChecked)
        }

        binding.switchPetFinderAlerts.setOnCheckedChangeListener { _, isChecked ->
            if (isBindingState) return@setOnCheckedChangeListener
            updateRemotePreference(KEY_PET_FINDER, isChecked)
        }
    }

    private fun renderState() {
        val user = session.getUser()

        isBindingState = true
        binding.switchApplicationUpdates.isChecked = preferences.isApplicationUpdatesEnabled()
        binding.switchNewPets.isChecked = user?.newPetEmailNotificationsEnabled ?: true
        binding.switchPetFinderAlerts.isChecked = user?.petFinderEmailNotificationsEnabled ?: true
        binding.switchWeeklyDigest.isChecked = preferences.isWeeklyDigestEnabled()
        binding.switchPromotions.isChecked = preferences.isPromotionsEnabled()
        isBindingState = false

        val isSaving = savingRemoteKey != null
        binding.switchNewPets.isEnabled = !isSaving
        binding.switchPetFinderAlerts.isEnabled = !isSaving
        binding.progressRemoteSave.visibility = if (isSaving) android.view.View.VISIBLE else android.view.View.GONE
    }

    private fun updateRemotePreference(key: String, enabled: Boolean) {
        if (savingRemoteKey != null) {
            renderState()
            return
        }

        savingRemoteKey = key
        renderState()

        lifecycleScope.launch {
            try {
                val request = if (key == KEY_NEW_PETS) {
                    UpdateProfileRequest(newPetEmailNotificationsEnabled = enabled)
                } else {
                    UpdateProfileRequest(petFinderEmailNotificationsEnabled = enabled)
                }

                val response = api.updateProfile(request)
                if (response.isSuccessful) {
                    val updatedUser = response.body() ?: session.getUser()?.copy(
                        newPetEmailNotificationsEnabled = if (key == KEY_NEW_PETS) {
                            enabled
                        } else {
                            session.getUser()?.newPetEmailNotificationsEnabled
                        },
                        petFinderEmailNotificationsEnabled = if (key == KEY_PET_FINDER) {
                            enabled
                        } else {
                            session.getUser()?.petFinderEmailNotificationsEnabled
                        }
                    )
                    updatedUser?.let(session::saveUser)
                    showToast(
                        if (key == KEY_NEW_PETS) {
                            if (enabled) {
                                "New pet alerts are turned on in the app and email."
                            } else {
                                "New pet alerts are turned off in the app and email."
                            }
                        } else {
                            if (enabled) {
                                "Pet Finder alerts are turned on in the app and email."
                            } else {
                                "Pet Finder alerts are turned off in the app and email."
                            }
                        }
                    )
                } else {
                    showToast(
                        if (key == KEY_NEW_PETS) {
                            "Could not update your new pet alert preference."
                        } else {
                            "Could not update your Pet Finder alert preference."
                        }
                    )
                }
            } catch (_: Exception) {
                showToast(
                    if (key == KEY_NEW_PETS) {
                        "Could not update your new pet alert preference."
                    } else {
                        "Could not update your Pet Finder alert preference."
                    }
                )
            } finally {
                savingRemoteKey = null
                renderState()
            }
        }
    }
}
