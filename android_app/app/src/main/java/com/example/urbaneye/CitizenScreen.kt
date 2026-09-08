package com.example.urbaneye

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.location.Geocoder
import android.location.Location
import android.net.Uri
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.util.Locale
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CitizenScreen() {
    var selectedTab by remember { mutableStateOf("Manual Photo") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Surface(
            tonalElevation = 2.dp,
            shape = RoundedCornerShape(12.dp),
            color = Color(0xFFF3F4F6),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
        ) {
            Row(modifier = Modifier.padding(4.dp)) {
                TabButton(
                    text = "Manual Photo",
                    selected = selectedTab == "Manual Photo",
                    onClick = { selectedTab = "Manual Photo" },
                    modifier = Modifier.weight(1f)
                )
                TabButton(
                    text = "Automated Video",
                    selected = selectedTab == "Automated Video",
                    onClick = { selectedTab = "Automated Video" },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        if (selectedTab == "Manual Photo") {
            ManualReportForm()
        } else {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(400.dp)
                    .clip(RoundedCornerShape(16.dp))
            ) {
                CameraScreen()
            }
        }
    }
}

@SuppressLint("MissingPermission")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualReportForm() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var contact by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var currentLocation by remember { mutableStateOf<Location?>(null) }
    var locationName by remember { mutableStateOf("Fetching location...") }
    var isCameraOpen by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    
    // AI analysis results
    var defectType by remember { mutableStateOf("") }
    var severity by remember { mutableStateOf("") }
    var isAnalyzing by remember { mutableStateOf(false) }

    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    // Logic to perform Gemini Analysis
    fun performAIAnalysis(bitmap: Bitmap) {
        isAnalyzing = true
        scope.launch {
            val result = GeminiManager.analyzeInfrastructure(bitmap)
            if (result != null) {
                defectType = result.defectType
                severity = result.severity
                if (notes.isEmpty()) notes = result.description
            } else {
                // Fallback to local logic if Gemini fails
                analyzeImageLocally(bitmap) { type, sev ->
                    defectType = type
                    severity = sev
                }
            }
            isAnalyzing = false
        }
    }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val inputStream = context.contentResolver.openInputStream(it)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            capturedBitmap = bitmap
            if (bitmap != null) {
                performAIAnalysis(bitmap)
            }
        }
    }

    LaunchedEffect(Unit) {
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            currentLocation = location
            if (location != null) {
                scope.launch(Dispatchers.IO) {
                    try {
                        val geocoder = Geocoder(context, Locale.getDefault())
                        val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                        if (!addresses.isNullOrEmpty()) {
                            locationName = addresses[0].getAddressLine(0)
                        }
                    } catch (e: Exception) {
                        locationName = "${location.latitude}, ${location.longitude}"
                    }
                }
            }
        }
    }

    if (isCameraOpen) {
        CameraCaptureView(
            onImageCaptured = { bitmap ->
                capturedBitmap = bitmap
                isCameraOpen = false
                performAIAnalysis(bitmap)
            },
            onClose = { isCameraOpen = false }
        )
    } else {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (capturedBitmap != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.Black)
                ) {
                    Image(
                        bitmap = capturedBitmap!!.asImageBitmap(),
                        contentDescription = "Selected Image",
                        modifier = Modifier.fillMaxSize()
                    )
                    
                    if (isAnalyzing) {
                        Box(Modifier.fillMaxSize().background(Color.Black.copy(0.4f)), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color.White)
                        }
                    }

                    IconButton(
                        onClick = { capturedBitmap = null; defectType = ""; severity = ""; notes = "" },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.White)
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    DashedUploadBox(
                        icon = Icons.Default.AddAPhoto,
                        label = "Use Camera",
                        onClick = { isCameraOpen = true },
                        modifier = Modifier.weight(1f)
                    )
                    DashedUploadBox(
                        icon = Icons.Default.FileUpload,
                        label = "Upload File",
                        onClick = { filePickerLauncher.launch("image/*") },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // AI Detection Fields
            if (defectType.isNotEmpty() || isAnalyzing) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("AI Assessment (Review & Edit)", style = MaterialTheme.typography.labelLarge, color = Color(0xFF3B82F6))
                    OutlinedTextField(
                        value = defectType,
                        onValueChange = { defectType = it },
                        label = { Text("Infrastructure Defect") },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Default.AutoAwesome, null, tint = Color(0xFF3B82F6)) },
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = severity,
                        onValueChange = { severity = it },
                        label = { Text("Severity") },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(Icons.Default.Warning, null, tint = Color(0xFFFFA500)) },
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            // Citizen Info
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Reporter Name") },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Default.Person, null) },
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = contact,
                onValueChange = { contact = it },
                label = { Text("Phone Number") },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Default.Phone, null) },
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Description & Notes") },
                modifier = Modifier.fillMaxWidth().height(100.dp),
                shape = RoundedCornerShape(12.dp)
            )

            // Location
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF9FAFB), RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFE5E7EB), modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.LocationOn, null, Modifier.padding(6.dp), Color.Gray)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("Location Captured", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text(locationName, color = Color.Gray, fontSize = 12.sp)
                    }
                }
            }

            // Submit Button
            Button(
                onClick = {
                    if (capturedBitmap != null) {
                        isSubmitting = true
                        scope.launch {
                            try {
                                submitManualReport(
                                    capturedBitmap!!, name, contact, "Defect: $defectType | Severity: $severity | Notes: $notes", currentLocation
                                )
                                capturedBitmap = null
                                defectType = ""
                                severity = ""
                                notes = ""
                            } catch (e: Exception) {
                                Log.e("CitizenScreen", "Submission failed", e)
                            } finally {
                                isSubmitting = false
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(12.dp),
                enabled = capturedBitmap != null && !isSubmitting && name.isNotEmpty() && contact.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CloudUpload, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Submit Report", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

fun analyzeImageLocally(bitmap: Bitmap, onResult: (String, String) -> Unit) {
    // Basic fallback simulation
    Executors.newSingleThreadExecutor().execute {
        Thread.sleep(800)
        onResult("Unspecified Defect", "Review Required")
    }
}

@Composable
fun CameraCaptureView(onImageCaptured: (Bitmap) -> Unit, onClose: () -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }
    val previewView = remember { PreviewView(context) }
    val imageCapture = remember { ImageCapture.Builder().build() }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
        LaunchedEffect(Unit) {
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageCapture)
        }
        Row(
            modifier = Modifier.fillMaxWidth().align(Alignment.BottomCenter).padding(bottom = 48.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose, modifier = Modifier.size(56.dp).background(Color.Black.copy(0.5f), RoundedCornerShape(28.dp))) {
                Icon(Icons.Default.Close, null, tint = Color.White)
            }
            Button(
                onClick = {
                    imageCapture.takePicture(cameraExecutor, object : ImageCapture.OnImageCapturedCallback() {
                        override fun onCaptureSuccess(image: ImageProxy) {
                            val bitmap = image.toBitmapCustom()
                            image.close()
                            if (bitmap != null) onImageCaptured(bitmap)
                        }
                    })
                },
                modifier = Modifier.size(80.dp),
                shape = RoundedCornerShape(40.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.White)
            ) {
                Icon(Icons.Default.Camera, null, tint = Color.Black, modifier = Modifier.size(40.dp))
            }
        }
    }
}

suspend fun submitManualReport(bitmap: Bitmap, name: String, contact: String, notes: String, location: Location?): Issue {
    return withContext(Dispatchers.IO) {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)
        val imagePart = MultipartBody.Part.createFormData("image", "report.jpg", stream.toByteArray().toRequestBody("image/jpeg".toMediaTypeOrNull()))
        val nameBody = name.toRequestBody("text/plain".toMediaTypeOrNull())
        val contactBody = contact.toRequestBody("text/plain".toMediaTypeOrNull())
        val notesBody = notes.toRequestBody("text/plain".toMediaTypeOrNull())
        val latBody = (location?.latitude ?: 0.0).toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val lngBody = (location?.longitude ?: 0.0).toString().toRequestBody("text/plain".toMediaTypeOrNull())
        NetworkManager.api.reportIssue(imagePart, nameBody, contactBody, notesBody, latBody, lngBody)
    }
}

@Composable
fun TabButton(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) Color.White else Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, fontWeight = FontWeight.Bold, color = if (selected) Color(0xFF3B82F6) else Color.Gray, fontSize = 14.sp)
    }
}

@Composable
fun DashedUploadBox(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit, modifier: Modifier) {
    Box(
        modifier = modifier
            .height(120.dp)
            .border(width = 1.dp, color = Color.LightGray, shape = RoundedCornerShape(16.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, modifier = Modifier.size(32.dp), tint = Color.Gray)
            Spacer(modifier = Modifier.height(8.dp))
            Text(label, fontWeight = FontWeight.Medium, color = Color.Gray, fontSize = 14.sp)
        }
    }
}
