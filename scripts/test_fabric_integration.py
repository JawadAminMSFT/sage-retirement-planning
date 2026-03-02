#!/usr/bin/env python3
"""
Fabric Integration Tests
═══════════════════════════════════════════════════════════════════════════════
Tests the Fabric Data Agent integration end-to-end:
  1. Backend health check (Fabric endpoint)
  2. Direct Fabric query via /api/fabric/query
  3. Chat streaming with data_source=fabric
  4. Scenario projection with data_source=fabric

Usage:
    # Test against running backend (default: http://localhost:8172)
    python scripts/test_fabric_integration.py

    # Custom backend URL
    python scripts/test_fabric_integration.py --backend http://localhost:8172

    # Run only specific tests
    python scripts/test_fabric_integration.py --test health
    python scripts/test_fabric_integration.py --test query
    python scripts/test_fabric_integration.py --test chat
    python scripts/test_fabric_integration.py --test scenario
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
import urllib.error

BACKEND_URL = "http://localhost:8172"


# ── Helpers ──────────────────────────────────────────────────────────────────

def api_get(path: str) -> dict:
    url = f"{BACKEND_URL}{path}"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def api_post(path: str, body: dict) -> dict:
    url = f"{BACKEND_URL}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def api_post_stream(path: str, body: dict) -> list[dict]:
    """POST and collect SSE events."""
    url = f"{BACKEND_URL}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    events = []
    with urllib.request.urlopen(req, timeout=120) as resp:
        buffer = ""
        for chunk in iter(lambda: resp.read(4096), b""):
            buffer += chunk.decode()
            while "\n\n" in buffer:
                raw, buffer = buffer.split("\n\n", 1)
                for line in raw.split("\n"):
                    if line.startswith("data: "):
                        try:
                            evt = json.loads(line[6:])
                            events.append(evt)
                        except json.JSONDecodeError:
                            pass
    return events


def print_result(name: str, passed: bool, detail: str = ""):
    icon = "✅" if passed else "❌"
    msg = f"  {icon} {name}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    return passed


# ── Tests ────────────────────────────────────────────────────────────────────

def test_backend_health() -> bool:
    """Test that the backend is running."""
    try:
        result = api_get("/health")
        return print_result(
            "Backend health",
            result.get("status") == "healthy",
            f"agent_available={result.get('agent_available')}",
        )
    except Exception as e:
        return print_result("Backend health", False, str(e))


def test_fabric_health() -> bool:
    """Test /api/fabric/health endpoint."""
    try:
        result = api_get("/api/fabric/health")
        status = result.get("status", "unknown")
        ok = status == "ok"
        return print_result(
            "Fabric health",
            ok,
            f"status={status}, message={result.get('message', '')}",
        )
    except Exception as e:
        return print_result("Fabric health", False, str(e))


def test_fabric_query() -> bool:
    """Test direct query to Fabric Data Agent."""
    try:
        result = api_post("/api/fabric/query", {
            "question": "List all clients and their investment assets"
        })
        has_answer = bool(result.get("answer"))
        return print_result(
            "Fabric direct query",
            has_answer,
            f"answer_length={len(result.get('answer', ''))}, has_data={result.get('data') is not None}",
        )
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return print_result("Fabric direct query", False, f"HTTP {e.code}: {body[:200]}")
    except Exception as e:
        return print_result("Fabric direct query", False, str(e))


def test_fabric_chat_stream() -> bool:
    """Test /chat/stream with data_source=fabric."""
    try:
        events = api_post_stream("/chat/stream", {
            "message": "What is Sarah Chen's portfolio breakdown?",
            "data_source": "fabric",
            "history": [],
        })
        types = [e.get("type") for e in events]
        has_complete = "complete" in types
        has_content = "content" in types or "analysis" in types
        return print_result(
            "Fabric chat stream",
            has_complete and has_content,
            f"events={len(events)}, types={types}",
        )
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return print_result("Fabric chat stream", False, f"HTTP {e.code}: {body[:200]}")
    except Exception as e:
        return print_result("Fabric chat stream", False, str(e))


def test_local_chat_stream() -> bool:
    """Test /chat/stream with data_source=local (regression check)."""
    try:
        events = api_post_stream("/chat/stream", {
            "message": "Give me a quick portfolio summary",
            "data_source": "local",
            "history": [],
        })
        types = [e.get("type") for e in events]
        has_complete = "complete" in types
        return print_result(
            "Local chat stream (regression)",
            has_complete,
            f"events={len(events)}, types={types}",
        )
    except Exception as e:
        return print_result("Local chat stream (regression)", False, str(e))


def test_fabric_scenario() -> bool:
    """Test /api/project-scenario with data_source=fabric."""
    try:
        result = api_post("/api/project-scenario", {
            "profile_id": "demo-user",
            "scenario_description": "I increase my 401k contribution by $500/month",
            "timeframe_months": 12,
            "current_portfolio": {
                "total_value": 520000,
                "accounts": [
                    {"id": "401k", "name": "Traditional 401(k)", "balance": 260000},
                    {"id": "roth", "name": "Roth IRA", "balance": 104000},
                    {"id": "brokerage", "name": "Brokerage", "balance": 156000},
                ],
                "holdings": [
                    {"symbol": "VTI", "name": "Vanguard Total Stock Market", "value": 182000, "allocation": 35},
                ],
            },
            "data_source": "fabric",
        })
        has_projection = "projection" in result
        return print_result(
            "Fabric scenario projection",
            has_projection,
            f"has_projection={has_projection}, summary_len={len(result.get('summary', ''))}",
        )
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return print_result("Fabric scenario projection", False, f"HTTP {e.code}: {body[:200]}")
    except Exception as e:
        return print_result("Fabric scenario projection", False, str(e))


# ── Main ──────────────────────────────────────────────────────────────────────

ALL_TESTS = {
    "health": [test_backend_health, test_fabric_health],
    "query": [test_fabric_query],
    "chat": [test_fabric_chat_stream, test_local_chat_stream],
    "scenario": [test_fabric_scenario],
}


def main():
    global BACKEND_URL
    parser = argparse.ArgumentParser(description="Test Fabric Data Agent integration")
    parser.add_argument("--backend", default=BACKEND_URL, help="Backend URL")
    parser.add_argument("--test", choices=list(ALL_TESTS.keys()) + ["all"], default="all")
    args = parser.parse_args()
    BACKEND_URL = args.backend.rstrip("/")

    print("=" * 60)
    print("Sage Retirement Planning — Fabric Integration Tests")
    print("=" * 60)
    print(f"  Backend: {BACKEND_URL}")
    print()

    tests_to_run = []
    if args.test == "all":
        for group in ALL_TESTS.values():
            tests_to_run.extend(group)
    else:
        tests_to_run = ALL_TESTS[args.test]

    passed = 0
    failed = 0
    for test_fn in tests_to_run:
        if test_fn():
            passed += 1
        else:
            failed += 1

    print()
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")

    if failed > 0:
        print("\n⚠ Some tests failed. Check that:")
        print("  - The backend is running (python -m uvicorn main:app --port 8172)")
        print("  - Fabric env vars are set (FABRIC_TENANT_ID, CLIENT_ID, etc.)")
        print("  - The Data Agent is published and the URL/ID are correct")
        sys.exit(1)
    else:
        print("\n🎉 All tests passed!")


if __name__ == "__main__":
    main()
