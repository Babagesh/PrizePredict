import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from .predictor import generate_recommendations

app = FastAPI(title="Parlay Prediction Service", version="0.1.0")

class PredictRequest(BaseModel):
    user_id: str
    count: Optional[int] = 3
    mix: Optional[bool] = True  # placeholder for future blending strategies

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/parlays/predict")
async def predict(req: PredictRequest):
    try:
        count = max(1, min(10, req.count or 3))
        payload = generate_recommendations(req.user_id, count=count)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# For local uvicorn run convenience
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
