"""
Create and configure a Fabric Data Agent programmatically via REST API.
"""
import os, sys, json, time, requests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from azure.identity import ClientSecretCredential

TENANT_ID = os.getenv("FABRIC_TENANT_ID")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET")
WORKSPACE_ID = "004abea8-0d5e-48d6-bf58-f6f23e41690c"
LAKEHOUSE_ID = "e489f4bb-6032-47ca-82a9-ecb586dff277"
AGENT_NAME = "sage_retirement_agent"

BASE = "https://api.fabric.microsoft.com/v1"

def get_token():
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    return cred.get_token("https://api.fabric.microsoft.com/.default").token

def headers():
    return {"Authorization": f"Bearer {get_token()}", "Content-Type": "application/json"}

def list_items():
    r = requests.get(f"{BASE}/workspaces/{WORKSPACE_ID}/items", headers=headers())
    r.raise_for_status()
    items = r.json().get("value", [])
    print(f"\n{'Type':25s} {'ID':40s} Name")
    print("-" * 90)
    for item in items:
        print(f"{item['type']:25s} {item['id']:40s} {item['displayName']}")
    return items

def find_agent(items):
    for item in items:
        if item["type"] == "DataAgent" and item["displayName"] == AGENT_NAME:
            return item
    return None

def create_agent():
    print(f"\nCreating Data Agent '{AGENT_NAME}'...")
    payload = {
        "displayName": AGENT_NAME,
        "type": "DataAgent",
        "description": "Sage Retirement Planning data agent for client portfolio queries"
    }
    r = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/items",
        headers=headers(),
        json=payload
    )
    print(f"  Status: {r.status_code}")
    if r.status_code in (200, 201, 202):
        result = r.json() if r.text else {}
        print(f"  Response: {json.dumps(result, indent=2)}")
        # Handle long-running operation
        if r.status_code == 202:
            loc = r.headers.get("Location") or r.headers.get("Operation-Location")
            if loc:
                print(f"  Polling: {loc}")
                for _ in range(30):
                    time.sleep(2)
                    pr = requests.get(loc, headers=headers())
                    pdata = pr.json() if pr.text else {}
                    status = pdata.get("status", "")
                    print(f"    ... {status}")
                    if status in ("Succeeded", "succeeded", "Completed", "completed"):
                        return pdata
                    if status in ("Failed", "failed"):
                        print(f"    FAILED: {json.dumps(pdata, indent=2)}")
                        return None
            return result
        return result
    else:
        print(f"  Error: {r.text}")
        return None

def get_agent_definition(agent_id):
    """Get the Data Agent item definition."""
    r = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/items/{agent_id}/getDefinition",
        headers=headers()
    )
    print(f"\nGet definition: {r.status_code}")
    if r.status_code == 200:
        print(json.dumps(r.json(), indent=2))
        return r.json()
    elif r.status_code == 202:
        loc = r.headers.get("Location") or r.headers.get("Operation-Location")
        if loc:
            for _ in range(15):
                time.sleep(2)
                pr = requests.get(loc, headers=headers())
                if pr.status_code == 200:
                    pdata = pr.json()
                    print(json.dumps(pdata, indent=2))
                    return pdata
    else:
        print(f"  Error: {r.text}")
    return None

def try_ai_agent_endpoints(agent_id):
    """Try various API patterns to interact with the Data Agent."""
    h = headers()
    
    # Try: Get item details
    print(f"\n--- Item details ---")
    r = requests.get(f"{BASE}/workspaces/{WORKSPACE_ID}/items/{agent_id}", headers=h)
    print(f"GET item: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(json.dumps(data, indent=2))

    # Try: List data agent specific endpoints
    endpoints_to_try = [
        ("GET", f"{BASE}/workspaces/{WORKSPACE_ID}/dataAgents/{agent_id}", None),
        ("GET", f"{BASE}/workspaces/{WORKSPACE_ID}/dataAgents", None),
        ("GET", f"{BASE}/workspaces/{WORKSPACE_ID}/items/{agent_id}/dataAgentProperties", None),
    ]
    
    for method, url, body in endpoints_to_try:
        print(f"\n--- {method} {url.split('/v1/')[-1]} ---")
        if method == "GET":
            r = requests.get(url, headers=h)
        else:
            r = requests.post(url, headers=h, json=body)
        print(f"  Status: {r.status_code}")
        if r.status_code in (200, 201):
            print(f"  Response: {json.dumps(r.json(), indent=2)[:500]}")
        elif r.text:
            print(f"  Error: {r.text[:300]}")


def try_publish_agent(agent_id):
    """Try to trigger a publish job on the Data Agent."""
    h = headers()
    
    # Try job-based publish
    print(f"\n--- Attempting publish via jobs API ---")
    r = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/items/{agent_id}/jobs/instances?jobType=DefaultJob",
        headers=h
    )
    print(f"  Status: {r.status_code}")
    if r.text:
        print(f"  Response: {r.text[:500]}")
    if r.status_code == 202:
        loc = r.headers.get("Location") or r.headers.get("Operation-Location")
        if loc:
            print(f"  Polling: {loc}")
            for _ in range(30):
                time.sleep(3)
                pr = requests.get(loc, headers=h)
                print(f"    ... {pr.status_code} {pr.text[:200] if pr.text else ''}")
                if pr.status_code == 200 and "ucceeded" in (pr.text or ""):
                    return True
    return False

def main():
    print("=" * 60)
    print("Sage - Fabric Data Agent Setup")
    print("=" * 60)

    # 1. List existing items
    items = list_items()
    
    # 2. Find or create agent
    agent = find_agent(items)
    if agent:
        agent_id = agent["id"]
        print(f"\nExisting Data Agent found: {agent_id}")
    else:
        result = create_agent()
        if not result:
            print("Failed to create Data Agent.")
            return
        agent_id = result.get("id", "")
        if not agent_id:
            # Re-list items to find it
            time.sleep(3)
            items = list_items()
            agent = find_agent(items)
            if agent:
                agent_id = agent["id"]
            else:
                print("Could not find agent after creation.")
                return
        print(f"\nData Agent created: {agent_id}")

    # 3. Explore agent capabilities
    try_ai_agent_endpoints(agent_id)
    
    # 4. Get definition
    get_agent_definition(agent_id)
    
    print(f"\n\nAgent ID: {agent_id}")
    print(f"Workspace ID: {WORKSPACE_ID}")


if __name__ == "__main__":
    main()
