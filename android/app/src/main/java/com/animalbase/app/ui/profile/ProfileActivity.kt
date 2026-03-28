package com.animalbase.app.ui.profile

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import androidx.appcompat.app.AlertDialog
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.animalbase.app.R
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityProfileBinding
import com.animalbase.app.models.AdoptionApplication
import com.animalbase.app.models.User
import com.animalbase.app.ui.applications.ApplicationDetailsDialog
import com.animalbase.app.ui.applications.ApplicationCardAdapter
import com.animalbase.app.ui.auth.LoginActivity
import com.animalbase.app.ui.auth.SplashActivity
import com.animalbase.app.ui.base.SessionAwareActivity
import com.animalbase.app.utils.ImageLoader
import com.animalbase.app.utils.NotificationPollingWorker
import com.animalbase.app.utils.formatDateTime
import com.animalbase.app.utils.showToast
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.IOException

class ProfileActivity : SessionAwareActivity() {

    private lateinit var binding: ActivityProfileBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val historyAdapter by lazy { ApplicationCardAdapter(::showApplicationDetails) }
    private var activeSection: String = "profile"
    private var isAccountSectionExpanded: Boolean = false
    private var hasLoadedApplications: Boolean = false
    private var hasResumedOnce: Boolean = false

    private val photoPickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            val cachedSourceFile = copyPickedPhotoToCache(it)
            if (cachedSourceFile == null) {
                showToast("Unable to open the selected image")
                return@let
            }
            cropPhotoLauncher.launch(CropProfilePhotoActivity.createIntent(this, cachedSourceFile))
        }
    }

    private val cropPhotoLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode != RESULT_OK) return@registerForActivityResult

        val croppedPath = result.data?.getStringExtra(CropProfilePhotoActivity.EXTRA_CROPPED_PATH)
        if (croppedPath.isNullOrBlank()) {
            showToast("Unable to prepare cropped image")
            return@registerForActivityResult
        }

        val croppedFile = File(croppedPath)
        if (!croppedFile.exists()) {
            showToast("Unable to find cropped image")
            return@registerForActivityResult
        }

        uploadProfilePhoto(croppedFile)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.setNavigationOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }

        binding.rvHistory.layoutManager = LinearLayoutManager(this)
        binding.rvHistory.adapter = historyAdapter

        setupTabs()
        setupClickListeners()
        renderUser(session.getUser())
        renderAccountSection()
        showSection(activeSection)
    }

    override fun onResume() {
        super.onResume()

        if (hasResumedOnce) {
            renderUser(session.getUser())
        } else {
            hasResumedOnce = true
        }

        loadProfile()
        if (activeSection == "history") {
            loadApplications(force = true)
        }
    }

    private fun setupTabs() {
        binding.btnTabProfile.setOnClickListener { showSection("profile") }
        binding.btnTabHistory.setOnClickListener { showSection("history") }
        binding.btnTabSettings.setOnClickListener { showSection("settings") }
    }

    private fun setupClickListeners() {
        binding.fabEditPhoto.setOnClickListener { photoPickerLauncher.launch("image/*") }
        binding.profileAvatarContainer.setOnClickListener { photoPickerLauncher.launch("image/*") }
        binding.ivProfilePhoto.setOnClickListener { photoPickerLauncher.launch("image/*") }

        binding.itemEditProfile.setOnClickListener {
            startActivity(Intent(this, EditProfileActivity::class.java))
        }
        binding.itemAccount.setOnClickListener {
            toggleAccountSection()
        }
        binding.itemChangePassword.setOnClickListener {
            startActivity(Intent(this, ChangePasswordActivity::class.java))
        }
        binding.itemMyReports.setOnClickListener {
            startActivity(Intent(this, MyReportsActivity::class.java))
        }
        binding.itemNotifications.setOnClickListener {
            startActivity(Intent(this, NotificationPreferencesActivity::class.java))
        }
        binding.itemPrivacy.setOnClickListener {
            startActivity(Intent(this, PrivacySettingsActivity::class.java))
        }
        binding.itemHelpSupport.setOnClickListener {
            startActivity(Intent(this, HelpSupportActivity::class.java))
        }
        binding.itemAboutApp.setOnClickListener {
            startActivity(Intent(this, AboutAppActivity::class.java))
        }
        binding.itemLegalPolicies.setOnClickListener {
            startActivity(Intent(this, LegalPoliciesActivity::class.java))
        }

        binding.btnLogout.setOnClickListener {
            showLogoutPrompt()
        }
        binding.btnDeleteAccount.setOnClickListener {
            showDeleteAccountPrompt()
        }
    }

    private fun showSection(section: String) {
        activeSection = section
        binding.sectionProfile.visibility = if (section == "profile") View.VISIBLE else View.GONE
        binding.sectionHistory.visibility = if (section == "history") View.VISIBLE else View.GONE
        binding.sectionSettings.visibility = if (section == "settings") View.VISIBLE else View.GONE

        val activeColor = getColor(R.color.primary)
        val inactiveColor = getColor(R.color.primary_light)
        val activeText = getColor(R.color.text_on_primary)
        val inactiveText = getColor(R.color.text_secondary)

        listOf(
            binding.btnTabProfile to "profile",
            binding.btnTabHistory to "history",
            binding.btnTabSettings to "settings"
        ).forEach { (button, key) ->
            val isActive = key == section
            button.backgroundTintList = ColorStateList.valueOf(if (isActive) activeColor else inactiveColor)
            button.setTextColor(if (isActive) activeText else inactiveText)
        }

        if (section == "history") {
            loadApplications()
        }
    }

    private fun toggleAccountSection() {
        isAccountSectionExpanded = !isAccountSectionExpanded
        renderAccountSection()
    }

    private fun renderAccountSection() {
        binding.layoutAccountSection.visibility = if (isAccountSectionExpanded) View.VISIBLE else View.GONE
        binding.ivAccountChevron.rotation = if (isAccountSectionExpanded) 90f else 0f
        binding.ivAccountChevron.contentDescription = getString(
            if (isAccountSectionExpanded) {
                R.string.collapse_account_section
            } else {
                R.string.expand_account_section
            }
        )
    }

    private fun renderUser(user: User?) {
        val fullName = user?.fullName?.takeIf { it.isNotBlank() } ?: "AnimalBase User"
        val email = user?.email?.takeIf { it.isNotBlank() } ?: "No email on file"
        val memberSince = user?.memberSince?.formatDateTime()?.takeIf { it.isNotBlank() }
        val avatarUrl = user?.avatarUrl?.takeIf { it.isNotBlank() }

        binding.tvProfileName.text = fullName
        binding.tvProfileEmail.text = email
        binding.tvMemberSince.text = memberSince?.let { "Member since $it" } ?: "Member since recently"
        binding.tvProfileInitial.text = extractProfileInitial(fullName, email)

        binding.tvInfoName.text = fullName
        binding.tvInfoEmail.text = email
        binding.tvInfoPhone.text = user?.phone ?: "Not set"
        binding.tvInfoAddress.text = user?.address ?: "Not set"

        if (avatarUrl != null) {
            binding.ivProfilePhoto.visibility = View.VISIBLE
            ImageLoader.loadProfileCardImage(this, avatarUrl, binding.ivProfilePhoto)
        } else {
            binding.ivProfilePhoto.visibility = View.GONE
            binding.ivProfilePhoto.setImageDrawable(null)
        }
    }

    private fun loadProfile() {
        lifecycleScope.launch {
            try {
                val response = api.getProfile()
                if (response.isSuccessful) {
                    val user = response.body() ?: return@launch
                    session.saveUser(user)
                    renderUser(user)
                }
            } catch (_: Exception) {
                if (session.getUser() == null) {
                    showToast("Error loading profile")
                }
            }
        }
    }

    private fun loadApplications(force: Boolean = false) {
        if (hasLoadedApplications && !force) return

        lifecycleScope.launch {
            try {
                val response = api.getMyApplications()
                if (response.isSuccessful) {
                    val applications = response.body().orEmpty()
                    hasLoadedApplications = true
                    historyAdapter.submitList(applications)
                    binding.tvHistoryEmpty.visibility =
                        if (applications.isEmpty()) View.VISIBLE else View.GONE
                } else if (!hasLoadedApplications) {
                    binding.tvHistoryEmpty.visibility = View.VISIBLE
                }
            } catch (_: Exception) {
                if (!hasLoadedApplications) {
                    binding.tvHistoryEmpty.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun uploadProfilePhoto(file: File) {
        lifecycleScope.launch {
            try {
                val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("profile_photo", file.name, requestFile)
                val response = api.uploadProfilePhoto(part)
                if (response.isSuccessful && response.body()?.success == true) {
                    val photoUrl = response.body()?.photoUrl
                    val updatedUser = session.getUser()?.copy(avatarUrl = photoUrl)
                    if (updatedUser != null) {
                        session.saveUser(updatedUser)
                        renderUser(updatedUser)
                    } else {
                        binding.ivProfilePhoto.visibility = View.VISIBLE
                        ImageLoader.loadProfileCardImage(this@ProfileActivity, photoUrl, binding.ivProfilePhoto)
                    }
                    showToast("Profile photo updated!")
                } else {
                    showToast(response.body()?.message ?: "Failed to upload photo")
                }
            } catch (error: Exception) {
                showToast("Error: ${error.message}")
            } finally {
                file.delete()
            }
        }
    }

    private fun copyPickedPhotoToCache(sourceUri: android.net.Uri): File? {
        return runCatching {
            val outputFile = File.createTempFile("profile_source_", ".tmp", cacheDir)
            contentResolver.openInputStream(sourceUri)?.use { input ->
                outputFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            } ?: throw IOException("Unable to read the selected image")
            outputFile
        }.getOrNull()
    }

    private fun showDeleteAccountPrompt() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.delete_account_prompt))
            .setMessage(getString(R.string.delete_account_prompt_message))
            .setNegativeButton(getString(R.string.cancel), null)
            .setPositiveButton(getString(R.string.confirm)) { _, _ ->
                showDeleteAccountFinalPrompt()
            }
            .show()
    }

    private fun showLogoutPrompt() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.logout))
            .setMessage(getString(R.string.logout_prompt_message))
            .setNegativeButton(getString(R.string.cancel), null)
            .setPositiveButton(getString(R.string.logout)) { _, _ ->
                navigateToLogin()
            }
            .show()
    }

    private fun showDeleteAccountFinalPrompt() {
        val density = resources.displayMetrics.density
        val horizontalPadding = (20 * density).toInt()
        val verticalPadding = (8 * density).toInt()

        val passwordInput = EditText(this).apply {
            hint = getString(R.string.delete_account_password_hint)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setSingleLine()
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(horizontalPadding, verticalPadding, horizontalPadding, 0)
            addView(passwordInput)
        }

        AlertDialog.Builder(this)
            .setTitle(getString(R.string.delete_account_prompt_secondary))
            .setMessage(
                "${getString(R.string.delete_account_prompt_secondary_message)}\n\n" +
                    getString(R.string.delete_account_password_prompt)
            )
            .setView(container)
            .setNegativeButton(getString(R.string.cancel), null)
            .setPositiveButton(getString(R.string.delete_account)) { _, _ ->
                val password = passwordInput.text?.toString().orEmpty().trim()
                if (password.isBlank()) {
                    showToast(getString(R.string.delete_account_password_required))
                    return@setPositiveButton
                }
                deleteAccount(password)
            }
            .show()
    }

    private fun deleteAccount(password: String) {
        lifecycleScope.launch {
            try {
                val response = api.deleteAccount(com.animalbase.app.models.DeleteAccountRequest(password))
                if (response.isSuccessful) {
                    navigateToLanding()
                } else {
                    showToast(response.body()?.message ?: getString(R.string.delete_account_failed))
                }
            } catch (error: Exception) {
                showToast(error.message ?: getString(R.string.delete_account_failed))
            }
        }
    }

    private fun navigateToLogin() {
        NotificationPollingWorker.cancel(this)
        session.logout()
        startActivity(
            Intent(this, LoginActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            }
        )
        finish()
    }

    private fun navigateToLanding() {
        NotificationPollingWorker.cancel(this)
        session.logout()
        startActivity(
            Intent(this, SplashActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            }
        )
        finish()
    }

    private fun showApplicationDetails(app: AdoptionApplication) {
        ApplicationDetailsDialog.show(this, app)
    }
    private fun extractProfileInitial(fullName: String, email: String): String {
        return fullName.firstOrNull { it.isLetterOrDigit() }?.uppercaseChar()?.toString()
            ?: email.firstOrNull { it.isLetterOrDigit() }?.uppercaseChar()?.toString()
            ?: "A"
    }
}
