from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="Infrastructure Defect Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class StatusUpdate(BaseModel):
    status: str
    worker_image: Optional[str] = None

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
    longitude: float = Form(...)
):
    global issue_counter
    
    filename = image.filename.lower() if image.filename else ""
    
    if "pothole" in filename:
        defect = "Pothole"
    elif "crack" in filename:
        defect = "Road Crack"
    elif "light" in filename or "street" in filename:
        defect = "Broken Streetlight"
    elif "drain" in filename or "water" in filename:
        defect = "Drainage Problem"
    else:
        # Default fallback
        defect = "Pothole"
        
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
    
    new_issue = Issue(
        id=issue_counter,
        type=defect,
        confidence=confidence,
        severity=severity,
        priority=priority_score,
        location=f"GPS: {latitude:.4f}, {longitude:.4f}",
        lat=latitude,
        lng=longitude,
        status="Pending",
        date=datetime.now().strftime("%d %b %Y"),
        image="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400"
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
            return issue
    return {"error": "Issue not found"}
