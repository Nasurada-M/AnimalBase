package com.animalbase.app.api

import com.animalbase.app.models.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("api/auth/send-otp")
    suspend fun sendOtp(@Body request: SendOtpRequest): Response<OtpResponse>

    @POST("api/auth/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<VerifyOtpResponse>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<ApiResponse>

    @GET("api/auth/me")
    suspend fun getProfile(): Response<User>

    @PUT("api/auth/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<User>

    @HTTP(method = "DELETE", path = "api/auth/me", hasBody = true)
    suspend fun deleteAccount(@Body request: DeleteAccountRequest): Response<ApiResponse>

    @Multipart
    @POST("api/users/profile-photo")
    suspend fun uploadProfilePhoto(@Part photo: MultipartBody.Part): Response<PhotoUploadResponse>

    @PUT("api/auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<ApiResponse>

    @GET("api/users/my-reports")
    suspend fun getMyReports(): Response<MyReportsResponse>

    @GET("api/pets")
    suspend fun getPets(
        @Query("type") type: String? = null,
        @Query("status") status: String? = "Available",
        @Query("search") search: String? = null
    ): Response<List<Pet>>

    @GET("api/pets/{id}")
    suspend fun getPetById(@Path("id") id: Int): Response<Pet>

    @GET("api/lost-pets")
    suspend fun getMissingPets(
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<List<MissingPet>>

    @GET("api/lost-pets/{id}")
    suspend fun getMissingPetById(@Path("id") id: Int): Response<MissingPet>

    @PUT("api/lost-pets/{id}/found")
    suspend fun markMissingPetFound(@Path("id") id: Int): Response<MissingPet>

    @GET("api/lost-pets/{id}/sightings")
    suspend fun getSightings(@Path("id") id: Int): Response<List<Sighting>>

    @POST("api/lost-pets")
    suspend fun submitMissingPet(@Body request: MissingPetReportRequest): Response<MissingPet>

    @POST("api/lost-pets/{id}/sightings")
    suspend fun submitSighting(
        @Path("id") id: Int,
        @Body request: SightingReportRequest
    ): Response<Sighting>

    @Multipart
    @POST("api/mobile/lost-pets")
    suspend fun reportMissingPet(
        @Part("petName") petName: RequestBody,
        @Part("petType") petType: RequestBody,
        @Part("breed") breed: RequestBody?,
        @Part("gender") gender: RequestBody?,
        @Part("ageCategory") ageCategory: RequestBody?,
        @Part("colorAppearance") colorAppearance: RequestBody?,
        @Part("description") description: RequestBody?,
        @Part("distinctiveFeatures") distinctiveFeatures: RequestBody?,
        @Part("dateLastSeen") dateLastSeen: RequestBody,
        @Part("locationLastSeen") locationLastSeen: RequestBody,
        @Part("latitude") latitude: RequestBody?,
        @Part("longitude") longitude: RequestBody?,
        @Part("contactNumber") contactNumber: RequestBody,
        @Part("alternateContact") alternateContact: RequestBody?,
        @Part("email") email: RequestBody,
        @Part("rewardOffered") rewardOffered: RequestBody?,
        @Part photos: List<MultipartBody.Part>?
    ): Response<MissingPetResponse>

    @Multipart
    @POST("api/mobile/sightings")
    suspend fun reportSighting(
        @Part("missingPetId") missingPetId: RequestBody?,
        @Part("reporterName") reporterName: RequestBody?,
        @Part("reporterEmail") reporterEmail: RequestBody,
        @Part("reporterPhone") reporterPhone: RequestBody?,
        @Part("animalType") animalType: RequestBody,
        @Part("breed") breed: RequestBody?,
        @Part("colorAppearance") colorAppearance: RequestBody?,
        @Part("description") description: RequestBody?,
        @Part("sightingDate") sightingDate: RequestBody,
        @Part("location") location: RequestBody,
        @Part("latitude") latitude: RequestBody?,
        @Part("longitude") longitude: RequestBody?,
        @Part("isUnidentified") isUnidentified: RequestBody?,
        @Part photos: List<MultipartBody.Part>?
    ): Response<ApiResponse>

    @POST("api/applications")
    suspend fun submitAdoptionApplication(@Body request: AdoptionApplicationRequest): Response<AdoptionApplication>

    @GET("api/applications/my")
    suspend fun getMyApplications(): Response<List<AdoptionApplication>>

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

    @GET("api/notifications")
    suspend fun getNotifications(
        @Query("scope") scope: String? = null
    ): Response<NotificationsResponse>
}
