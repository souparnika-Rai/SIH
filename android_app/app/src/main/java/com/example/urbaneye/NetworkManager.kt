package com.example.urbaneye

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

const val BASE_URL = "http://10.21.47.102:8000/"

data class BoxResponse(val boxes: List<DetectedBox>?)
data class DetectedBox(val x: Float, val y: Float, val w: Float, val h: Float)

data class Issue(
    val id: Int,
    val type: String,
    val confidence: String,
    val severity: String,
    val priority: Int,
    val location: String,
    val lat: Double,
    val lng: Double,
    val status: String,
    val date: String,
    val image: String,
    val assignedDept: String? = null
)

interface ApiService {
    @Multipart
    @POST("detect-frame")
    suspend fun detectFrame(@Part image: MultipartBody.Part): BoxResponse

    @Multipart
    @POST("report-issue")
    suspend fun reportIssue(
        @Part image: MultipartBody.Part,
        @Part("name") name: RequestBody,
        @Part("contact") contact: RequestBody,
        @Part("notes") notes: RequestBody,
        @Part("lat") lat: RequestBody,
        @Part("lng") lng: RequestBody,
    ): Issue

    @GET("issues")
    suspend fun getIssues(): List<Issue>

    @PUT("issues/{issue_id}/status")
    suspend fun updateIssueStatus(
        @Path("issue_id") issueId: Int,
        @Query("status") status: String,
    ): Issue
    
    @PUT("issues/{issue_id}/assign")
    suspend fun assignIssueDept(
        @Path("issue_id") issueId: Int,
        @Query("dept") dept: String,
    ): Issue
}

object NetworkManager {
    val api: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
