"""Select tables in the Data Agent datasource and re-publish."""
import os, sys, json, requests, base64, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from azure.identity import ClientSecretCredential

TENANT_ID = os.getenv("FABRIC_TENANT_ID")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET")
WORKSPACE_ID = "004abea8-0d5e-48d6-bf58-f6f23e41690c"
LAKEHOUSE_ID = "e489f4bb-6032-47ca-82a9-ecb586dff277"
AGENT_ID = "7311726d-f193-4fd4-9e72-116c1e5568d3"
BASE = "https://api.fabric.microsoft.com/v1"

TABLES = ["clients", "accounts", "holdings", "transactions", "investment_products"]

def get_token():
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    return cred.get_token("https://api.fabric.microsoft.com/.default").token

def headers():
    return {"Authorization": f"Bearer {get_token()}", "Content-Type": "application/json"}

def to_b64(obj):
    return base64.b64encode(json.dumps(obj, indent=2).encode("utf-8")).decode("ascii")

def poll_operation(loc, h, max_polls=20, interval=3):
    for i in range(max_polls):
        time.sleep(interval)
        pr = requests.get(loc, headers=h)
        if pr.status_code == 200:
            data = pr.json() if pr.text else {}
            status = data.get("status", "")
            print(f"    Poll {i}: {status}")
            if status in ("Succeeded", "succeeded"):
                return True
            if status in ("Failed", "failed"):
                print(f"    FAILED: {json.dumps(data, indent=2)}")
                return False
    return False

def main():
    h = headers()

    # Build datasource config with all tables selected
    elements = [{"name": t, "type": "table"} for t in TABLES]
    
    datasource_config = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/dataSource/1.0.0/schema.json",
        "artifactId": LAKEHOUSE_ID,
        "workspaceId": WORKSPACE_ID,
        "dataSourceInstructions": (
            "This lakehouse contains retirement planning client data. "
            "Tables: clients (client info and investment assets), "
            "accounts (account types and balances), "
            "holdings (individual stock/bond/fund positions), "
            "transactions (buy/sell/deposit/withdrawal history), "
            "investment_products (fund/ETF details with expense ratios and risk levels)."
        ),
        "displayName": "sage_retirement_data",
        "type": "lakehouse_tables",
        "userDescription": "Sage Retirement Planning client portfolio data",
        "metadata": {},
        "elements": elements
    }

    stage_config = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/stageConfiguration/1.0.0/schema.json",
        "aiInstructions": (
            "You are a financial data agent for the Sage Retirement Planning application. "
            "You help retrieve and analyze client portfolio data including account balances, "
            "holdings, transactions, and investment products. Always provide accurate numerical "
            "data from the lakehouse tables. When asked about a client, look them up in the "
            "clients table by name or ID. "
            "Tables available: clients, accounts, holdings, transactions, investment_products."
        ),
    }

    data_agent_config = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/dataAgent/2.1.0/schema.json"
    }

    publish_info = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/publishInfo/1.0.0/schema.json",
        "description": "Sage Retirement Planning data agent"
    }

    # Build definition with both draft and published datasources
    payload = {
        "definition": {
            "parts": [
                {
                    "path": "Files/Config/data_agent.json",
                    "payload": to_b64(data_agent_config),
                    "payloadType": "InlineBase64"
                },
                {
                    "path": "Files/Config/draft/stage_config.json",
                    "payload": to_b64(stage_config),
                    "payloadType": "InlineBase64"
                },
                {
                    "path": "Files/Config/draft/lakehouse-tables-sage_retirement_data/datasource.json",
                    "payload": to_b64(datasource_config),
                    "payloadType": "InlineBase64"
                },
                {
                    "path": "Files/Config/published/stage_config.json",
                    "payload": to_b64(stage_config),
                    "payloadType": "InlineBase64"
                },
                {
                    "path": "Files/Config/published/lakehouse-tables-sage_retirement_data/datasource.json",
                    "payload": to_b64(datasource_config),
                    "payloadType": "InlineBase64"
                },
                {
                    "path": "Files/Config/publish_info.json",
                    "payload": to_b64(publish_info),
                    "payloadType": "InlineBase64"
                },
            ]
        }
    }

    print("Updating Data Agent definition with table selections...")
    print(f"  Tables: {TABLES}")
    
    r = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/updateDefinition",
        headers=h,
        json=payload
    )
    print(f"  Status: {r.status_code}")
    
    if r.status_code == 202:
        loc = r.headers.get("Location")
        if poll_operation(loc, h):
            print("  Definition updated successfully!")
        else:
            print("  Definition update failed.")
            return
    elif r.status_code == 200:
        print("  Updated!")
    else:
        print(f"  Error: {r.text[:500]}")
        return

    # Verify
    print("\nVerifying definition...")
    r2 = requests.post(f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/getDefinition", headers=h)
    if r2.status_code == 202:
        loc = r2.headers.get("Location")
        time.sleep(int(r2.headers.get("Retry-After", "5")))
        pr = requests.get(loc, headers=h)
        if pr.status_code == 200 and pr.json().get("status") == "Succeeded":
            rr = requests.get(loc + "/result", headers=h)
            if rr.status_code == 200:
                for part in rr.json().get("definition", {}).get("parts", []):
                    if "datasource" in part["path"]:
                        decoded = json.loads(base64.b64decode(part["payload"]).decode("utf-8"))
                        elems = decoded.get("elements", [])
                        print(f"  {part['path']}: {len(elems)} elements")
                        for e in elems:
                            print(f"    - {e}")


if __name__ == "__main__":
    main()
