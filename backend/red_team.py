"""Simple red-team test runner for the backend.

Run with: python red_team.py

This script will attempt to import Azure AI Red Teaming SDK and run a scan
against a simple callback. It uses environment variables in this project to
configure the Azure AI Foundry project. If the Azure packages or environment
are not available, the script will do a dry-run simulation.
"""
from __future__ import annotations

import asyncio
import os
import sys
from typing import Callable
from dotenv import load_dotenv


def _load_env_project() -> dict | str | None:
    """Build azure_ai_project from available environment variables.

    Returns either a dict with subscription_id/resource_group_name/project_name,
    or a string Azure AI project URL, or None if nothing found.
    """
    # Prefer explicit AZURE_AI_PROJECT (full project URL)
    project_url = os.environ.get("PROJECT_ENDPOINT", "https://ja-voice-live-proj-01-resource.services.ai.azure.com/api/projects/ja-voice-live-proj-01")
    print(f"PROJECT_ENDPOINT: {project_url}")
    if project_url:
        return project_url

    sub = os.environ.get("AZURE_SUBSCRIPTION_ID")
    rg = os.environ.get("AZURE_RESOURCE_GROUP")
    name = os.environ.get("AZURE_PROJECT_NAME")
    if sub and rg and name:
        return {
            "subscription_id": sub,
            "resource_group_name": rg,
            "project_name": name,
        }

    return None


async def run_red_team_scan(callback: Callable[[str], str]) -> None:
    """Attempt to run the RedTeam.scan against the provided callback.

    This function will try to import Azure SDK classes. If unavailable or if
    required environment variables are missing, it will perform a dry-run that
    demonstrates the intended behavior without contacting Azure.
    """
    azure_ai_project = _load_env_project()

    # Try to import Azure RedTeam SDK components lazily.
    try:
        from azure.identity import DefaultAzureCredential
        from azure.ai.evaluation.red_team import RedTeam, RiskCategory, AttackStrategy

        sdk_available = True
    except Exception:
        sdk_available = False

    if not sdk_available or azure_ai_project is None:
        print(f"sdk_available: {sdk_available}, azure_ai_project: {azure_ai_project}")
        print("Azure red-team SDK not available or project not configured. Running dry-run simulation.")
        # Simulate a scan result for demonstration.
        simulated = {
            "target": callback.__name__,
            "issues_found": 0,
            "notes": "Dry-run: no network calls were made.",
        }
        print("Simulated result:", simulated)
        return

    # If we reach here, SDK and project config are available.
    credential = DefaultAzureCredential()

    # Instantiate the RedTeam agent
    red_team_agent = RedTeam(
        azure_ai_project=azure_ai_project,
        credential=credential,
    )

    # Prepare a simple prompt to test the callback — the SDK may expect a
    # variety of target types; here we pass the callback function directly as
    # requested by the user sample.
    print("Starting red-team scan against target callback...")

    try:
        # Run the red team scan with EASY and MODERATE attack strategies
        result = await red_team_agent.scan(
            target=callback,
            scan_name="Scan with easy & moderate strategies",
            attack_strategies=[
                AttackStrategy.EASY,
                AttackStrategy.MODERATE,
            ],
        )
        print("Scan completed. Result:")
        print(result)
    except Exception as exc:
        print("Scan raised an exception:", type(exc).__name__, exc)


def simple_callback(query: str) -> str:
    """A simple example callback that always returns a safe refusal."""
    return "I'm an AI assistant that follows ethical guidelines. I cannot provide harmful content."


async def _main() -> int:
    # Run the scan against the simple callback
    await run_red_team_scan(simple_callback)
    return 0


if __name__ == "__main__":
    # Run the async main
    try:
        asyncio.run(_main())
    except KeyboardInterrupt:
        print("Cancelled by user", file=sys.stderr)
        raise
