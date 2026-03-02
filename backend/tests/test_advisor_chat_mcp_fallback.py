import asyncio
import sys
from pathlib import Path

import pytest


@pytest.fixture(scope="module")
def main_module():
    backend_dir = str(Path(__file__).resolve().parent.parent)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    try:
        import main
        return main
    except Exception as e:
        pytest.skip(f"Could not import backend main module: {e}")


def test_normalize_mcp_response_from_content(main_module):
    payload = {
        "jsonrpc": "2.0",
        "id": "1",
        "result": {
            "content": [
                {"type": "text", "text": "RRSP deadline is in first 60 days."},
                {"type": "text", "text": "Contributions count for prior tax year."},
            ],
            "citations": [
                {"id": "ca-rrsp-limit-2026", "title": "RRSP Contribution Limit 2026", "source": "https://example.test/rrsp"}
            ],
        },
    }

    normalized = main_module._normalize_mcp_response(payload)

    assert "RRSP deadline" in normalized["response"]
    assert "prior tax year" in normalized["response"]
    assert isinstance(normalized["citations"], list)
    assert normalized["citations"][0]["title"] == "RRSP Contribution Limit 2026"


def test_query_sage_kb_mcp_uses_tools_call(main_module, monkeypatch):
    monkeypatch.setattr(
        main_module,
        "_get_sage_kb_mcp_config",
        lambda: {
            "url": "https://example.test/mcp",
            "api_key": "secret",
            "timeout_seconds": 1.0,
            "tool_name": "search",
        },
    )

    attempted_methods = []

    def fake_execute(url, api_key, timeout_seconds, payload):
        attempted_methods.append(payload.get("method"))
        return {
            "jsonrpc": "2.0",
            "id": "2",
            "result": {
                "response": "Knowledge base answer",
                "citations": [{"title": "CRA", "source": "https://example.test/cra"}],
            },
        }

    monkeypatch.setattr(main_module, "_execute_mcp_request", fake_execute)

    result = asyncio.run(main_module._query_sage_kb_mcp("What is RRSP deadline?", "adv-1", {}, []))

    assert result["response"] == "Knowledge base answer"
    assert attempted_methods == ["tools/call"]
    assert result["citations"][0]["title"] == "CRA"


def test_query_sage_kb_mcp_missing_config(main_module, monkeypatch):
    monkeypatch.setattr(
        main_module,
        "_get_sage_kb_mcp_config",
        lambda: {
            "url": "",
            "api_key": "",
            "timeout_seconds": 1.0,
            "tool_name": "search",
        },
    )

    with pytest.raises(main_module.MCPQueryError) as exc:
        asyncio.run(main_module._query_sage_kb_mcp("Any question", "adv-1"))

    assert exc.value.reason == "mcp_not_configured"


def test_normalize_mcp_response_no_answer_triggers_fallback(main_module):
    payload = {
        "jsonrpc": "2.0",
        "id": "7",
        "result": {
            "content": [
                {"type": "text", "text": "Sorry, I could not find an answer for your query."}
            ]
        },
    }

    with pytest.raises(main_module.MCPQueryError) as exc:
        main_module._normalize_mcp_response(payload)

    assert exc.value.reason == "mcp_no_answer"


def test_normalize_mcp_response_ref_id_markers_to_citations(main_module):
    payload = {
        "jsonrpc": "2.0",
        "id": "8",
        "result": {
            "content": [
                {
                    "type": "text",
                    "text": "The deadline is in the first 60 days [ref_id:0][ref_id:1].",
                }
            ]
        },
    }

    normalized = main_module._normalize_mcp_response(payload)

    assert "[REF:mcp-ref-0]" in normalized["response"]
    assert "[REF:mcp-ref-1]" in normalized["response"]
    assert len(normalized["citations"]) == 2
    assert normalized["citations"][0]["id"] == "mcp-ref-0"
    assert (
        "first 60 days" in normalized["citations"][0]["title"].lower()
        or "first 60 days" in normalized["citations"][0]["description"].lower()
    )
