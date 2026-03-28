package com.animalbase.app.models

import android.os.Parcelable
import com.google.gson.annotations.SerializedName
import kotlinx.parcelize.Parcelize

data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(
    val fullName: String,
    val email: String,
    val password: String,
    val phone: String? = null,
    val address: String? = null
)
data class SendOtpRequest(val email: String)
data class VerifyOtpRequest(val email: String, val otp: String)
data class ForgotPasswordRequest(val email: String)
data class UpdateProfileRequest(
    val fullName: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val newPetEmailNotificationsEnabled: Boolean? = null,
    val petFinderEmailNotificationsEnabled: Boolean? = null
)
data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)
data class ResetPasswordRequest(
    val resetToken: String,
    val newPassword: String,
    val confirmPassword: String
)
data class DeleteAccountRequest(val password: String)
data class StatusUpdateRequest(val status: String)
data class AdoptionApplicationRequest(
    val petId: Int,
    val fullName: String,
    val email: String,
    val phone: String,
    val homeAddress: String,
    val previousPetExperience: String? = null,
    val whyAdopt: String,
    val whyChooseYou: String? = null
)

data class ApiResponse(
    val success: Boolean = false,
    val message: String? = null
)

data class LocationSuggestion(
    val label: String = "",
    val kind: String? = null
) {
    override fun toString(): String = label
}

data class PhotoUploadResponse(
    val success: Boolean = false,
    @SerializedName("photo_url") val photoUrl: String? = null,
    val message: String? = null
)

data class AuthResponse(
    val token: String? = null,
    val user: User? = null,
    val message: String? = null,
    val error: String? = null
)

data class OtpResponse(
    val message: String? = null,
    val error: String? = null,
    val details: String? = null,
    val expiresInSeconds: Int? = null,
    val devOtp: String? = null,
    val devHint: String? = null
)

data class VerifyOtpResponse(
    val message: String? = null,
    val error: String? = null,
    val details: String? = null,
    val verified: Boolean = false
)

data class VerifyResetOtpResponse(
    val message: String? = null,
    val error: String? = null,
    val details: String? = null,
    val verified: Boolean = false,
    val resetToken: String? = null,
    val expiresInSeconds: Int? = null
)

@Parcelize
data class User(
    val id: Int = 0,
    val fullName: String = "",
    val email: String = "",
    val phone: String? = null,
    val address: String? = null,
    val avatarUrl: String? = null,
    val newPetEmailNotificationsEnabled: Boolean? = null,
    val petFinderEmailNotificationsEnabled: Boolean? = null,
    val role: String = "user",
    val joinedAt: String? = null,
    val createdAt: String? = null
) : Parcelable {
    val userId: Int get() = id
    val effectiveUserId: Int get() = id
    val phoneNumber: String? get() = phone
    val alternatePhone: String? get() = null
    val profilePhotoUrl: String? get() = avatarUrl
    val profilePhoto: String? get() = avatarUrl
    val memberSince: String? get() = joinedAt ?: createdAt
}

@Parcelize
data class Pet(
    val id: Int = 0,
    val name: String = "",
    val type: String = "",
    val breed: String? = null,
    val gender: String? = null,
    val age: String? = null,
    val weight: String? = null,
    val colorAppearance: String? = null,
    val description: String? = null,
    val distinctiveFeatures: String? = null,
    val imageUrl: String? = null,
    val status: String = "Available",
    val shelterName: String? = null,
    val shelterEmail: String? = null,
    val shelterPhone: String? = null,
    val location: String? = null,
    val createdAt: String? = null
) : Parcelable {
    val petId: Int get() = id
    val petName: String get() = name
    val petType: String get() = type
    val ageCategory: String? get() = age
    val ageMonths: Int? get() = null
    val shelterAddress: String? get() = location
    val photos: List<String> get() = listOfNotNull(imageUrl)
    val photoUrls: List<String> get() = listOfNotNull(imageUrl)
}

@Parcelize
data class MissingPet(
    val id: Int = 0,
    val petName: String = "",
    val type: String = "",
    val breed: String? = null,
    val gender: String? = null,
    val age: String? = null,
    val weight: String? = null,
    val colorAppearance: String? = null,
    val description: String? = null,
    val distinctiveFeatures: String? = null,
    val imageUrl: String? = null,
    val lastSeenLocation: String? = null,
    val lastSeenDate: String? = null,
    val rewardOffered: String? = null,
    val ownerName: String? = null,
    val ownerEmail: String? = null,
    val ownerPhone: String? = null,
    val ownerPhone2: String? = null,
    val reportedById: Int? = null,
    val status: String = "Missing",
    val reportedAt: String? = null
) : Parcelable {
    val missingPetId: Int get() = id
    val petType: String get() = type
    val locationLastSeen: String? get() = lastSeenLocation
    val dateLastSeen: String? get() = lastSeenDate
    val contactNumber: String? get() = ownerPhone
    val alternateContact: String? get() = ownerPhone2
    val email: String? get() = ownerEmail
    val latitude: Double? get() = null
    val longitude: Double? get() = null
    val photos: List<String> get() = listOfNotNull(imageUrl)
    val photoUrls: List<String> get() = listOfNotNull(imageUrl)
    val allPhotos: List<String> get() = listOfNotNull(imageUrl)
    val createdAt: String? get() = reportedAt
}

data class MissingPetsResponse(
    val success: Boolean = false,
    @SerializedName("missing_pets") val missingPets: List<MissingPet>? = null
)

data class MissingPetReportRequest(
    val petName: String,
    val type: String,
    val breed: String,
    val gender: String,
    val age: String? = null,
    val weight: String? = null,
    val colorAppearance: String,
    val description: String,
    val distinctiveFeatures: String? = null,
    val imageUrl: String? = null,
    val lastSeenLocation: String,
    val lastSeenDate: String,
    val rewardOffered: String? = null,
    val ownerName: String,
    val ownerEmail: String,
    val ownerPhone: String,
    val ownerPhone2: String? = null
)

data class MissingPetResponse(
    val success: Boolean = false,
    val message: String? = null,
    @SerializedName("missing_pet") val missingPet: MissingPet? = null
)

data class MissingPetDetailResponse(
    val success: Boolean = false,
    @SerializedName("missing_pet") val missingPet: MissingPet? = null,
    val sightings: List<Sighting>? = null
)

data class SightingReportRequest(
    val reporterName: String,
    val reporterEmail: String,
    val reporterPhone: String,
    val locationSeen: String,
    val dateSeen: String,
    val description: String,
    val imageUrl: String? = null
)

@Parcelize
data class Sighting(
    val id: Int = 0,
    val lostPetId: Int? = null,
    val reporterName: String? = null,
    val reporterEmail: String? = null,
    val reporterPhone: String? = null,
    val locationSeen: String? = null,
    val dateSeen: String? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val reportedAt: String? = null
) : Parcelable {
    val sightingId: Int get() = id
    val missingPetId: Int? get() = lostPetId
    val location: String? get() = locationSeen
    val latitude: Double? get() = null
    val longitude: Double? get() = null
    val sightingDate: String? get() = dateSeen ?: reportedAt
    val photos: List<String> get() = listOfNotNull(imageUrl)
    val photoUrls: List<String> get() = listOfNotNull(imageUrl)
    val allPhotos: List<String> get() = listOfNotNull(imageUrl)
    val createdAt: String? get() = reportedAt
}

@Parcelize
data class AdoptionApplication(
    val id: Int = 0,
    val petId: Int = 0,
    val petName: String? = null,
    val petImageUrl: String? = null,
    val petType: String? = null,
    val userId: Int? = null,
    val fullName: String = "",
    val email: String = "",
    val phone: String = "",
    val homeAddress: String = "",
    val previousPetExperience: String? = null,
    val whyAdopt: String? = null,
    val whyChooseYou: String? = null,
    val adminRemark: String? = null,
    val status: String = "Pending",
    val submittedAt: String? = null,
    val updatedAt: String? = null
) : Parcelable {
    val applicationId: Int get() = id
    val phoneNumber: String get() = phone
    val shelterName: String? get() = null
    val createdAt: String? get() = submittedAt
    val reviewedAt: String? get() = updatedAt
}

data class MyReportsResponse(
    val success: Boolean = false,
    @SerializedName("missing_pets") val missingPets: List<MissingPet>? = null,
    val applications: List<AdoptionApplication>? = null
)

@Parcelize
data class Animal(
    @SerializedName("animal_id") val animalId: Int = 0,
    @SerializedName("common_name") val commonName: String = "",
    @SerializedName("scientific_name") val scientificName: String? = null,
    val species: String? = null,
    val category: String? = null,
    val habitat: String? = null,
    @SerializedName("conservation_status") val conservationStatus: String? = null,
    val diet: String? = null,
    val lifespan: String? = null,
    @SerializedName("size_weight") val sizeWeight: String? = null,
    val description: String? = null,
    @SerializedName("interesting_facts") val interestingFacts: String? = null,
    val photos: List<String>? = null,
    @SerializedName("view_count") val viewCount: Int = 0
) : Parcelable

data class EncyclopediaResponse(val success: Boolean = false, val animals: List<Animal>? = null)
data class AnimalDetailResponse(val success: Boolean = false, val animal: Animal? = null)

@Parcelize
data class Notification(
    val id: String = "",
    val kind: String = "",
    val title: String = "",
    val message: String = "",
    val route: String = "",
    @SerializedName("createdAt") val createdAt: String? = null,
    val isRead: Boolean = false
) : Parcelable {
    val notificationId: String get() = id
}

data class NotificationsResponse(
    val scope: String = "user",
    val notifications: List<Notification>? = null
)
