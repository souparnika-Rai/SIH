from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import List, Optional
from datetime import datetime
import os
import json
import io
from google import genai
from PIL import Image
from dotenv import load_dotenv

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

class StatusUpdate(BaseModel):
    status: str
    worker_image: Optional[str] = None
    citizen_rating: Optional[int] = None

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
    place_name: str = Form("")
):
    global issue_counter
    
    # Read image bytes
    image_bytes = await image.read()
    
    defect = "Pothole"
    confidence = "90%"
    severity = "High"
    priority_score = 80
    
    if model:
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
            defect = f"API Error: {str(e)}"
            confidence = "0%"
            severity = "Unknown"
            priority_score = 0
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
