## Parlay Prediction Service

This backend exposes a FastAPI endpoint `POST /api/parlays/predict` that returns machine-learning assisted parlay recommendations based on:

1. Current active markets (`active_parlays`)
2. Historical parlay legs (`history_parlays`)
3. User preference signals (currently global because user_id column not yet in schema)

### Environment
Requires the following environment variables (service-role key for server side):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Endpoint
`POST /api/parlays/predict`

Request body:
```json
{ "user_id": "demo_user", "count": 3 }
```

Response shape:
```json
{
  "recommendations": [
    {
      "id": "pr-...",
      "legs": [
        {"player_id": "p2", "player_name": "Bob Wing", "sport": "basketball", "stat": "rebounds", "line": 8.5, "base_prob": 0.55, "direction": "over" }
      ],
      "score": 0.57,
      "rationale": ["base_prob=0.55", "hit_rate=0.60", ...]
    }
  ],
  "meta": {"candidates": 120, "history_rows": 540}
}
```

### Modeling Approach
Heuristic scoring combines:
- Base probability (from `active_parlays.base_prob`)
- Historical hit rate per (player, stat)
- Recency-weighted success (exponential decay ~14 day half-life)
- Sport preference weight (frequency of sport in history)
- Mild exploration noise (±3%) to avoid stagnation

Parlay assembly selects top-scored unique-player legs, producing 2–4 leg parlays (configurable) until requested count reached. Legs present in history (same player+stat) are excluded to avoid duplicates.

### Extensibility
- Add user-specific filtering once `user_id` column exists in `history_parlays`.
- Introduce model training (e.g. logistic regression) using engineered features to predict `hit` and replace heuristic blend.
- Add diversity objective (different sports) by penalizing repeated sport in the same parlay.

### Tests
`app/tests/test_predictor.py` patches Supabase client with dummy data to validate duplicate filtering and output shape.

Run tests (after installing requirements):
```
pytest -q
```

### Local Run
```
uvicorn app.main:app --reload --port 8000
```

### Client Integration
Frontend already POSTs to `/api/parlays/predict` expecting `recommendations` array; each recommendation has `legs` list shaped similarly to history legs used elsewhere.
