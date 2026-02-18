package com.animalbase.app.api

import com.animalbase.app.models.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<ApiResponse>

    // Users
    @GET("api/users/profile")
    suspend fun getProfile(): Response<UserProfileResponse>

    @PUT("api/users/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<UserProfileResponse>

    @Multipart
    @POST("api/users/profile-photo")
    suspend fun uploadProfilePhoto(
        @Part photo: MultipartBody.Part
    ): Response<PhotoUploadResponse>

    @PUT("api/users/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<ApiResponse>

    @GET("api/users/my-reports")
    suspend fun getMyReports(): Response<MyReportsResponse>

    // Pets (Adoption)
    @GET("api/pets")
    suspend fun getPets(
        @Query("type") type: String? = null,
        @Query("status") status: String? = "Available",
        @Query("search") search: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<PetsResponse>

    @GET("api/pets/{id}")
    suspend fun getPetById(@Path("id") id: Int): Response<PetDetailResponse>

    // Missing Pets
    @GET("api/missing-pets")
    suspend fun getMissingPets(
        @Query("status") status: String? = null,
        @Query("pet_type") petType: String? = null,
        @Query("search") search: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<MissingPetsResponse>

    @GET("api/missing-pets/{id}")
    suspend fun getMissingPetById(@Path("id") id: Int): Response<MissingPetDetailResponse>

    @Multipart
    @POST("api/missing-pets")
    suspend fun reportMissingPet(
        @Part("pet_name") petName: RequestBody,
        @Part("pet_type") petType: RequestBody,
        @Part("breed") breed: RequestBody?,
        @Part("gender") gender: RequestBody?,
        @Part("age_category") ageCategory: RequestBody?,
        @Part("color_appearance") colorAppearance: RequestBody?,
        @Part("description") description: RequestBody?,
        @Part("distinctive_features") distinctiveFeatures: RequestBody?,
        @Part("date_last_seen") dateLastSeen: RequestBody,
        @Part("location_last_seen") locationLastSeen: RequestBody,
        @Part("latitude") latitude: RequestBody?,
        @Part("longitude") longitude: RequestBody?,
        @Part("contact_number") contactNumber: RequestBody,
        @Part("alternate_contact") alternateContact: RequestBody?,
        @Part("email") email: RequestBody,
        @Part("reward_offered") rewardOffered: RequestBody?,
        @Part photos: List<MultipartBody.Part>?
    ): Response<MissingPetResponse>

    @PUT("api/missing-pets/{id}/status")
    suspend fun updateMissingPetStatus(
        @Path("id") id: Int,
        @Body request: StatusUpdateRequest
    ): Response<ApiResponse>

    // Sightings
    @Multipart
    @POST("api/sightings")
    suspend fun reportSighting(
        @Part("missing_pet_id") missingPetId: RequestBody?,
        @Part("reporter_name") reporterName: RequestBody?,
        @Part("reporter_email") reporterEmail: RequestBody,
        @Part("reporter_phone") reporterPhone: RequestBody?,
        @Part("animal_type") animalType: RequestBody,
        @Part("breed") breed: RequestBody?,
        @Part("color_appearance") colorAppearance: RequestBody?,
        @Part("description") description: RequestBody?,
        @Part("sighting_date") sightingDate: RequestBody,
        @Part("location") location: RequestBody,
        @Part("latitude") latitude: RequestBody?,
        @Part("longitude") longitude: RequestBody?,
        @Part("is_unidentified") isUnidentified: RequestBody?,
        @Part photos: List<MultipartBody.Part>?
    ): Response<ApiResponse>

    // Adoptions
    @POST("api/adoptions")
    suspend fun submitAdoptionApplication(@Body request: AdoptionApplicationRequest): Response<AdoptionResponse>

    @GET("api/adoptions/my-applications")
    suspend fun getMyApplications(): Response<ApplicationsResponse>

    @GET("api/adoptions/{id}")
    suspend fun getApplicationById(@Path("id") id: Int): Response<ApplicationDetailResponse>

    // Encyclopedia
    @GET("api/encyclopedia")
    suspend fun getAnimals(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<EncyclopediaResponse>

    @GET("api/encyclopedia/{id}")
    suspend fun getAnimalById(@Path("id") id: Int): Response<AnimalDetailResponse>

    @POST("api/encyclopedia/favorites/{animalId}")
    suspend fun addToFavorites(@Path("animalId") animalId: Int): Response<ApiResponse>

    @DELETE("api/encyclopedia/favorites/{animalId}")
    suspend fun removeFromFavorites(@Path("animalId") animalId: Int): Response<ApiResponse>

    // Notifications
    @GET("api/notifications")
    suspend fun getNotifications(): Response<NotificationsResponse>

    @PUT("api/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Int): Response<ApiResponse>

    @PUT("api/notifications/read-all")
    suspend fun markAllRead(): Response<ApiResponse>
}
