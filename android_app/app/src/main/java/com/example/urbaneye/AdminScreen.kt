package com.example.urbaneye

import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminScreen() {
    var issues by remember { mutableStateOf<List<Issue>>(emptyList()) }
    var viewMode by remember { mutableStateOf("Map") } // "Map" or "List"
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            issues = NetworkManager.api.getIssues()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Visibility,
                            contentDescription = null,
                            tint = Color(0xFF6366F1),
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("UrbanEye", fontWeight = FontWeight.ExtraBold, color = Color(0xFF1E293B), fontSize = 20.sp)
                    }
                },
                actions = {
                    TextButton(onClick = {}) { Text("Citizen", color = Color.Gray, fontSize = 14.sp) }
                    TextButton(onClick = {}) { Text("Admin", color = Color(0xFF6366F1), fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                    TextButton(onClick = {}) { Text("Worker", color = Color.Gray, fontSize = 14.sp) }
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color.LightGray),
                        modifier = Modifier.padding(end = 12.dp)
                    ) {
                        Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("English", fontSize = 12.sp)
                            Icon(Icons.Default.ArrowDropDown, null, Modifier.size(16.dp))
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Row(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(Color(0xFFF8FAFC))
        ) {
            // Sidebar Area
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(12.dp)
            ) {
                Text("Admin Panel", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                Text("AI Defect Analysis", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                
                Spacer(Modifier.height(16.dp))
                
                // Status Grid
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatusBox("PENDING", issues.count { it.status.lowercase() == "pending" }.toString(), Color(0xFFFEF2F2), Color(0xFFEF4444), Modifier.weight(1f))
                        StatusBox("ASSIGNED", issues.count { it.assignedDept != null }.toString(), Color(0xFFFFFBEB), Color(0xFFF59E0B), Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatusBox("COMPLETED", issues.count { it.status.lowercase() == "resolved" }.toString(), Color(0xFFEFF6FF), Color(0xFF3B82F6), Modifier.weight(1f))
                        StatusBox("DECLINED", "0", Color(0xFFFFF7ED), Color(0xFFF97316), Modifier.weight(1f))
                    }
                }
                
                Spacer(Modifier.height(24.dp))
                Text("ACTIVE ALERTS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                Spacer(Modifier.height(8.dp))
                
                if (issues.isEmpty()) {
                    Text("No active issues.", color = Color.LightGray, fontSize = 13.sp)
                } else {
                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(issues) { issue ->
                            Row(modifier = Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
                                Text("•", color = Color(0xFF6366F1), fontWeight = FontWeight.Bold)
                                Spacer(Modifier.width(8.dp))
                                Text("${issue.type} at ${issue.location}", fontSize = 12.sp, color = Color(0xFF475569), lineHeight = 16.sp)
                            }
                        }
                    }
                }
            }

            Divider(modifier = Modifier.fillMaxHeight().width(1.dp), color = Color(0xFFE2E8F0))

            // Main Content Area (Map/List)
            Column(
                modifier = Modifier
                    .weight(2.5f)
                    .fillMaxHeight()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Start
                ) {
                    ViewToggleButton("Map View", Icons.Default.Map, viewMode == "Map") { viewMode = "Map" }
                    Spacer(Modifier.width(8.dp))
                    ViewToggleButton("List View", Icons.Default.List, viewMode == "List") { viewMode = "List" }
                }
                
                Spacer(Modifier.height(16.dp))
                
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    color = Color.White
                ) {
                    if (viewMode == "Map") {
                        AdminMapView(issues)
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize().padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(issues) { issue ->
                                IssueAdminCard(issue) { dept ->
                                    scope.launch {
                                        try {
                                            NetworkManager.api.assignIssueDept(issue.id, dept)
                                            issues = NetworkManager.api.getIssues()
                                        } catch (e: Exception) {
                                            e.printStackTrace()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StatusBox(title: String, count: String, bgColor: Color, textColor: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        color = bgColor,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, textColor.copy(alpha = 0.2f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Info, null, Modifier.size(12.dp), tint = textColor)
                Spacer(Modifier.width(4.dp))
                Text(title, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = textColor)
            }
            Spacer(Modifier.height(2.dp))
            Text(count, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = textColor)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ViewToggleButton(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector, isSelected: Boolean, onClick: () -> Unit) {
    val bgColor = if (isSelected) Color(0xFF2563EB) else Color.White
    val contentColor = if (isSelected) Color.White else Color(0xFF64748B)
    val border = if (isSelected) null else BorderStroke(1.dp, Color(0xFFE2E8F0))

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = bgColor,
        border = border,
        modifier = Modifier.height(40.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, Modifier.size(18.dp), tint = contentColor)
            Spacer(Modifier.width(8.dp))
            Text(text, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = contentColor)
        }
    }
}

@Composable
fun AdminMapView(issues: List<Issue>) {
    var selectedIssue by remember { mutableStateOf<Issue?>(null) }
    val scope = rememberCoroutineScope()

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                MapView(ctx).apply {
                    setTileSource(TileSourceFactory.WIKIMEDIA)
                    setMultiTouchControls(true)
                    // Clear cache to remove 403 tiles
                    tileProvider.clearTileCache()
                    controller.setZoom(13.0)
                    if (issues.isNotEmpty()) {
                        controller.setCenter(GeoPoint(issues.first().lat, issues.first().lng))
                    } else {
                        controller.setCenter(GeoPoint(12.9716, 77.5946))
                    }
                }
            },
            update = { mapView ->
                mapView.overlays.clear()
                issues.forEach { issue ->
                    val marker = Marker(mapView)
                    marker.position = GeoPoint(issue.lat, issue.lng)
                    marker.title = issue.type
                    marker.snippet = "Severity: ${issue.severity}\nStatus: ${issue.status}"
                    marker.setOnMarkerClickListener { _, _ ->
                        selectedIssue = issue
                        true
                    }
                    mapView.overlays.add(marker)
                }
                mapView.invalidate()
            },
            modifier = Modifier.fillMaxSize()
        )
    }

    if (selectedIssue != null) {
        AlertDialog(
            onDismissRequest = { selectedIssue = null },
            title = { Text("Assign Issue #${selectedIssue!!.id}", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(selectedIssue!!.type, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    Text(selectedIssue!!.location, fontSize = 13.sp, color = Color.Gray)
                    Spacer(Modifier.height(20.dp))
                    Text("Select Department:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    val depts = listOf("Roads", "Water", "Electricity", "Health", "Sanitation")
                    Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        depts.forEach { dept ->
                            Button(
                                onClick = {
                                    scope.launch {
                                        try {
                                            NetworkManager.api.assignIssueDept(selectedIssue!!.id, dept)
                                        } catch (e: Exception) { e.printStackTrace() }
                                        selectedIssue = null
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                            ) {
                                Text(dept)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedIssue = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun IssueAdminCard(issue: Issue, onAssign: (String) -> Unit) {
    var showAssignDialog by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { showAssignDialog = true },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Issue #${issue.id}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                StatusBadge(issue.status)
            }
            Spacer(Modifier.height(4.dp))
            Text(issue.type, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF475569))
            Text(issue.location, fontSize = 12.sp, color = Color.Gray)
            
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Assigned Dept:", fontSize = 12.sp, color = Color.Gray)
                Spacer(Modifier.width(8.dp))
                Text(issue.assignedDept ?: "None", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6366F1))
            }
        }
    }

    if (showAssignDialog) {
        AlertDialog(
            onDismissRequest = { showAssignDialog = false },
            title = { Text("Assign Issue #${issue.id}") },
            text = {
                Column {
                    Text("Select Department:", fontWeight = FontWeight.Bold)
                    val depts = listOf("Roads", "Water", "Electricity", "Health", "Sanitation")
                    Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        depts.forEach { dept ->
                            Button(
                                onClick = {
                                    onAssign(dept)
                                    showAssignDialog = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                            ) {
                                Text(dept)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showAssignDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun StatusBadge(status: String) {
    val backgroundColor = when (status.lowercase()) {
        "pending" -> Color(0xFFFEF2F2)
        "in progress" -> Color(0xFFEFF6FF)
        "resolved" -> Color(0xFFECFDF5)
        else -> Color(0xFFF8FAFC)
    }
    val textColor = when (status.lowercase()) {
        "pending" -> Color(0xFFEF4444)
        "in progress" -> Color(0xFF3B82F6)
        "resolved" -> Color(0xFF10B981)
        else -> Color(0xFF64748B)
    }

    Surface(
        color = backgroundColor,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, textColor.copy(alpha = 0.2f))
    ) {
        Text(
            text = status.uppercase(),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp),
            color = textColor,
            fontSize = 10.sp,
            fontWeight = FontWeight.ExtraBold
        )
    }
}
