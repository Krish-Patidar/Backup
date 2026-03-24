from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import re

app = FastAPI(title="Grievance AI Classification Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keyword-based NLP classification rules
CATEGORY_KEYWORDS = {
    "road": [
        "road", "pothole", "street", "highway", "bridge", "footpath", "pavement",
        "traffic", "signal", "divider", "flyover", "accident", "speed breaker", "bump"
    ],
    "garbage": [
        "garbage", "waste", "trash", "dump", "litter", "dirty", "stink",
        "smelly", "rubbish", "filth", "refuse", "bin", "collection"
    ],
    "water": [
        "water", "pipe", "leakage", "flood", "drain", "tap", "supply",
        "pipeline", "sewage", "sewer", "overflow", "waterlog", "puddle", "pump"
    ],
    "electricity": [
        "electricity", "power", "light", "electric", "wire", "outage", "pole",
        "voltage", "transformer", "cable", "blackout", "streetlight", "spark"
    ],
    "sanitation": [
        "toilet", "sanitation", "hygiene", "clean", "bathroom", "latrine",
        "public toilet", "washroom", "open defecation", "health", "disease"
    ],
    "public_safety": [
        "crime", "safety", "accident", "danger", "illegal", "encroachment",
        "theft", "harassment", "threat", "violence", "unsafe", "security"
    ],
    "parks": [
        "park", "garden", "tree", "playground", "greenery", "bench",
        "recreation", "sports", "field", "grass", "plants", "maintenance"
    ]
}

PRIORITY_HIGH = [
    "urgent", "emergency", "immediately", "critical", "dangerous", "accident",
    "injury", "death", "fire", "explosion", "hazard", "severe", "children", "hospital"
]
PRIORITY_LOW = [
    "minor", "small", "little", "slight", "whenever", "sometime", "suggestion",
    "improvement", "optional", "nice to have"
]


def classify_text(text: str) -> dict:
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    # Score each category
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[category] = score

    category = max(scores, key=scores.get) if scores else "other"

    # Priority detection
    high_score = sum(1 for kw in PRIORITY_HIGH if kw in text_lower)
    low_score = sum(1 for kw in PRIORITY_LOW if kw in text_lower)

    if high_score > 0:
        priority = "high"
    elif low_score > 0:
        priority = "low"
    else:
        # Estimate by text urgency indicators
        if any(c in text_lower for c in ["!", "asap", "immediately"]):
            priority = "high"
        else:
            priority = "medium"

    confidence = min(max(scores.values()) / 3.0, 1.0) if scores else 0.3

    return {
        "category": category,
        "priority": priority,
        "confidence": round(confidence, 2),
        "scores": scores
    }


class TextRequest(BaseModel):
    text: str


class PredictionResponse(BaseModel):
    category: str
    priority: str
    confidence: float
    department_suggestion: str


CATEGORY_DEPARTMENTS = {
    "road": "Roads & Infrastructure",
    "garbage": "Sanitation & Waste",
    "water": "Water Supply",
    "electricity": "Electricity Board",
    "sanitation": "Sanitation & Waste",
    "public_safety": "Public Safety",
    "parks": "Parks & Recreation",
    "other": "General Administration"
}


@app.get("/")
def root():
    return {"message": "Grievance AI Classification Service", "status": "running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: TextRequest):
    result = classify_text(request.text)
    return {
        "category": result["category"],
        "priority": result["priority"],
        "confidence": result["confidence"],
        "department_suggestion": CATEGORY_DEPARTMENTS.get(result["category"], "General Administration")
    }


@app.post("/predict-with-image")
async def predict_with_image(
    text: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    # Text-based classification (image model would be added here)
    result = classify_text(text)
    return {
        "category": result["category"],
        "priority": result["priority"],
        "confidence": result["confidence"],
        "department_suggestion": CATEGORY_DEPARTMENTS.get(result["category"], "General Administration"),
        "image_processed": image is not None
    }


@app.get("/categories")
def get_categories():
    return {
        "categories": list(CATEGORY_KEYWORDS.keys()) + ["other"],
        "priorities": ["high", "medium", "low"]
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
