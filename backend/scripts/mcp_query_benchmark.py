"""
Benchmark advisor natural-language queries against Sage KB MCP.

Usage:
  uv run python scripts/mcp_query_benchmark.py \
    --input data/mcp_query_candidates.json \
    --runs 2 \
    --top 6

Environment variables used:
  SAGE_KB_MCP_URL
  SAGE_KB_MCP_API_KEY
  SAGE_KB_MCP_TOOL_NAME (default: knowledge_base_retrieve)
  SAGE_KB_MCP_TIMEOUT_SECONDS (default: 8)
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from dotenv import load_dotenv


NO_ANSWER_MARKERS = [
    "sorry, i could not find an answer for your query",
    "i could not find an answer for your query",
    "no relevant information found",
]


@dataclass
class RunResult:
    ok: bool
    reason: str
    latency_ms: int
    answer: str
    keyword_hits: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark natural-language queries against MCP")
    parser.add_argument(
        "--input",
        default="data/mcp_query_candidates.json",
        help="Path to JSON file with candidate query objects",
    )
    parser.add_argument("--runs", type=int, default=2, help="Runs per query")
    parser.add_argument("--top", type=int, default=6, help="Top queries to print")
    parser.add_argument("--json-out", default="", help="Optional path to write detailed JSON results")
    return parser.parse_args()


def load_candidates(path: Path) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Candidate input must be a JSON array")
    return data


def call_mcp(url: str, api_key: str, tool_name: str, timeout_seconds: float, query: str) -> dict[str, Any]:
    payload = {
        "jsonrpc": "2.0",
        "id": "bench-1",
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": {
                "request": {
                    "knowledgeBaseIntents": [query],
                }
            },
        },
    }
    req = urllib_request.Request(url=url, data=json.dumps(payload).encode("utf-8"), method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json, text/event-stream")
    if api_key:
        req.add_header("api-key", api_key)

    with urllib_request.urlopen(req, timeout=timeout_seconds) as response:
        raw = response.read().decode("utf-8", errors="ignore")

    stripped = raw.strip()
    for line in stripped.splitlines():
        if line.startswith("data:"):
            stripped = line[5:].strip()
            break

    parsed = json.loads(stripped) if stripped else {}
    if not isinstance(parsed, dict):
        raise ValueError("MCP response not a JSON object")
    return parsed


def extract_answer(parsed: dict[str, Any]) -> str:
    result = parsed.get("result", parsed)
    if not isinstance(result, dict):
        return ""

    parts: list[str] = []
    content = result.get("content")
    if isinstance(content, list):
        for chunk in content:
            if isinstance(chunk, dict):
                text = chunk.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())

    for field in ["response", "answer", "text", "output", "message"]:
        value = result.get(field)
        if isinstance(value, str) and value.strip():
            parts.append(value.strip())

    return "\n".join(parts).strip()


def score_answer(answer: str, expected_keywords: list[str]) -> tuple[bool, str, int]:
    if not answer:
        return False, "empty", 0
    low = answer.lower()
    if any(marker in low for marker in NO_ANSWER_MARKERS):
        return False, "no_answer", 0
    hits = sum(1 for kw in expected_keywords if kw.lower() in low)
    return True, "ok", hits


def benchmark_candidate(
    candidate: dict[str, Any],
    runs: int,
    url: str,
    api_key: str,
    tool_name: str,
    timeout_seconds: float,
) -> dict[str, Any]:
    query = candidate["prompt"]
    expected_keywords = candidate.get("expected_keywords", [])

    run_results: list[RunResult] = []
    for _ in range(runs):
        started = time.perf_counter()
        try:
            parsed = call_mcp(url, api_key, tool_name, timeout_seconds, query)
            answer = extract_answer(parsed)
            ok, reason, keyword_hits = score_answer(answer, expected_keywords)
        except urllib_error.URLError:
            answer = ""
            ok = False
            reason = "transport_error"
            keyword_hits = 0
        except Exception:
            answer = ""
            ok = False
            reason = "parse_error"
            keyword_hits = 0

        latency_ms = int((time.perf_counter() - started) * 1000)
        run_results.append(
            RunResult(
                ok=ok,
                reason=reason,
                latency_ms=latency_ms,
                answer=answer,
                keyword_hits=keyword_hits,
            )
        )

    success_count = sum(1 for r in run_results if r.ok)
    success_rate = success_count / max(1, len(run_results))
    avg_latency = int(statistics.mean([r.latency_ms for r in run_results]))
    avg_keyword_hits = statistics.mean([r.keyword_hits for r in run_results]) if run_results else 0.0
    quality_score = round((success_rate * 100) + (avg_keyword_hits * 10) - (avg_latency / 250), 2)

    best_answer = next((r.answer for r in run_results if r.ok and r.answer), "")

    return {
        "id": candidate.get("id", ""),
        "label": candidate.get("label", ""),
        "category": candidate.get("category", ""),
        "prompt": query,
        "success_rate": round(success_rate, 2),
        "avg_latency_ms": avg_latency,
        "avg_keyword_hits": round(avg_keyword_hits, 2),
        "quality_score": quality_score,
        "run_reasons": [r.reason for r in run_results],
        "best_answer_preview": best_answer[:240],
    }


def main() -> int:
    args = parse_args()
    load_dotenv()

    url = os.environ.get("SAGE_KB_MCP_URL", "")
    api_key = os.environ.get("SAGE_KB_MCP_API_KEY", "")
    tool_name = os.environ.get("SAGE_KB_MCP_TOOL_NAME", "knowledge_base_retrieve")
    timeout_seconds = float(os.environ.get("SAGE_KB_MCP_TIMEOUT_SECONDS", "8"))

    if not url:
        print("Error: SAGE_KB_MCP_URL not set.")
        return 1

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = Path(__file__).resolve().parent.parent / input_path

    candidates = load_candidates(input_path)
    if not candidates:
        print("No candidates found.")
        return 1

    print(f"Running benchmark: {len(candidates)} candidates x {args.runs} runs")
    print(f"Tool: {tool_name}")

    results: list[dict[str, Any]] = []
    for idx, candidate in enumerate(candidates, start=1):
        result = benchmark_candidate(
            candidate=candidate,
            runs=args.runs,
            url=url,
            api_key=api_key,
            tool_name=tool_name,
            timeout_seconds=timeout_seconds,
        )
        results.append(result)
        print(
            f"[{idx:02d}] {result['label']}: "
            f"success={result['success_rate']:.0%}, "
            f"latency={result['avg_latency_ms']}ms, "
            f"score={result['quality_score']}"
        )

    ranked = sorted(results, key=lambda x: (x["quality_score"], x["success_rate"]), reverse=True)

    print("\nTop recommendations:")
    for item in ranked[: args.top]:
        print(
            f"- {item['label']} ({item['category']}): score={item['quality_score']}, "
            f"success={item['success_rate']:.0%}, latency={item['avg_latency_ms']}ms"
        )

    if args.json_out:
        out_path = Path(args.json_out)
        if not out_path.is_absolute():
            out_path = Path(__file__).resolve().parent.parent / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"ranked": ranked, "all_results": results}, f, indent=2)
        print(f"\nDetailed results written to: {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
