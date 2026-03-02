"""Configure and publish the Fabric Data Agent."""
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
AGENT_NAME = "sage_retirement_agent"

BASE = "https://api.fabric.microsoft.com/v1"

def get_token():
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    return cred.get_token("https://api.fabric.microsoft.com/.default").token

def headers():
    return {"Authorization": f"Bearer {get_token()}", "Content-Type": "application/json"}

def to_b64(obj):
    return base64.b64encode(json.dumps(obj, indent=2).encode("utf-8")).decode("ascii")

def poll_operation(loc, h, max_polls=20, interval=3):
    """Poll a long-running operation until completion."""
    for i in range(max_polls):
        time.sleep(interval)
        pr = requests.get(loc, headers=h)
        if pr.status_code == 200:
            data = pr.json() if pr.text else {}
            status = data.get("status", "")
            print(f"  Poll {i}: {status}")
            if status in ("Succeeded", "succeeded", "Completed", "completed"):
                return data
            if status in ("Failed", "failed"):
                print(f"  FAILED: {json.dumps(data, indent=2)}")
                return None
        else:
            print(f"  Poll {i}: HTTP {pr.status_code}")
    print("  Timed out polling.")
    return None

def get_definition():
    """Fetch the current Data Agent definition."""
    h = headers()
    r = requests.post(f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/getDefinition", headers=h)
    print(f"getDefinition: {r.status_code}")
    if r.status_code == 202:
        loc = r.headers.get("Location")
        retry = int(r.headers.get("Retry-After", "5"))
        time.sleep(retry)
        pr = requests.get(loc, headers=h)
        if pr.status_code == 200:
            op_data = pr.json()
            if op_data.get("status") == "Succeeded":
                # Need to get result
                result_url = loc + "/result" if "/result" not in loc else loc
                rr = requests.get(result_url, headers=h)
                if rr.status_code == 200:
                    return rr.json()
    elif r.status_code == 200:
        return r.json()
    return None

def update_definition():
    """Update the Data Agent definition with lakehouse datasource and instructions."""
    h = headers()
    
    data_agent_config = {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/dataAgent/2.1.0/schema.json",
        "dataSources": [
            {
                "type": "Lakehouse",
                "workspaceId": WORKSPACE_ID,
                "artifactId": LAKEHOUSE_ID,
                "displayName": "sage_retirement_data"
            }
        ]
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
        "dataSources": [
            {
                "type": "Lakehouse",
                "workspaceId": WORKSPACE_ID,
                "artifactId": LAKEHOUSE_ID
            }
        ]
    }

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
                }
            ]
        }
    }

    print("\nUpdating Data Agent definition...")
    print(f"  Datasource: Lakehouse {LAKEHOUSE_ID}")
    print(f"  Instructions: {len(stage_config['aiInstructions'])} chars")
    
    r = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/updateDefinition",
        headers=h,
        json=payload
    )
    print(f"  updateDefinition: {r.status_code}")
    
    if r.status_code == 200:
        print("  Updated successfully!")
        return True
    elif r.status_code == 202:
        loc = r.headers.get("Location")
        result = poll_operation(loc, h)
        if result and result.get("status") in ("Succeeded", "succeeded"):
            print("  Updated successfully!")
            return True
        return False
    else:
        print(f"  Error: {r.text[:500]}")
        # Try simpler definition without datasources in data_agent.json
        print("\n  Retrying with simpler definition...")
        data_agent_config_simple = {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/dataAgent/2.1.0/schema.json"
        }
        stage_config_with_sources = {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/stageConfiguration/1.0.0/schema.json",
            "aiInstructions": stage_config["aiInstructions"],
            "dataSources": [
                {
                    "type": "Lakehouse",
                    "workspaceId": WORKSPACE_ID,
                    "artifactId": LAKEHOUSE_ID
                }
            ]
        }
        payload2 = {
            "definition": {
                "parts": [
                    {
                        "path": "Files/Config/data_agent.json",
                        "payload": to_b64(data_agent_config_simple),
                        "payloadType": "InlineBase64"
                    },
                    {
                        "path": "Files/Config/draft/stage_config.json",
                        "payload": to_b64(stage_config_with_sources),
                        "payloadType": "InlineBase64"
                    }
                ]
            }
        }
        r2 = requests.post(
            f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/updateDefinition",
            headers=h,
            json=payload2
        )
        print(f"  Retry updateDefinition: {r2.status_code}")
        if r2.status_code in (200, 202):
            if r2.status_code == 202:
                loc = r2.headers.get("Location")
                result = poll_operation(loc, h)
                return result and result.get("status") in ("Succeeded", "succeeded")
            return True
        else:
            print(f"  Retry Error: {r2.text[:500]}")
            
            # Last try - just instructions only
            print("\n  Final retry - instructions only...")
            stage_config_minimal = {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/stageConfiguration/1.0.0/schema.json",
                "aiInstructions": stage_config["aiInstructions"]
            }
            payload3 = {
                "definition": {
                    "parts": [
                        {
                            "path": "Files/Config/draft/stage_config.json",
                            "payload": to_b64(stage_config_minimal),
                            "payloadType": "InlineBase64"
                        }
                    ]
                }
            }
            r3 = requests.post(
                f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/updateDefinition",
                headers=h,
                json=payload3
            )
            print(f"  Final retry: {r3.status_code}")
            if r3.status_code in (200, 202):
                if r3.status_code == 202:
                    loc = r3.headers.get("Location")
                    result = poll_operation(loc, h)
                    return result and result.get("status") in ("Succeeded", "succeeded")
                return True
            print(f"  Final error: {r3.text[:500]}")
        return False


def publish_agent():
    """Publish the Data Agent to make it available via API."""
    h = headers()
    
    # Method 1: Try the standard publish endpoint
    print("\nPublishing Data Agent...")
    
    # First try: RunOnDemandItemJob with Publish
    job_types = ["Publish", "DefaultJob"]
    for jt in job_types:
        print(f"  Trying job type: {jt}")
        r = requests.post(
            f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/jobs/instances?jobType={jt}",
            headers=h
        )
        print(f"    Status: {r.status_code}")
        if r.status_code == 202:
            loc = r.headers.get("Location")
            if loc:
                result = poll_operation(loc, h)
                if result and result.get("status") in ("Succeeded", "succeeded"):
                    print("  Published successfully!")
                    return True
        elif r.status_code in (200, 201):
            print("  Published successfully!")
            return True
        else:
            print(f"    Response: {r.text[:300]}")
    
    # Method 2: Try update with published stage config
    print("\n  Trying publish via definition update (published stage)...")
    
    # Get current draft config
    defn = get_definition()
    draft_config = None
    if defn:
        for part in defn.get("definition", {}).get("parts", []):
            if "draft/stage_config" in part["path"]:
                draft_config = json.loads(base64.b64decode(part["payload"]).decode("utf-8"))
                break
    
    if draft_config:
        # Copy draft to published
        published_config = dict(draft_config)
        payload = {
            "definition": {
                "parts": [
                    {
                        "path": "Files/Config/published/stage_config.json",
                        "payload": to_b64(published_config),
                        "payloadType": "InlineBase64"
                    },
                    {
                        "path": "Files/Config/draft/stage_config.json",
                        "payload": to_b64(draft_config),
                        "payloadType": "InlineBase64"
                    }
                ]
            }
        }
        r = requests.post(
            f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/updateDefinition",
            headers=h,
            json=payload
        )
        print(f"    Status: {r.status_code}")
        if r.status_code == 202:
            loc = r.headers.get("Location")
            result = poll_operation(loc, h)
            if result and result.get("status") in ("Succeeded", "succeeded"):
                print("  Published via definition update!")
                return True
        elif r.status_code == 200:
            print("  Published via definition update!")
            return True
        else:
            print(f"    Error: {r.text[:300]}")
    
    return False


def verify_published():
    """Verify the Data Agent is published and get the endpoint details."""
    h = headers()
    
    print("\nVerifying published Data Agent...")
    
    # Check item details
    r = requests.get(f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}", headers=h)
    if r.status_code == 200:
        item = r.json()
        print(f"  Item: {json.dumps(item, indent=2)}")
    
    # Get updated definition to check published stage
    defn = get_definition()
    if defn:
        parts = defn.get("definition", {}).get("parts", [])
        print(f"\n  Definition parts ({len(parts)}):")
        for part in parts:
            decoded = json.loads(base64.b64decode(part["payload"]).decode("utf-8"))
            print(f"\n  --- {part['path']} ---")
            print(f"  {json.dumps(decoded, indent=4)}")
    
    # The Data Agent URL and ID for the Sage backend:
    # URL is typically: https://<region>.api.fabric.microsoft.com/v1
    # Agent ID is the item ID or a published assistant ID
    print(f"\n{'='*60}")
    print(f"Data Agent Configuration for backend/.env:")
    print(f"  FABRIC_DATA_AGENT_URL=https://api.fabric.microsoft.com/v1")
    print(f"  FABRIC_DATA_AGENT_ID={AGENT_ID}")
    print(f"{'='*60}")


def main():
    print("=" * 60)
    print("Sage - Configure & Publish Data Agent")
    print("=" * 60)
    print(f"  Workspace: {WORKSPACE_ID}")
    print(f"  Lakehouse: {LAKEHOUSE_ID}")
    print(f"  Agent:     {AGENT_ID}")
    
    # Step 1: Update definition
    if update_definition():
        print("\n✓ Definition updated")
    else:
        print("\n✗ Definition update had issues (continuing anyway)")
    
    # Step 2: Publish
    if publish_agent():
        print("\n✓ Agent published")
    else:
        print("\n✗ Publish had issues (checking status anyway)")
    
    # Step 3: Verify
    verify_published()


if __name__ == "__main__":
    main()
