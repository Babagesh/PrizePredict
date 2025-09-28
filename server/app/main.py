import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import random, time
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from .predictor import generate_recommendations
from . import get_supabase

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("parlay-service")

app = FastAPI(title="Parlay Prediction Service", version="0.1.0")

# CORS for local frontend (Vite default port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        logger.exception("Failed to generate recommendations: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Submission of predicted parlays -----------------
class SubmitLeg(BaseModel):
    player_id: str
    player_name: str
    sport: str
    stat: str
    direction: str
    line: float
    base_prob: float | None = None

class SubmitParlayRequest(BaseModel):
    user_id: str
    source: str = "prediction"
    legs: List[SubmitLeg]

@app.post("/api/parlays/submit")
async def submit_parlay(req: SubmitParlayRequest):
    if not req.legs:
        raise HTTPException(status_code=400, detail="No legs provided")
    # Simulate outcomes (mirrors frontend logic) and persist to history
    parlay_group_id = f"pg-{int(time.time()*1000)}-{random.randint(100,999)}"
    inserted_rows: List[Dict[str, Any]] = []
    for leg in req.legs:
        raw = leg.base_prob if (leg.base_prob is not None) else 0.5
        dir_lower = leg.direction.lower()
        p = raw if dir_lower == 'over' else (1 - raw)
        p = min(0.92, max(0.08, p + (random.random()*0.06 - 0.03)))
        hit = random.random() < p
        inserted_rows.append({
            'sport': leg.sport,
            'player_id': leg.player_id,
            'player_name': leg.player_name,
            'stat': leg.stat,
            'line': leg.line,
            'base_prob': leg.base_prob,
            'hit': hit,
            'settled_at': datetime.utcnow().isoformat(),
            'parlay_group_id': parlay_group_id,
            'source': req.source
        })
    try:
        supabase = get_supabase()
        resp = supabase.table('history_parlays').insert(inserted_rows).execute()
        if getattr(resp, 'error', None):  # supabase-py v2 sets errors differently; safeguard
            raise RuntimeError(resp.error)  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insert failed: {e}")

    # Determine parlay result
    any_miss = any(r['hit'] is False for r in inserted_rows)
    all_hit = all(r['hit'] for r in inserted_rows)
    result = 'WIN' if all_hit else ('LOSS' if any_miss else 'PENDING')
    used_keys = [f"{r['player_id']}::{r['stat']}" for r in inserted_rows]
    return {
        'parlay_group_id': parlay_group_id,
        'parlay_result': result,
        'legs': inserted_rows,
        'used_keys': used_keys
    }


# ---------------- History / Submitted (lightweight) -----------------
@app.get("/api/parlays/history")
async def get_history(user_id: str, limit: int = 200):  # user_id accepted for future scoping
    try:
        supabase = get_supabase()
        resp = supabase.table('history_parlays').select('*').order('created_at', desc=True).limit(limit).execute()
        # Some versions of supabase-py may expose an error attribute
        if getattr(resp, 'error', None):  # type: ignore[attr-defined]
            logger.error("Supabase select error: %s", resp.error)  # type: ignore[attr-defined]
            raise RuntimeError(str(resp.error))  # type: ignore[attr-defined]
        rows = resp.data or []
        logger.debug("Fetched %d history rows", len(rows))
        grouped: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            gid = r.get('parlay_group_id') or r.get('id')
            g = grouped.setdefault(gid, {'id': gid, 'created_at': r.get('created_at'), 'legs': []})
            g['legs'].append(r)
        cards = []
        for g in grouped.values():
            legs = g['legs']
            any_miss = any(l.get('hit') is False for l in legs)
            all_hit = len(legs) > 0 and all(l.get('hit') is True for l in legs)
            if any_miss:
                pr = 'LOSS'
            elif all_hit:
                pr = 'WIN'
            else:
                pr = 'PENDING'
            cards.append({**g, 'parlay_result': pr})
        cards.sort(key=lambda x: x.get('created_at') or '', reverse=True)
        return cards
    except Exception as e:
        logger.exception("Failed to fetch history: %s", e)
        
        if "SUPABASE_URL" not in os.environ or "SUPABASE_SERVICE_ROLE_KEY" not in os.environ:
            error_message = "Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            logger.error(error_message)
            raise HTTPException(
                status_code=500, 
                detail={"error": "configuration_error", "message": error_message}
            )
        
        # Preserve original error message for visibility
        raise HTTPException(
            status_code=500, 
            detail={"error": "history_fetch_failed", "message": str(e), "type": str(type(e).__name__)}
        )

@app.get("/api/parlays/submitted")
async def get_submitted(user_id: str):  # placeholder to satisfy polling
    return []

# For local uvicorn run convenience
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
