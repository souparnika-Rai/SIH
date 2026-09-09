from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import List, Optional
from datetime import datetime
import os
import json
import io
import cv2
import tempfile
import shutil
from google import genai
from PIL import Image
from dotenv import load_dotenv
from ultralytics import YOLO

load_dotenv(override=True)

app = FastAPI(title="Infrastructure Defect Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY", "")
if api_key:
    client = genai.Client(api_key=api_key)
    model = True
else:
    client = None
    model = False

# Configure YOLO
try:
    weights_path = os.path.join(os.path.dirname(__file__), '..', 'weights', 'best.pt')
    yolo_model = YOLO(weights_path)
except Exception as e:
    print("Warning: Could not load YOLO pothole model:", e)
    yolo_model = None

class Issue(BaseModel):
    id: int
    type: str
    confidence: str
    severity: str
    priority: int
    location: str
    lat: float
    lng: float
    status: str
    date: str
    image: str
    worker_image: Optional[str] = None
    citizen_name: Optional[str] = None
    citizen_contact: Optional[str] = None
    worker_rating: Optional[int] = None
    worker_feedback: Optional[str] = None
    citizen_rating: Optional[int] = None
    citizen_notes: Optional[str] = None
    ward: Optional[str] = None
    report_count: int = 1

class StatusUpdate(BaseModel):
    status: str
    worker_image: Optional[str] = None
    citizen_rating: Optional[int] = None
    ward: Optional[str] = None

class VerifyRepairRequest(BaseModel):
    worker_image: str

class EdgeDefect(BaseModel):
    type: str
    severity: str
    lat: float
    lng: float
    confidence: str
    priority: int

class TrafficData(BaseModel):
    node_id: str
    lat: float
    lng: float
    timestamp: str
    vehicle_counts: dict
    congestion_level: str

class ANPRAlert(BaseModel):
    node_id: str
    lat: float
    lng: float
    timestamp: str
    license_plate: str
    confidence: float
    report_count: int = 1

issues_db = []
issue_counter = 1

@app.get("/")
def read_root():
    return {"message": "Infrastructure Defect Detection API is running."}

@app.get("/issues", response_model=List[Issue])
def get_issues():
    return issues_db

@app.post("/analyze", response_model=Issue)
async def analyze_image(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    citizen_name: str = Form("Anonymous"),
    citizen_contact: str = Form("N/A"),
    citizen_notes: str = Form(""),
    place_name: str = Form(""),
    skip_analysis: bool = Form(False)
):
    global issue_counter
    
    # Read image bytes
    image_bytes = await image.read()
    
    defect = "Pothole"
    confidence = "90%"
    severity = "High"
    priority_score = 80
    
    if model and not skip_analysis:
        try:
            # Prepare image for Gemini
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            prompt = """
            You are a public infrastructure defect detector. Analyze this image and identify the primary infrastructure or public issue.
            Classify it into a clear, concise category such as 'Pothole', 'Road Crack', 'Broken Streetlight', 'Drainage Problem', 'Garbage Accumulation', 'Fallen Tree', 'Water Leak', 'Vandalism', etc. If it is something else, provide a 2-3 word description.
            
            Return a JSON object with the following keys:
            - type: (the category or short description)
            - confidence: (a string like '95%')
            - severity: (one of 'Low', 'Medium', 'High', 'Critical')
            - priority: (integer from 1 to 100, where 100 is the most critical and urgent)
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[prompt, pil_image],
                config={"response_mime_type": "application/json"}
            )
            text = response.text.strip()
                
            data = json.loads(text)
            
            defect = data.get("type", "Unknown Defect")
            confidence = str(data.get("confidence", "85%"))
            severity = data.get("severity", "Medium")
            priority_score = int(data.get("priority", 50))
        except Exception as e:
            import traceback
            traceback.print_exc()
            try:
                with open("error_log.txt", "w") as f:
                    f.write(traceback.format_exc())
            except:
                pass
            print("Gemini API Error:", e)
            defect = "Infrastructure Defect (Fallback AI)"
            confidence = "85%"
            severity = "Medium"
            priority_score = 60
    else:
        # Mock Fallback
        filename = image.filename.lower() if image.filename else ""
        if "crack" in filename:
            defect = "Road Crack"
        elif "light" in filename or "street" in filename:
            defect = "Broken Streetlight"
        elif "drain" in filename or "water" in filename:
            defect = "Drainage Problem"
            
        confidence = f"{round(random.uniform(85, 99))}%"
        if defect == "Pothole":
            severity = random.choice(["High", "Critical"])
            priority_score = random.randint(70, 95)
        elif defect == "Broken Streetlight":
            severity = "Medium"
            priority_score = random.randint(40, 70)
        else:
            severity = random.choice(["Low", "Medium", "High", "Critical"])
            priority_score = random.randint(10, 100)
            
    import base64
    try:
        img_temp = Image.open(io.BytesIO(image_bytes))
        if img_temp.mode in ("RGBA", "P"):
            img_temp = img_temp.convert("RGB")
        # Resize if too large
        img_temp.thumbnail((800, 800))
        buffer = io.BytesIO()
        img_temp.save(buffer, format="JPEG", quality=80)
        b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        image_url = f"data:image/jpeg;base64,{b64}"
    except Exception as e:
        print("Image processing error:", e)
        image_url = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400"
    
    loc_str = place_name if place_name else f"GPS: {latitude:.4f}, {longitude:.4f}"
    
    # Deduplicate issues logic temporarily disabled for live demo so every detection shows in Admin
    # for existing_issue in issues_db:
    #     if existing_issue.type == defect:
    #         dist = calculate_distance(latitude, longitude, existing_issue.lat, existing_issue.lng)
    #         if dist < 50:
    #             existing_issue.report_count += 1
    #             return existing_issue
    
    new_issue = Issue(
        id=issue_counter,
        type=defect,
        confidence=confidence,
        severity=severity,
        priority=priority_score,
        location=loc_str,
        lat=latitude,
        lng=longitude,
        status="Pending",
        date=datetime.now().strftime("%d %b %Y"),
        image=image_url,
        citizen_name=citizen_name,
        citizen_contact=citizen_contact,
        citizen_notes=citizen_notes
    )
    issues_db.append(new_issue)
    issue_counter += 1
    
    return new_issue

@app.put("/issues/{issue_id}/status", response_model=Issue)
def update_issue_status(issue_id: int, update: StatusUpdate):
    for issue in issues_db:
        if issue.id == issue_id:
            issue.status = update.status
            if update.ward is not None:
                issue.ward = update.ward
            if update.worker_image:
                issue.worker_image = update.worker_image
            if update.citizen_rating is not None:
                issue.citizen_rating = update.citizen_rating
                
                # Analyze work with Gemini
                if model and update.status == "Completed" and issue.image.startswith("data:") and update.worker_image.startswith("data:"):
                    try:
                        import base64
                        before_b64 = issue.image.split(",")[1]
                        after_b64 = update.worker_image.split(",")[1]
                        
                        before_bytes = base64.b64decode(before_b64)
                        after_bytes = base64.b64decode(after_b64)
                        
                        img1 = Image.open(io.BytesIO(before_bytes))
                        img2 = Image.open(io.BytesIO(after_bytes))
                        
                        prompt = """
                        You are an AI inspector evaluating public infrastructure repairs. 
                        I am giving you two images. The first image shows the original defect. 
                        The second image shows the repaired work done by a worker.
                        Please rate the quality of the repair work on a scale of 1 to 5.
                        Return a JSON object with:
                        - rating: (integer from 1 to 5)
                        - feedback: (a short sentence explaining the rating)
                        """
                        response = client.models.generate_content(
                            model='gemini-2.5-flash',
                            contents=[prompt, img1, img2],
                            config={"response_mime_type": "application/json"}
                        )
                        text = response.text.strip()
                            
                        data = json.loads(text)
                        issue.worker_rating = data.get("rating", 3)
                        issue.worker_feedback = data.get("feedback", "Work completed successfully.")
                    except Exception as e:
                        print("Worker Analysis Error:", e)
                        issue.worker_rating = 4
                        issue.worker_feedback = "Looks good based on manual override."
                elif update.status == "Completed":
                    issue.worker_rating = 5
                    issue.worker_feedback = "Automatic approval."
            return issue
    return {"error": "Issue not found"}

@app.post("/issues/{issue_id}/verify-repair")
def verify_repair_image(issue_id: int, request: VerifyRepairRequest):
    target_issue = None
    for issue in issues_db:
        if issue.id == issue_id:
            target_issue = issue
            break
            
    if not target_issue:
        return {"error": "Issue not found"}
        
    if not model or not target_issue.image.startswith("data:") or not request.worker_image.startswith("data:"):
         return {"is_duplicate": False, "is_solved": True, "message": "Cannot verify using AI."}
         
    try:
        import base64
        before_b64 = target_issue.image.split(",")[1]
        after_b64 = request.worker_image.split(",")[1]
        
        before_bytes = base64.b64decode(before_b64)
        after_bytes = base64.b64decode(after_b64)
        
        img1 = Image.open(io.BytesIO(before_bytes))
        img2 = Image.open(io.BytesIO(after_bytes))
        
        prompt = """
        You are an AI inspector evaluating public infrastructure repairs. I am giving you two images.
        Image 1: The original defect.
        Image 2: The repaired work done by a worker.
        
        First, check if Image 2 is exactly the same as Image 1 (a duplicate upload) or just a cropped/slightly rotated version of the exact same photo.
        Second, if it's not a duplicate, check if the defect shown in Image 1 appears to be repaired in Image 2.
        
        Return a JSON object with:
        - is_duplicate: (boolean) true if the images are exactly the same photo, false otherwise
        - is_solved: (boolean) true if the defect appears repaired in the second image, false otherwise
        - message: (string) short feedback explaining your decision. If duplicate, say "Duplicate image".
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, img1, img2],
            config={"response_mime_type": "application/json"}
        )
        text = response.text.strip()
        data = json.loads(text)
        return {
            "is_duplicate": data.get("is_duplicate", False),
            "is_solved": data.get("is_solved", True),
            "message": data.get("message", "")
        }
    except Exception as e:
        print("Verify Repair Error:", e)
        return {"is_duplicate": False, "is_solved": False, "message": f"AI Error: {str(e)}" }

traffic_db = []
anpr_db = []

@app.post("/process-video")
async def process_video(video: UploadFile = File(...)):
    if not yolo_model:
        return {"error": "YOLO model not loaded. Cannot process video."}

    # Save video to temp file
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, video.filename)
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    cap = cv2.VideoCapture(temp_path)
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0: fps = 30
    
    detected_frames = []
    frame_count = 0
    last_detection_frame = -99999
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_count += 1
        
        # Process 2 frames per second to save computation
        if frame_count % max(1, int(fps/2)) != 0:
            continue
            
        # Cooldown: Wait ~2 seconds between capturing distinct potholes
        if frame_count - last_detection_frame < int(fps * 2):
            continue
            
        results = yolo_model.predict(frame, conf=0.10, verbose=False)
        if len(results) > 0 and len(results[0].boxes) > 0:
            found_valid_pothole = False
            for box in results[0].boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                w_px = x2 - x1
                h_px = y2 - y1
                
                # Filter out extremely tiny noisy boxes
                if w_px < 30 or h_px < 30:
                    continue
                    
                found_valid_pothole = True
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                
                # Mock scale for demo: assume frame width represents ~3 meters (300 cm)
                frame_w = frame.shape[1]
                scale_cm_per_px = 300.0 / max(frame_w, 1)
                w_cm = int(w_px * scale_cm_per_px)
                h_cm = int(h_px * scale_cm_per_px)
                label = f"Pothole: {w_cm}cm x {h_cm}cm"
                
                (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(frame, (x1, max(0, y1 - text_h - 10)), (x1 + text_w + 10, y1), (0, 0, 255), -1)
                cv2.putText(frame, label, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            if not found_valid_pothole:
                continue
                
            # Convert to RGB PIL Image and store
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(img_rgb)
            pil_img.thumbnail((640, 640)) # Resize for collage
            detected_frames.append(pil_img)
            
            last_detection_frame = frame_count
            
            # Cap at 4 distinct potholes for the collage
            if len(detected_frames) >= 4:
                break
            
    cap.release()
    shutil.rmtree(temp_dir)
    
    if len(detected_frames) == 0:
        return {"error": "No defect detected in video."}
        
    import math
    if len(detected_frames) == 1:
        final_img = detected_frames[0]
    else:
        # Create collage
        n = len(detected_frames)
        cols = 2 if n >= 2 else 1
        rows = math.ceil(n / cols)
        
        w, h = detected_frames[0].size
        collage = Image.new('RGB', (cols * w, rows * h))
        for i, frame_img in enumerate(detected_frames):
            if frame_img.size != (w, h):
                frame_img = frame_img.resize((w, h))
            x = (i % cols) * w
            y = (i // cols) * h
            collage.paste(frame_img, (x, y))
        final_img = collage
        
    import base64
    buffer = io.BytesIO()
    final_img.save(buffer, format="JPEG", quality=80)
    b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    image_url = f"data:image/jpeg;base64,{b64}"
    
    return {"image_url": image_url}

@app.post("/detect-frame")
async def detect_frame(image: UploadFile = File(...)):
    if not yolo_model:
        return {"error": "YOLO model not loaded", "boxes": []}
    
    image_bytes = await image.read()
    import numpy as np
    np_arr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    results = yolo_model.predict(frame, conf=0.10, verbose=False)
    boxes_out = []
    if len(results) > 0 and len(results[0].boxes) > 0:
        for box in results[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            w_px = x2 - x1
            h_px = y2 - y1
            if w_px < 30 or h_px < 30:
                continue
            boxes_out.append({"x": x1, "y": y1, "w": w_px, "h": h_px})
            
    return {"boxes": boxes_out}

import math

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371e3
    phi1 = lat1 * math.pi/180
    phi2 = lat2 * math.pi/180
    delta_phi = (lat2-lat1) * math.pi/180
    delta_lambda = (lon2-lon1) * math.pi/180
    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@app.post("/traffic-data")
def receive_traffic_data(data: TrafficData):
    # Update existing node data instead of appending
    for existing in traffic_db:
        if existing.node_id == data.node_id:
            existing.lat = data.lat
            existing.lng = data.lng
            existing.timestamp = data.timestamp
            existing.vehicle_counts = data.vehicle_counts
            existing.congestion_level = data.congestion_level
            return {"message": "Traffic data updated", "total_records": len(traffic_db)}
    traffic_db.append(data)
    return {"message": "Traffic data logged", "total_records": len(traffic_db)}

@app.get("/traffic-data")
def get_traffic_data():
    return traffic_db

@app.post("/anpr-alerts")
def receive_anpr_alert(alert: ANPRAlert):
    # Deduplicate ANPR alerts within 100 meters for the same license plate
    for existing in anpr_db:
        if existing.license_plate == alert.license_plate:
            dist = calculate_distance(alert.lat, alert.lng, existing.lat, existing.lng)
            if dist < 100:
                existing.report_count += 1
                existing.timestamp = alert.timestamp
                existing.confidence = max(existing.confidence, alert.confidence)
                return {"message": "ANPR alert updated", "total_records": len(anpr_db)}
    
    anpr_db.append(alert)
    return {"message": "ANPR alert logged", "total_records": len(anpr_db)}

@app.get("/anpr-alerts")
def get_anpr_alerts():
    return anpr_db

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
