#!/usr/bin/env python3
"""
Fabric Workspace Setup Script
═══════════════════════════════════════════════════════════════════════════════
Automates the setup of a Microsoft Fabric workspace for the Sage Retirement
Planning app. Creates a Lakehouse, uploads seed data, creates a Data Agent,
configures it, and publishes it.

Prerequisites:
  1. Run `python scripts/generate_fabric_seed_data.py` first
  2. Create a Service Principal (SPN) in the Fabric tenant (Contoso):
     - Azure Portal → App registrations → New registration
     - Name: "sage-fabric-connector"
     - Create a client secret
     - Grant the SPN "Contributor" on the Fabric workspace "jawad-demo-01"
  3. Set environment variables (or create scripts/.env):
       FABRIC_TENANT_ID=3acec0fd-ecb3-4e12-8f69-6fa150cca992
       FABRIC_CLIENT_ID=<your-spn-client-id>
       FABRIC_CLIENT_SECRET=<your-spn-secret>
       FABRIC_WORKSPACE_NAME=jawad-demo-01

Usage:
    python scripts/fabric_setup.py [--step all|lakehouse|upload|agent]

Steps:
  1. lakehouse  — Create Lakehouse in workspace
  2. upload     — Upload CSV seed data to Lakehouse Files
  3. agent      — Create Data Agent, add datasource, publish

Note: The Fabric REST APIs and Data Agent management APIs are used here.
Some steps may require the fabric-data-agent-sdk if available, but this
script uses direct REST calls for maximum compatibility.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Load .env from scripts/ or backend/
try:
    from dotenv import load_dotenv
    for env_path in [Path(__file__).parent / ".env", Path(__file__).parent.parent / "backend" / ".env"]:
        if env_path.exists():
            load_dotenv(env_path)
            break
except ImportError:
    pass

# ── Configuration ────────────────────────────────────────────────────────────

TENANT_ID = os.getenv("FABRIC_TENANT_ID", "3acec0fd-ecb3-4e12-8f69-6fa150cca992")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET", "")
WORKSPACE_NAME = os.getenv("FABRIC_WORKSPACE_NAME", "jawad-demo-01")

SEED_DATA_DIR = Path(__file__).parent / "seed_data"
FABRIC_API_BASE = "https://api.fabric.microsoft.com/v1"

# ── Auth ─────────────────────────────────────────────────────────────────────

def get_fabric_token() -> str:
    """Acquire a Fabric API token using the SPN."""
    if not CLIENT_ID or not CLIENT_SECRET:
        print("❌ FABRIC_CLIENT_ID and FABRIC_CLIENT_SECRET must be set.")
        print("   Create a Service Principal in the Fabric tenant and set these env vars.")
        sys.exit(1)

    from azure.identity import ClientSecretCredential
    credential = ClientSecretCredential(
        tenant_id=TENANT_ID,
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
    )
    token = credential.get_token("https://api.fabric.microsoft.com/.default")
    print(f"✓ Fabric token acquired (expires in {int(token.expires_on - time.time())}s)")
    return token.token


def get_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


# ── REST Helpers ─────────────────────────────────────────────────────────────

import urllib.request
import urllib.error

def fabric_get(url: str, headers: dict) -> dict:
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"GET {url} → {e.code}: {body}") from e

def fabric_post(url: str, headers: dict, body: dict | None = None) -> dict | None:
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        raise RuntimeError(f"POST {url} → {e.code}: {body_text}") from e


# ── Step 1: Get/Create Workspace ─────────────────────────────────────────────

def get_workspace_id(token: str) -> str:
    """Find the workspace by name."""
    headers = get_headers(token)
    result = fabric_get(f"{FABRIC_API_BASE}/workspaces", headers)
    for ws in result.get("value", []):
        if ws["displayName"] == WORKSPACE_NAME:
            print(f"✓ Found workspace '{WORKSPACE_NAME}' (id={ws['id']})")
            return ws["id"]
    raise RuntimeError(f"Workspace '{WORKSPACE_NAME}' not found. Create it in the Fabric portal first.")


# ── Step 2: Create Lakehouse ─────────────────────────────────────────────────

def create_or_get_lakehouse(token: str, workspace_id: str) -> str:
    """Create a Lakehouse named 'sage-retirement-data' or return existing."""
    headers = get_headers(token)
    lh_name = "sage_retirement_data"

    # Check existing items
    items = fabric_get(f"{FABRIC_API_BASE}/workspaces/{workspace_id}/items", headers)
    for item in items.get("value", []):
        if item["displayName"] == lh_name and item["type"] == "Lakehouse":
            print(f"✓ Lakehouse '{lh_name}' already exists (id={item['id']})")
            return item["id"]

    # Create new
    body = {"displayName": lh_name, "type": "Lakehouse"}
    result = fabric_post(f"{FABRIC_API_BASE}/workspaces/{workspace_id}/items", headers, body)
    lh_id = result["id"] if result else ""
    print(f"✓ Created Lakehouse '{lh_name}' (id={lh_id})")
    return lh_id


# ── Step 3: Upload Seed Data ─────────────────────────────────────────────────

def upload_seed_data(token: str, workspace_id: str, lakehouse_id: str):
    """Upload CSV files from seed_data/ to the Lakehouse Files section."""
    # OneLake DFS requires a storage-scoped token, not the Fabric API token
    from azure.identity import ClientSecretCredential
    credential = ClientSecretCredential(
        tenant_id=TENANT_ID, client_id=CLIENT_ID, client_secret=CLIENT_SECRET,
    )
    storage_token = credential.get_token("https://storage.azure.com/.default").token
    print(f"✓ OneLake storage token acquired")

    # OneLake path: workspaces/{ws_id}/{lh_name}.Lakehouse/Files/
    upload_base = f"https://onelake.dfs.fabric.microsoft.com/{workspace_id}/{lakehouse_id}/Files"

    if not SEED_DATA_DIR.exists():
        print(f"❌ Seed data directory not found: {SEED_DATA_DIR}")
        print("   Run `python scripts/generate_fabric_seed_data.py` first.")
        sys.exit(1)

    csv_files = list(SEED_DATA_DIR.glob("*.csv"))
    if not csv_files:
        print(f"❌ No CSV files found in {SEED_DATA_DIR}")
        sys.exit(1)

    print(f"\nUploading {len(csv_files)} files to OneLake...")
    for csv_path in csv_files:
        file_url = f"{upload_base}/{csv_path.name}?resource=file"
        with open(csv_path, "rb") as f:
            file_data = f.read()

        # Create file
        create_req = urllib.request.Request(
            file_url,
            headers={
                "Authorization": f"Bearer {storage_token}",
                "Content-Length": "0",
            },
            method="PUT",
        )
        try:
            with urllib.request.urlopen(create_req):
                pass
        except urllib.error.HTTPError as e:
            if e.code == 409:  # already exists
                pass
            else:
                print(f"  ⚠ Create failed for {csv_path.name}: {e.code}")
                continue

        # Append data
        append_url = f"{upload_base}/{csv_path.name}?action=append&position=0"
        append_req = urllib.request.Request(
            append_url,
            data=file_data,
            headers={
                "Authorization": f"Bearer {storage_token}",
                "Content-Type": "application/octet-stream",
                "Content-Length": str(len(file_data)),
            },
            method="PATCH",
        )
        try:
            with urllib.request.urlopen(append_req):
                pass
        except urllib.error.HTTPError as e:
            print(f"  ⚠ Append failed for {csv_path.name}: {e.code}")
            continue

        # Flush
        flush_url = f"{upload_base}/{csv_path.name}?action=flush&position={len(file_data)}"
        flush_req = urllib.request.Request(
            flush_url,
            headers={
                "Authorization": f"Bearer {storage_token}",
                "Content-Length": "0",
            },
            method="PATCH",
        )
        try:
            with urllib.request.urlopen(flush_req):
                pass
        except urllib.error.HTTPError as e:
            print(f"  ⚠ Flush failed for {csv_path.name}: {e.code}")
            continue

        print(f"  ✓ {csv_path.name} ({len(file_data):,} bytes)")

    print("✓ All seed data uploaded to OneLake Files.")


# ── Step 4: Create Data Agent (guidance) ─────────────────────────────────────

def setup_data_agent_guidance(workspace_id: str, lakehouse_id: str):
    """
    Print guidance for creating the Data Agent.
    The Data Agent REST API is currently only available within Fabric notebooks
    via the fabric-data-agent-sdk. For external automation, we provide the
    notebook code to paste into Fabric.
    """
    print("\n" + "=" * 72)
    print("NEXT STEP: Create & Publish the Data Agent")
    print("=" * 72)
    print(f"""
The Data Agent must be created from within a Fabric Notebook in the
'{WORKSPACE_NAME}' workspace. Here's what to do:

1. Go to the Fabric portal → workspace '{WORKSPACE_NAME}'
2. Create a new Notebook
3. Paste the following code and run each cell:

─── Cell 1: Create Data Agent ───────────────────────────
from fabric.dataagent.manage import create_data_agent

agent = create_data_agent("sage-retirement-agent")
print(f"Agent ID: {{agent.id}}")
print(f"Agent Name: {{agent.name}}")

─── Cell 2: Add Lakehouse as Datasource ─────────────────
datasources = agent.datasource.list()
print("Available datasources:", datasources)

# Select the sage-retirement-data lakehouse
agent.datasource.add("{lakehouse_id}")
# Or by name: find the datasource with name "sage-retirement-data"

─── Cell 3: Select All Tables ───────────────────────────
# After uploading CSVs and converting to Delta tables:
tables = agent.datasource.list_tables("{lakehouse_id}")
for t in tables:
    agent.datasource.select_table("{lakehouse_id}", t["name"])
print("Selected tables:", agent.datasource.list_selected_tables())

─── Cell 4: Add Instructions ────────────────────────────
agent.instruction.add(
    "You are a financial data agent for the Sage Retirement Planning app. "
    "You help retrieve and analyze client portfolio data, account balances, "
    "holdings, and investment products. Always provide accurate numerical "
    "data from the lakehouse tables. When asked about a client, look them "
    "up in the clients table by name or ID."
)

─── Cell 5: Add Few-Shot Examples ───────────────────────
agent.fewshot.add(
    question="Show me Sarah Chen's portfolio",
    sql_query="SELECT c.*, a.account_id, a.name as account_name, a.type, a.balance "
              "FROM clients c JOIN accounts a ON c.id = a.client_id "
              "WHERE c.name = 'Sarah Chen'",
)

agent.fewshot.add(
    question="What is the total portfolio value for all clients?",
    sql_query="SELECT c.name, c.investment_assets, SUM(a.balance) as total_balance "
              "FROM clients c JOIN accounts a ON c.id = a.client_id "
              "GROUP BY c.name, c.investment_assets",
)

─── Cell 6: Publish ─────────────────────────────────────
published = agent.publish()
print(f"Published URL: {{published.url}}")
print(f"Agent/Assistant ID: {{published.id}}")

# Save these values — you'll need them for the Sage backend .env:
# FABRIC_DATA_AGENT_URL = published.url
# FABRIC_DATA_AGENT_ID  = published.id
──────────────────────────────────────────────────────────

4. After publishing, update your backend/.env with:
   FABRIC_DATA_AGENT_URL=<published.url>
   FABRIC_DATA_AGENT_ID=<published.id>

5. Restart the Sage backend and the Fabric mode will be available!

Workspace ID:  {workspace_id}
Lakehouse ID:  {lakehouse_id}
""")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fabric workspace setup for Sage")
    parser.add_argument(
        "--step",
        choices=["all", "lakehouse", "upload", "agent"],
        default="all",
        help="Which step to run (default: all)",
    )
    args = parser.parse_args()

    print("="* 60)
    print("Sage Retirement Planning — Fabric Setup")
    print("=" * 60)
    print(f"  Tenant:    {TENANT_ID}")
    print(f"  Workspace: {WORKSPACE_NAME}")
    print(f"  SPN:       {CLIENT_ID[:8]}... (set)" if CLIENT_ID else "  SPN:       ❌ NOT SET")
    print()

    token = get_fabric_token()
    workspace_id = get_workspace_id(token)

    # Always resolve the lakehouse (create if needed for lakehouse/all, just lookup otherwise)
    lakehouse_id = create_or_get_lakehouse(token, workspace_id)

    if args.step in ("all", "upload"):
        upload_seed_data(token, workspace_id, lakehouse_id)

    if args.step in ("all", "agent"):
        setup_data_agent_guidance(workspace_id, lakehouse_id)


if __name__ == "__main__":
    main()
