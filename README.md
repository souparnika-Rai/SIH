# UrbanEye - SIH Problem Statement 26124 Mapping

**Problem Statement ID:** 26124
**Problem Statement Title:** AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet
**Theme:** Smart Automation / Urban Mobility

## Overview

UrbanEye is an AI-powered platform designed to map perfectly to SIH Problem Statement 26124. Our solution transforms vehicles (such as public transport buses) and citizen reporting into mobile urban sensing units. By capturing visual data of the streets, we use artificial intelligence to instantly detect, classify, and map urban infrastructure defects and hazards.

## How Our Current Prototype Maps to the SIH Requirements

### 1. Mobile Urban Sensing Units (The Edge / Data Collection)
- **SIH Requirement:** Transform public transport buses into mobile urban sensing units by analyzing video streams from multiple bus-mounted cameras.
- **Our Solution:** Currently, our frontend application acts as a simulation of the bus-mounted camera system. It captures images of the road environment and sends them to our AI processing pipeline. In a production deployment, this capture interface will run autonomously as an edge application on the bus hardware, continuously sampling frames from the video stream.

### 2. AI-Powered Defect Detection
- **SIH Requirement:** Detect road defects such as potholes, damaged roads, missing road dividers, damaged signboards, waterlogging, and hazards.
- **Our Solution:** Our backend is integrated with Gemini Vision AI (`gemini-3.6-flash`), which successfully analyzes the captured images and accurately identifies the primary infrastructure issue. We currently extract:
  - **Defect Category:** Pothole, Road Crack, Broken Streetlight, Drainage Problem, etc.
  - **Severity & Priority Score:** Automatically computed based on the AI's assessment of the hazard level to optimize maintenance response.
  - **Confidence Score:** To ensure reliability.

### 3. Centralized GIS & Urban Intelligence Platform
- **SIH Requirement:** A centralized platform to aggregate information from the entire fleet, visualize events on a GIS map, and identify infrastructure deficiencies.
- **Our Solution:** Our system automatically maps all detected defects using GPS coordinates. 
  - **Citizen/Driver App:** Captures the data with precise latitude and longitude.
  - **GIS Dashboard:** We have built a robust React-based frontend utilizing mapping libraries (MapLibre/MapGL) to plot these points, providing a real-time situational overview for city authorities.

### 4. Proactive Maintenance & Reporting
- **SIH Requirement:** Support proactive road maintenance and evidence-based decision making.
- **Our Solution:** Our backend acts as a central command system, aggregating the alerts. We also include a "Worker Verification" loop, where repair workers can upload images of fixed defects. Our AI automatically verifies the repair work, closing the loop between defect identification and resolution.

## Future Roadmap to Fully Meet PS 26124
While our current prototype successfully demonstrates the core intelligence and centralized platform, we plan to implement the following for the final SIH submission:
1. **True Edge-AI Processing:** Transitioning from cloud-based Gemini inference to a lightweight Edge-AI model (e.g., YOLOv8) running directly on the bus hardware to minimize bandwidth and process video streams locally.
2. **Traffic Analytics:** Incorporating vehicle counting and congestion detection modules into the edge pipeline.
3. **Number Plate Extraction (ANPR):** Implementing hit-and-run detection with automated license plate recognition and timestamp logging. 

## Getting Started
- **Backend:** FastAPI server running on Python (Port 8000). Provides AI analysis and central database.
- **Frontend:** React application using Vite (Port 5173). Provides the GIS map, worker dashboard, and capture interfaces.

---
*Developed for Smart India Hackathon 2026*
