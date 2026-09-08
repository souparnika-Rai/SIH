package com.example.urbaneye

import android.graphics.Bitmap
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object GeminiManager {
    // IMPORTANT: Ensure you use a valid Gemini API Key from Google AI Studio.
    private const val API_KEY = "YOUR_API_KEY_HERE"

    private val model = GenerativeModel(
        modelName = "gemini-1.5-flash",
        apiKey = API_KEY,
    )

    private val PROMPT = """
        You are an expert in public infrastructure inspection and urban maintenance. 
        Your task is to analyze the provided image and accurately identify ANY public infrastructure defects.
        
        Detailed Categories and Examples to Look For:
        1. Roads & Transport: Potholes, uneven surfaces, faded or missing lane markings, broken traffic signals, poor street lighting, damaged pedestrian crossings, overcrowded/poorly maintained public transport.
        2. Buildings & Facilities: Cracked walls/ceilings in public buildings (offices, schools), broken public toilets, non-functional elevators or escalators in stations, poor ventilation in waiting halls.
        3. Water & Drainage: Leaking water pipelines, open or clogged drains (look for foul smell indicators or debris), overflowing sewage systems, broken or missing manhole covers.
        4. Electricity & Communication: Exposed electric wires on poles, damaged power infrastructure, non-functional public Wi-Fi spots (physical damage), broken telephone booths.
        5. Public Spaces: Broken benches or play equipment in parks, garbage piles or irregular waste collection, damaged footpaths, encroachment on sidewalks.
        6. Health & Safety: Broken/missing streetlights in unsafe areas, lack of emergency facilities, poor fire safety measures (missing extinguishers/blocked exits).

        Output Requirements:
        - Be extremely accurate. Distinguish clearly between similar issues (e.g., a broken streetlight vs a power pole).
        - Identify the specific defect and its category.
        - Estimate the severity: Low (minor issue), Medium (requires attention), High (dangerous or critical).
        - If no defect is found, response should indicate 'No defect'.

        Return the result ONLY in this JSON format:
        {
          "defect_type": "Specific Defect Name",
          "category": "Category Name",
          "severity": "Low/Medium/High",
          "description": "Concise explanation of the findings"
        }
    """.trimIndent()

    suspend fun analyzeInfrastructure(bitmap: Bitmap): GeminiResult? = withContext(Dispatchers.IO) {
        try {
            val response = model.generateContent(
                content {
                    image(bitmap)
                    text(PROMPT)
                }
            )
            
            val responseText = response.text ?: return@withContext null
            parseGeminiResponse(responseText)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun parseGeminiResponse(jsonString: String): GeminiResult? {
        return try {
            val cleanJson = jsonString.replace("```json", "").replace("```", "").trim()
            
            val type = getValue(cleanJson, "defect_type")
            val category = getValue(cleanJson, "category")
            val severity = getValue(cleanJson, "severity")
            val desc = getValue(cleanJson, "description")
            
            if (type != null && severity != null && !type.contains("No defect", true)) {
                GeminiResult(type, severity, category ?: "General", desc ?: "")
            } else null
        } catch (ignored: Exception) {
            null
        }
    }

    private fun getValue(json: String, key: String): String? {
        val pattern = "\"$key\"\\s*:\\s*\"([^\"]*)\"".toRegex()
        return pattern.find(json)?.groupValues?.get(1)
    }
}

data class GeminiResult(
    val defectType: String,
    val severity: String,
    val category: String,
    val description: String
)
