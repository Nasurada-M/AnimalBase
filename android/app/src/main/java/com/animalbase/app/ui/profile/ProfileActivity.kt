package com.animalbase.app.ui.profile

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.animalbase.app.api.RetrofitClient
import com.animalbase.app.databinding.ActivityProfileBinding
import com.animalbase.app.ui.auth.LoginActivity
import com.animalbase.app.ui.notifications.NotificationsActivity
import com.animalbase.app.utils.*
import io.github.dhaval2404.imagepicker.ImagePicker
import kotlinx.coroutines.launch
import okhttp3.MediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody
import java.io.File

class ProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProfileBinding
    private val api by lazy { RetrofitClient.getApiService(this) }
    private val session by lazy { SessionManager(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { onBackPressed() }
        loadProfile()
        setupClickListeners()
    }

    private fun loadProfile() {
        lifecycleScope.launch {
            try {
                val response = api.getProfile()
                if (response.isSuccessful) {
                    val user = response.body()?.user ?: return@launch
                    session.saveUser(user)
                    binding.tvProfileName.text = user.fullName
                    binding.tvProfileEmail.text = user.email
                    binding.tvMemberSince.text = "Member since ${user.memberSince?.formatDateTime() ?: ""}"
                    val photoUrl = user.profilePhotoUrl ?: user.profilePhoto
                    ImageLoader.loadProfileImage(this@ProfileActivity, photoUrl, binding.ivProfilePhoto)
                }
            } catch (e: Exception) {
                showToast("Error loading profile")
            }
        }
    }

    private fun setupClickListeners() {
        binding.fabEditPhoto.setOnClickListener { pickProfilePhoto() }
        binding.ivProfilePhoto.setOnClickListener { pickProfilePhoto() }

        binding.itemEditProfile.setOnClickListener {
            startActivity(Intent(this, EditProfileActivity::class.java))
        }
        binding.itemChangePassword.setOnClickListener {
            startActivity(Intent(this, ChangePasswordActivity::class.java))
        }
        binding.itemMyApplications.setOnClickListener {
            startActivity(Intent(this, MyApplicationsActivity::class.java))
        }
        binding.itemMyReports.setOnClickListener {
            startActivity(Intent(this, MyReportsActivity::class.java))
        }
        binding.itemNotifications.setOnClickListener {
            startActivity(Intent(this, NotificationsActivity::class.java))
        }
        binding.btnLogout.setOnClickListener {
            session.logout()
            startActivity(Intent(this, LoginActivity::class.java))
            finishAffinity()
        }
    }

    private fun pickProfilePhoto() {
        ImagePicker.with(this)
            .crop().compress(1024)
            .maxResultSize(1080, 1080)
            .start { resultCode, data ->
                if (resultCode == RESULT_OK) {
                    val file = ImagePicker.getFile(data) ?: return@start
                    uploadProfilePhoto(file)
                }
            }
    }

    private fun uploadProfilePhoto(file: File) {
        lifecycleScope.launch {
            try {
                val requestFile = RequestBody.create(MediaType.parse("image/*"), file)
                val part = MultipartBody.Part.createFormData("profile_photo", file.name, requestFile)
                val response = api.uploadProfilePhoto(part)
                if (response.isSuccessful && response.body()?.success == true) {
                    val photoUrl = response.body()?.photo_url
                    ImageLoader.loadProfileImage(this@ProfileActivity, photoUrl, binding.ivProfilePhoto)
                    showToast("Profile photo updated!")
                } else {
                    showToast("Failed to upload photo")
                }
            } catch (e: Exception) {
                showToast("Error: ${e.message}")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        loadProfile()
    }
}
