"""
WorkIQ integration service.

Supports three modes via WORKIQ_MODE env var:
  - "local"    : Live queries via WorkIQ CLI (requires local auth tokens)
  - "mock"     : Static mock data from data/workiq_mock.json (for cloud/offline)
  - "disabled" : No WorkIQ integration at all

Key features:
- Background pre-fetch on startup
- In-memory cache with TTL
- Graceful fallback if WorkIQ unavailable
"""

import asyncio
import json
import subprocess
import os
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from pathlib import Path


# ─── Configuration ───────────────────────────────────────────────────────────

WORKIQ_MODE = os.getenv("WORKIQ_MODE", "local").lower()  # "local", "mock", "disabled"
WORKIQ_SCRIPT_PATH = Path(__file__).parent.parent / "scripts" / "workiq-check" / "query.mjs"
MOCK_DATA_PATH = Path(__file__).parent / "data" / "workiq_mock.json"
CACHE_TTL_SECONDS = 300  # 5 minutes
QUERY_TIMEOUT_SECONDS = 90

# Validate mode
if WORKIQ_MODE not in ("local", "mock", "disabled"):
    print(f"WARNING: Invalid WORKIQ_MODE='{WORKIQ_MODE}', falling back to 'mock'")
    WORKIQ_MODE = "mock"

print(f"WorkIQ mode: {WORKIQ_MODE}")


# ─── Mock Data ───────────────────────────────────────────────────────────────

_mock_data: Optional[Dict[str, str]] = None

def _load_mock_data() -> Dict[str, str]:
    """Load mock WorkIQ responses from JSON file."""
    global _mock_data
    if _mock_data is not None:
        return _mock_data
    try:
        with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
            _mock_data = json.load(f)
            # Remove the comment field
            _mock_data.pop("_comment", None)
            return _mock_data
    except Exception as e:
        print(f"Failed to load WorkIQ mock data: {e}")
        _mock_data = {}
        return _mock_data


# ─── Cache Data Structures ───────────────────────────────────────────────────

@dataclass
class CacheEntry:
    data: Any
    fetched_at: float
    error: Optional[str] = None

    def is_valid(self) -> bool:
        return (time.time() - self.fetched_at) < CACHE_TTL_SECONDS


@dataclass
class WorkIQCache:
    """In-memory cache for WorkIQ query results."""
    calendar_today: Optional[CacheEntry] = None
    sage_meetings: Optional[CacheEntry] = None
    sage_emails: Optional[CacheEntry] = None
    sage_files: Optional[CacheEntry] = None
    prefetch_in_progress: bool = False
    last_prefetch_started: float = 0


# Global cache instance
_cache = WorkIQCache()


# ─── Query Helpers ───────────────────────────────────────────────────────────

async def _run_workiq_query(question: str) -> Dict[str, Any]:
    """
    Execute a WorkIQ query via the Node.js CLI script (local mode only).
    Returns: { "success": bool, "response": str|None, "error": str|None }
    """
    if WORKIQ_MODE != "local":
        return {"success": False, "response": None, "error": f"Not in local mode (mode={WORKIQ_MODE})"}

    if not WORKIQ_SCRIPT_PATH.exists():
        return {"success": False, "response": None, "error": f"Script not found: {WORKIQ_SCRIPT_PATH}"}

    try:
        proc = await asyncio.wait_for(
            asyncio.create_subprocess_exec(
                "node",
                str(WORKIQ_SCRIPT_PATH),
                question,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(WORKIQ_SCRIPT_PATH.parent),
            ),
            timeout=QUERY_TIMEOUT_SECONDS,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(),
            timeout=QUERY_TIMEOUT_SECONDS,
        )

        output = stdout.decode("utf-8", errors="ignore").strip()
        err_output = stderr.decode("utf-8", errors="ignore").strip()
        if err_output:
            print(f"WorkIQ subprocess stderr: {err_output[:300]}")
        if not output:
            return {"success": False, "response": None, "error": "Empty response from WorkIQ"}

        return json.loads(output)

    except asyncio.TimeoutError:
        return {"success": False, "response": None, "error": "WorkIQ query timed out"}
    except json.JSONDecodeError as e:
        return {"success": False, "response": None, "error": f"Invalid JSON: {e}"}
    except Exception as e:
        return {"success": False, "response": None, "error": str(e)}


# ─── Prefetch Queries ────────────────────────────────────────────────────────

PREFETCH_QUERIES = {
    "calendar_today": "What meetings do I have today? List meeting titles, times, and any agenda items.",
    "sage_meetings": "Find all meetings with 'Sage' or 'John Doe' in the title. Show the next upcoming one with its full agenda.",
    "sage_emails": "Find recent emails with 'Sage' in the subject. List the email subjects and when they were received.",
    "sage_files": "What files do I have in my Sage folder in OneDrive? List the file names.",
}


async def prefetch_workiq_context() -> Dict[str, bool]:
    """
    Pre-fetch all WorkIQ context.
    - local mode: runs CLI queries in background
    - mock mode: loads from static JSON immediately
    - disabled mode: does nothing
    Returns dict of query_name -> success status.
    """
    global _cache

    if WORKIQ_MODE == "disabled":
        return {"enabled": False}

    # Mock mode: load from JSON file instantly
    if WORKIQ_MODE == "mock":
        mock = _load_mock_data()
        now = time.time()
        results = {}
        for key in PREFETCH_QUERIES:
            data = mock.get(key)
            if data:
                setattr(_cache, key, CacheEntry(data=data, fetched_at=now))
                results[key] = True
                print(f"WorkIQ prefetch [{key}]: ✓ (mock)")
            else:
                results[key] = False
                print(f"WorkIQ prefetch [{key}]: ✗ (no mock data)")
        return results

    # Local mode: run live CLI queries (in parallel for speed)
    if _cache.prefetch_in_progress:
        return {"status": "already_in_progress"}

    _cache.prefetch_in_progress = True
    _cache.last_prefetch_started = time.time()
    results = {}

    try:
        # Run all queries concurrently — each spawns its own MCP process
        tasks = {
            key: asyncio.create_task(_run_workiq_query(question))
            for key, question in PREFETCH_QUERIES.items()
        }
        query_results = {}
        for key, task in tasks.items():
            try:
                query_results[key] = await task
            except Exception as e:
                query_results[key] = {"success": False, "response": None, "error": str(e)}

        for key, result in query_results.items():
            entry = CacheEntry(
                data=result.get("response"),
                fetched_at=time.time(),
                error=result.get("error") if not result.get("success") else None,
            )
            setattr(_cache, key, entry)
            success = result.get("success", False)
            results[key] = success
            if success:
                print(f"WorkIQ prefetch [{key}]: ✓")
            else:
                print(f"WorkIQ prefetch [{key}]: ✗ — {result.get('error', 'unknown error')}")

    finally:
        _cache.prefetch_in_progress = False

    return results


async def prefetch_workiq_background():
    """Fire-and-forget background prefetch."""
    asyncio.create_task(prefetch_workiq_context())


# ─── Cached Data Access ──────────────────────────────────────────────────────

def get_cached_context() -> Dict[str, Any]:
    """
    Get all cached WorkIQ context.
    Returns empty/null values for missing or expired cache entries.
    """
    def extract(entry: Optional[CacheEntry]) -> Optional[str]:
        if entry and entry.is_valid() and entry.data:
            return entry.data
        return None

    return {
        "workiq_enabled": WORKIQ_MODE != "disabled",
        "workiq_mode": WORKIQ_MODE,
        "calendar_today": extract(_cache.calendar_today),
        "sage_meetings": extract(_cache.sage_meetings),
        "sage_emails": extract(_cache.sage_emails),
        "sage_files": extract(_cache.sage_files),
        "cache_status": {
            "prefetch_in_progress": _cache.prefetch_in_progress,
            "last_prefetch": _cache.last_prefetch_started,
            "calendar_valid": _cache.calendar_today.is_valid() if _cache.calendar_today else False,
            "meetings_valid": _cache.sage_meetings.is_valid() if _cache.sage_meetings else False,
            "emails_valid": _cache.sage_emails.is_valid() if _cache.sage_emails else False,
            "files_valid": _cache.sage_files.is_valid() if _cache.sage_files else False,
        },
    }


def get_cached_meetings() -> Optional[str]:
    """Get cached Sage meeting info (for appointments view)."""
    if _cache.sage_meetings and _cache.sage_meetings.is_valid():
        return _cache.sage_meetings.data
    return None


def get_cached_emails() -> Optional[str]:
    """Get cached Sage email info (for escalations view)."""
    if _cache.sage_emails and _cache.sage_emails.is_valid():
        return _cache.sage_emails.data
    return None


def get_cached_calendar() -> Optional[str]:
    """Get cached today's calendar (for daily brief)."""
    if _cache.calendar_today and _cache.calendar_today.is_valid():
        return _cache.calendar_today.data
    return None


def get_cached_files() -> Optional[str]:
    """Get cached Sage OneDrive files."""
    if _cache.sage_files and _cache.sage_files.is_valid():
        return _cache.sage_files.data
    return None


# ─── On-Demand Query (with cache) ────────────────────────────────────────────

async def query_workiq(question: str, cache_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Query WorkIQ with optional caching.
    If cache_key provided and valid cache exists, returns cached data.
    """
    # Check cache first
    if cache_key:
        entry = getattr(_cache, cache_key, None)
        if entry and entry.is_valid() and entry.data:
            return {"success": True, "response": entry.data, "cached": True}

    # Run fresh query
    result = await _run_workiq_query(question)

    # Update cache if key provided
    if cache_key and result.get("success"):
        entry = CacheEntry(data=result.get("response"), fetched_at=time.time())
        setattr(_cache, cache_key, entry)

    return {**result, "cached": False}
