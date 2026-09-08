package com.example.urbaneye

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalPermissionsApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        org.osmdroid.config.Configuration.getInstance().load(applicationContext, getSharedPreferences("osmdroid", android.content.Context.MODE_PRIVATE))
        org.osmdroid.config.Configuration.getInstance().userAgentValue = packageName
        
        // Force clear the disk cache to remove any previously downloaded 403 error tiles
        Thread {
            try {
                val tileWriter = org.osmdroid.tileprovider.modules.SqlTileWriter()
                tileWriter.purgeCache()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    var loggedInRole by remember { mutableStateOf<String?>(null) }
                    
                    if (loggedInRole == null) {
                        LoginScreen { role ->
                            loggedInRole = role
                        }
                    } else {
                        val permissionsState = rememberMultiplePermissionsState(
                            permissions = listOf(
                                Manifest.permission.CAMERA,
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                        
                        if (permissionsState.allPermissionsGranted) {
                            when (loggedInRole) {
                                "admin" -> AdminScreen()
                                "citizen" -> CitizenScreen()
                                "worker" -> WorkerScreen()
                                else -> LoginScreen { loggedInRole = it }
                            }
                        } else {
                            PermissionScreen(permissionsState)
                        }
                    }
                }
            }
        }
    }
}
