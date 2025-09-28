import types
import pytest

from app import get_supabase
from app.predictor import generate_recommendations

class DummyTable:
    def __init__(self, name, rows):
        self.name = name
        self.rows = rows
        self._order = None
        self._limit = None
        self._select = None

    def select(self, *_):
        self._select = True
        return self

    def order(self, *_ , **__):
        return self

    def limit(self, n):
        self._limit = n
        return self

    def execute(self):
        class R: pass
        r = R()
        r.data = self.rows[: self._limit] if self._limit else self.rows
        return r

class DummyClient:
    def __init__(self):
        self.tables = {}

    def table(self, name):
        return self.tables[name]

# Patch get_supabase for tests
@pytest.fixture(autouse=True)
def patch_supabase(monkeypatch):
    client = DummyClient()
    # active_parlays sample
    client.tables['active_parlays'] = DummyTable('active_parlays', [
        {"player_id": "p1", "player_name": "Alice Guard", "sport": "basketball", "stat": "points", "line": 22.5, "base_prob": 0.6},
        {"player_id": "p2", "player_name": "Bob Wing", "sport": "basketball", "stat": "rebounds", "line": 8.5, "base_prob": 0.55},
        {"player_id": "p3", "player_name": "Carl Shot", "sport": "basketball", "stat": "assists", "line": 5.5, "base_prob": 0.5},
        {"player_id": "p4", "player_name": "Derek Long", "sport": "basketball", "stat": "points", "line": 18.5, "base_prob": 0.58},
    ])
    # history_parlays sample (p1 points already used)
    client.tables['history_parlays'] = DummyTable('history_parlays', [
        {"player_id": "p1", "player_name": "Alice Guard", "sport": "basketball", "stat": "points", "line": 22.5, "base_prob": 0.6, "hit": True, "created_at": "2025-09-20T00:00:00Z", "parlay_group_id": "g1"},
    ])

    monkeypatch.setattr('app.predictor.get_supabase', lambda: client)
    yield


def test_generate_recommendations_filters_used_market():
    out = generate_recommendations('demo_user', count=2)
    recs = out['recommendations']
    # Ensure none of the legs use p1 points
    for r in recs:
        for leg in r['legs']:
            assert not (leg['player_id'] == 'p1' and leg['stat'] == 'points')
    assert len(recs) <= 2
    assert all('score' in r for r in recs)
