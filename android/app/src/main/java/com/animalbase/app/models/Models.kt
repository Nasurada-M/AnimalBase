package com.animalbase.app.models

import android.os.Parcelable
import com.google.gson.annotations.SerializedName
import kotlinx.parcelize.Parcelize

// ─── Request Models ───────────────────────────────────────────────────────────

data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val full_name: String, val email: String, val password: String, val phone_number: String? = null, val address: String? = null)
data class ForgotPasswordRequest(val email: String)
data class UpdateProfileRequest(val full_name: String? = null, val phone_number: String? = null, val alternate_phone: String? = null, val address: String? = null, val email: String? = null)
data class ChangePasswordRequest(val current_password: String, val new_password: String)
data class StatusUpdateRequest(val status: String)
data class AdoptionApplicationRequest(
    val pet_id: Int,
    val full_name: String,
    val email: String,
    val phone_number: String,
    val home_address: String,
    val previous_pet_experience: String? = null,
    val why_adopt: String,
    val why_chosen: String? = null
)

// ─── Response Models ─────────────────────────────────────────────────────────

data class ApiResponse(val success: Boolean, val message: String)
data class PhotoUploadResponse(val success: Boolean, val photo_url: String?, val message: String)

data class AuthResponse(
    val success: Boolean,
    val message: String,
    val token: String?,
    val user: User?
)

@Parcelize
data class User(
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("full_name") val fullName: String = "",
    val email: String = "",
    @SerializedName("phone_number") val phoneNumber: String? = null,
    @SerializedName("alternate_phone") val alternatePhone: String? = null,
    val address: String? = null,
    @SerializedName("profile_photo") val profilePhoto: String? = null,
    @SerializedName("profile_photo_url") val profilePhotoUrl: String? = null,
    @SerializedName("member_since") val memberSince: String? = null,
    @SerializedName("push_notifications") val pushNotifications: Boolean = true,
    @SerializedName("email_notifications") val emailNotifications: Boolean = true,
    @SerializedName("show_profile_publicly") val showProfilePublicly: Boolean = false,
    @SerializedName("share_location") val shareLocation: Boolean = false
) : Parcelable

data class UserProfileResponse(val success: Boolean, val user: User?)

@Parcelize
data class Pet(
    @SerializedName("pet_id") val petId: Int = 0,
    @SerializedName("pet_name") val petName: String = "",
    @SerializedName("pet_type") val petType: String = "",
    val breed: String? = null,
    val gender: String? = null,
    @SerializedName("age_category") val ageCategory: String? = null,
    @SerializedName("age_months") val ageMonths: Int? = null,
    val weight: String? = null,
    @SerializedName("color_appearance") val colorAppearance: String? = null,
    val description: String? = null,
    @SerializedName("distinctive_features") val distinctiveFeatures: String? = null,
    val status: String = "Available",
    val photos: List<String>? = null,
    @SerializedName("photo_urls") val photoUrls: List<String>? = null,
    @SerializedName("current_location") val currentLocation: String? = null,
    @SerializedName("shelter_name") val shelterName: String? = null,
    @SerializedName("shelter_address") val shelterAddress: String? = null,
    @SerializedName("shelter_phone") val shelterPhone: String? = null,
    @SerializedName("shelter_email") val shelterEmail: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
) : Parcelable

data class PetsResponse(val success: Boolean, val pets: List<Pet>?, val total: Int = 0)
data class PetDetailResponse(val success: Boolean, val pet: Pet?)

@Parcelize
data class MissingPet(
    @SerializedName("missing_pet_id") val missingPetId: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("pet_name") val petName: String = "",
    @SerializedName("pet_type") val petType: String = "",
    val breed: String? = null,
    val gender: String? = null,
    @SerializedName("age_category") val ageCategory: String? = null,
    @SerializedName("color_appearance") val colorAppearance: String? = null,
    val description: String? = null,
    @SerializedName("distinctive_features") val distinctiveFeatures: String? = null,
    @SerializedName("date_last_seen") val dateLastSeen: String = "",
    @SerializedName("location_last_seen") val locationLastSeen: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("contact_number") val contactNumber: String = "",
    @SerializedName("alternate_contact") val alternateContact: String? = null,
    val email: String = "",
    @SerializedName("reward_offered") val rewardOffered: Double? = null,
    val photos: List<String>? = null,
    @SerializedName("photo_urls") val photoUrls: List<String>? = null,
    val status: String = "Missing",
    @SerializedName("owner_name") val ownerName: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
) : Parcelable

data class MissingPetsResponse(val success: Boolean, @SerializedName("missing_pets") val missingPets: List<MissingPet>?)
data class MissingPetResponse(val success: Boolean, val message: String?, @SerializedName("missing_pet") val missingPet: MissingPet?)
data class MissingPetDetailResponse(val success: Boolean, @SerializedName("missing_pet") val missingPet: MissingPet?, val sightings: List<Sighting>?)

@Parcelize
data class Sighting(
    @SerializedName("sighting_id") val sightingId: Int = 0,
    @SerializedName("missing_pet_id") val missingPetId: Int? = null,
    @SerializedName("reporter_name") val reporterName: String? = null,
    @SerializedName("reporter_email") val reporterEmail: String = "",
    @SerializedName("animal_type") val animalType: String? = null,
    @SerializedName("color_appearance") val colorAppearance: String? = null,
    val description: String? = null,
    @SerializedName("sighting_date") val sightingDate: String = "",
    val location: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val photos: List<String>? = null,
    @SerializedName("photo_urls") val photoUrls: List<String>? = null,
    val status: String = "Pending",
    @SerializedName("created_at") val createdAt: String? = null
) : Parcelable

@Parcelize
data class AdoptionApplication(
    @SerializedName("application_id") val applicationId: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("pet_id") val petId: Int = 0,
    @SerializedName("full_name") val fullName: String = "",
    val email: String = "",
    @SerializedName("phone_number") val phoneNumber: String = "",
    @SerializedName("home_address") val homeAddress: String = "",
    @SerializedName("why_adopt") val whyAdopt: String? = null,
    val status: String = "Under Review",
    val notes: String? = null,
    @SerializedName("pet_name") val petName: String? = null,
    @SerializedName("pet_type") val petType: String? = null,
    @SerializedName("shelter_name") val shelterName: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("reviewed_at") val reviewedAt: String? = null
) : Parcelable

data class AdoptionResponse(val success: Boolean, val message: String?, val application: AdoptionApplication?)
data class ApplicationsResponse(val success: Boolean, val applications: List<AdoptionApplication>?)
data class ApplicationDetailResponse(val success: Boolean, val application: AdoptionApplication?)
data class MyReportsResponse(val success: Boolean, @SerializedName("missing_pets") val missingPets: List<MissingPet>?, val applications: List<AdoptionApplication>?)

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

data class EncyclopediaResponse(val success: Boolean, val animals: List<Animal>?)
data class AnimalDetailResponse(val success: Boolean, val animal: Animal?)

@Parcelize
data class Notification(
    @SerializedName("notification_id") val notificationId: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    val type: String = "",
    val title: String = "",
    val message: String = "",
    @SerializedName("related_id") val relatedId: Int? = null,
    @SerializedName("is_read") val isRead: Boolean = false,
    @SerializedName("created_at") val createdAt: String? = null
) : Parcelable

data class NotificationsResponse(val success: Boolean, val notifications: List<Notification>?, @SerializedName("unread_count") val unreadCount: Int = 0)
