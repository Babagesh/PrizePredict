import math
import random
import time
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
import pandas as pd

from . import get_supabase

# ----------------------------- Data Models -----------------------------
@dataclass
class LegCandidate:
    player_id: str
    player_name: str
    sport: str
    stat: str
    line: float
    base_prob: Optional[float]
    source_row: Dict[str, Any]

@dataclass
class ParlayRecommendation:
    id: str
    legs: List[Dict[str, Any]]
    score: float
    rationale: List[str]

# ----------------------------- Fetch Layer -----------------------------

def fetch_active_markets() -> pd.DataFrame:
    supabase = get_supabase()
    # Pull all active markets (avoid filtering here – client handles hiding, backend filters by history separately)
    resp = supabase.table("active_parlays").select("*").execute()
    data = resp.data or []
    return pd.DataFrame(data)

def fetch_user_history(user_id: str, limit: int = 1000) -> pd.DataFrame:
    supabase = get_supabase()
    # History table currently not user-scoped; fetch recent rows
    resp = supabase.table("history_parlays").select("*").order("created_at", desc=True).limit(limit).execute()
    data = resp.data or []
    return pd.DataFrame(data)

# ----------------------------- Feature Engineering -----------------------------

def build_leg_candidates(active_df: pd.DataFrame) -> List[LegCandidate]:
    if active_df.empty:
        return []
    # Deduplicate on (player_id, stat, line)
    active_df = active_df.copy()
    active_df = active_df.sort_values("player_name")
    dedup = active_df.drop_duplicates(subset=["player_id", "stat", "line"])  # keep first
    legs: List[LegCandidate] = []
    for _, r in dedup.iterrows():
        legs.append(
            LegCandidate(
                player_id=str(r.get("player_id")),
                player_name=str(r.get("player_name")),
                sport=str(r.get("sport")),
                stat=str(r.get("stat")),
                line=float(r.get("line")) if r.get("line") is not None else 0.0,
                base_prob=(float(r.get("base_prob")) if r.get("base_prob") is not None else None),
                source_row=r.to_dict(),
            )
        )
    return legs

def compute_history_features(history_df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    """Aggregate per (player_id, stat) historical performance and popularity.

    Returns mapping key -> features.
    key: f"{player_id}::{stat}".
    """
    features: Dict[str, Dict[str, Any]] = {}
    if history_df.empty:
        return features
    # Ensure necessary columns
    needed = {"player_id", "stat", "hit", "created_at", "sport"}
    missing = needed - set(history_df.columns)
    if missing:
        for m in missing:
            history_df[m] = None
    # Convert created_at to timestamp for recency weighting
    if not np.issubdtype(history_df["created_at"].dtype, np.datetime64):
        history_df["created_at"] = pd.to_datetime(history_df["created_at"], errors="coerce")
    now_ts = history_df["created_at"].max() or pd.Timestamp.utcnow()

    grouped = history_df.groupby(["player_id", "stat"], dropna=True)
    for (pid, stat), g in grouped:
        total = len(g)
        hits = g["hit"].sum() if "hit" in g else 0
        hit_rate = hits / total if total > 0 else 0.0
        # Recency weight: exponential decay based on age in days
        ages = (now_ts - g["created_at"]).dt.total_seconds() / 86400.0
        recency_weight = float(np.exp(-ages / 14.0).mean()) if len(ages) else 0.0
        features[f"{pid}::{stat}"] = {
            "plays": total,
            "hits": float(hits),
            "hit_rate": hit_rate,
            "recency_weight": recency_weight,
            "weighted_success": hit_rate * recency_weight,
        }
    return features

def compute_user_preferences(history_df: pd.DataFrame) -> Dict[str, float]:
    """Return preference weights per (sport) and per (sport::position?) if available.

    Currently we only have sport column; if future schema adds league/position we can expand.
    """
    prefs: Dict[str, float] = {}
    if history_df.empty:
        return prefs
    sport_counts = history_df.groupby("sport").size().to_dict()
    total = sum(sport_counts.values()) or 1
    for sport, cnt in sport_counts.items():
        prefs[f"sport::{sport}"] = cnt / total
    return prefs

# ----------------------------- Scoring -----------------------------

def score_leg(leg: LegCandidate, hist_features: Dict[str, Dict[str, Any]], prefs: Dict[str, float]) -> Tuple[float, List[str]]:
    key = f"{leg.player_id}::{leg.stat}"
    hist = hist_features.get(key, {})
    base_prob = leg.base_prob if leg.base_prob is not None else 0.5
    # Components
    hit_rate = hist.get("hit_rate", 0.5)
    recency = hist.get("recency_weight", 0.5)
    weighted_success = hist.get("weighted_success", hit_rate * recency)
    sport_pref = prefs.get(f"sport::{leg.sport}", 0.2)

    # Blend: heuristic weights
    score = (
        0.35 * base_prob +
        0.25 * hit_rate +
        0.15 * recency +
        0.15 * weighted_success +
        0.10 * sport_pref
    )
    # Small exploration noise
    score *= random.uniform(0.97, 1.03)
    rationale = [
        f"base_prob={base_prob:.2f}",
        f"hit_rate={hit_rate:.2f}",
        f"recency={recency:.2f}",
        f"weighted_success={weighted_success:.2f}",
        f"sport_pref={sport_pref:.2f}",
    ]
    return float(score), rationale

# ----------------------------- Parlay Assembly -----------------------------

def assemble_parlays(scored: List[Tuple[LegCandidate, float, List[str]]],
                     already_used_keys: set,
                     desired: int = 3,
                     min_legs: int = 2,
                     max_legs: int = 6) -> List[ParlayRecommendation]:
    # Filter out any leg where exact (player_id, stat) already in history
    filtered: List[Tuple[LegCandidate, float, List[str]]] = []
    for leg, sc, rationale in scored:
        key = f"{leg.player_id}::{leg.stat}"
        if key in already_used_keys:
            continue
        filtered.append((leg, sc, rationale))
    # Sort by score desc
    filtered.sort(key=lambda x: x[1], reverse=True)

    recs: List[ParlayRecommendation] = []
    ptr = 0
    attempt = 0
    while len(recs) < desired and attempt < 50:
        attempt += 1
        size = random.randint(min_legs, min(max_legs, min_legs + 2))  # small variability
        chosen = []
        used_players = set()
        i = 0
        while i < len(filtered) and len(chosen) < size:
            leg, sc, rationale = filtered[i]
            if leg.player_id in used_players:
                i += 1
                continue
            chosen.append((leg, sc, rationale))
            used_players.add(leg.player_id)
            i += 1
        if len(chosen) < min_legs:
            break
        total_score = float(np.mean([c[1] for c in chosen]))
        rec_id = f"pr-{int(time.time()*1000)}-{len(recs)}-{random.randint(100,999)}"
        recs.append(ParlayRecommendation(
            id=rec_id,
            legs=[{
                "player_id": c[0].player_id,
                "player_name": c[0].player_name,
                "sport": c[0].sport,
                "stat": c[0].stat,
                "line": c[0].line,
                "base_prob": c[0].base_prob,
                "direction": "over",  # default assumption
            } for c in chosen],
            score=total_score,
            rationale=[r for c in chosen for r in c[2]],
        ))
        # Move pointer to reduce overlap next iteration
        ptr += size
    return recs[:desired]

# ----------------------------- Orchestrator -----------------------------

def generate_recommendations(user_id: str, count: int = 3) -> Dict[str, Any]:
    active_df = fetch_active_markets()
    history_df = fetch_user_history(user_id)

    legs = build_leg_candidates(active_df)
    hist_features = compute_history_features(history_df)
    prefs = compute_user_preferences(history_df)
    already_used = set(f"{r.get('player_id')}::{r.get('stat')}" for _, r in history_df.iterrows())

    scored: List[Tuple[LegCandidate, float, List[str]]] = []
    for leg in legs:
        sc, rationale = score_leg(leg, hist_features, prefs)
        scored.append((leg, sc, rationale))

    recs = assemble_parlays(scored, already_used, desired=count)
    return {"recommendations": [asdict(r) for r in recs], "meta": {"candidates": len(legs), "history_rows": int(len(history_df))}}

__all__ = [
    "generate_recommendations",
]
