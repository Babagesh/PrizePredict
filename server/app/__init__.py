import os

from typing import Optional, Any

try:
	from supabase import create_client, Client  # type: ignore
except ImportError:  # lightweight fallback if supabase-py not installed yet
	create_client = None
	Client = None  # noqa: N816

_supabase: Optional[Any] = None

def get_supabase():
	global _supabase
	if _supabase is not None:
		return _supabase
	url = os.getenv("SUPABASE_URL")
	key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
	if not url or not key:
		raise RuntimeError("Supabase env vars SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")
	if create_client is None:
		raise RuntimeError("supabase-py not installed. Run: pip install supabase")
	_supabase = create_client(url, key)
	return _supabase

__all__ = ["get_supabase"]
