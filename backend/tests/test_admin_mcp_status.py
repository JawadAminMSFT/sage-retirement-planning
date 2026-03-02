import asyncio
import sys
from pathlib import Path

import pytest


@pytest.fixture(scope="module")
def admin_module():
    backend_dir = str(Path(__file__).resolve().parent.parent)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    try:
        import admin_routes
        return admin_routes
    except Exception as e:
        pytest.skip(f"Could not import admin_routes: {e}")


def test_admin_mcp_status_not_configured(admin_module, monkeypatch):
    monkeypatch.setattr(
        admin_module,
        "_load_sage_kb_mcp_config",
        lambda: {
            "url": "",
            "api_key": "",
            "source": "none",
            "timeout_seconds": 1.0,
        },
    )

    status = asyncio.run(admin_module.get_mcp_integration_status())

    assert status.configured is False
    assert status.reachable is False
    assert status.status == "not_configured"


def test_admin_mcp_status_reachable(admin_module, monkeypatch):
    monkeypatch.setattr(
        admin_module,
        "_load_sage_kb_mcp_config",
        lambda: {
            "url": "https://example.test/mcp",
            "api_key": "secret",
            "source": "env",
            "timeout_seconds": 1.0,
        },
    )
    monkeypatch.setattr(
        admin_module,
        "_probe_mcp_endpoint",
        lambda url, api_key, timeout_seconds: {
            "reachable": True,
            "http_status": 200,
            "latency_ms": 12,
            "reason": None,
        },
    )

    status = asyncio.run(admin_module.get_mcp_integration_status())

    assert status.configured is True
    assert status.auth_configured is True
    assert status.reachable is True
    assert status.status == "ok"
    assert status.http_status == 200
