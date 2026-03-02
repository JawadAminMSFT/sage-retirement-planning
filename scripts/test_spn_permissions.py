"""
Test Fabric Data Agent with user-delegated token (device code flow)
to verify the issue is SPN permissions vs agent configuration.
"""
import os, sys, json, time, requests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from azure.identity import ClientSecretCredential, DeviceCodeCredential
from openai import OpenAI

URL = os.getenv("FABRIC_DATA_AGENT_URL")
AGENT_ID = os.getenv("FABRIC_DATA_AGENT_ID")
TENANT_ID = os.getenv("FABRIC_TENANT_ID")
CLIENT_ID_SPN = os.getenv("FABRIC_CLIENT_ID")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET")
WORKSPACE_ID = "004abea8-0d5e-48d6-bf58-f6f23e41690c"

BASE = "https://api.fabric.microsoft.com/v1"

def get_spn_token():
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID_SPN, CLIENT_SECRET)
    return cred.get_token("https://api.fabric.microsoft.com/.default").token

def check_spn_sql_access():
    """Check if the SPN can access the SQL analytics endpoint."""
    token = get_spn_token()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 1. Check workspace role assignments
    print("--- Workspace role assignments ---")
    r = requests.get(f"{BASE}/workspaces/{WORKSPACE_ID}/roleAssignments", headers=h)
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        for ra in r.json().get("value", []):
            principal = ra.get("principal", {})
            print(f"  Role: {ra.get('role'):15s} | Type: {principal.get('type'):20s} | ID: {principal.get('id')}")
    else:
        print(f"  Error: {r.text[:300]}")
    
    # 2. Check data agent permissions
    print("\n--- Data Agent item permissions ---")
    r2 = requests.get(f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}", headers=h)
    print(f"  Item details: {r2.status_code}")
    if r2.status_code == 200:
        print(f"  {json.dumps(r2.json(), indent=2)}")
    
    # 3. Try direct SQL analytics endpoint
    print("\n--- SQL Analytics Endpoint test ---")
    sql_ep_id = "e9b03130-caad-44cf-9590-b1b184120093"
    
    # Try executing a simple SQL query
    sql_token = ClientSecretCredential(TENANT_ID, CLIENT_ID_SPN, CLIENT_SECRET).get_token(
        "https://analysis.windows.net/powerbi/api/.default"
    ).token
    h_sql = {"Authorization": f"Bearer {sql_token}", "Content-Type": "application/json"}
    
    # Try the executeQueries API
    r3 = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/sqlEndpoints/{sql_ep_id}/executeQueries",
        headers=h_sql,
        json={
            "queries": [{"query": "SELECT COUNT(*) as cnt FROM clients"}],
            "type": "SqlQuery"
        }
    )
    print(f"  executeQueries: {r3.status_code}")
    if r3.status_code == 200:
        print(f"  Result: {json.dumps(r3.json(), indent=2)[:500]}")
    else:
        print(f"  Error: {r3.text[:500]}")
    
    # Also try with Fabric scope
    h_fab = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r4 = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/sqlEndpoints/{sql_ep_id}/executeQueries",
        headers=h_fab,
        json={
            "queries": [{"query": "SELECT COUNT(*) as cnt FROM clients"}],
            "type": "SqlQuery"
        }
    )
    print(f"\n  executeQueries (fabric scope): {r4.status_code}")
    if r4.status_code == 200:
        print(f"  Result: {json.dumps(r4.json(), indent=2)[:500]}")
    else:
        print(f"  Error: {r4.text[:500]}")

def test_agent_with_header():
    """Try adding extra headers the agent might need."""
    token = get_spn_token()
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    print("\n--- Test with createAndRun endpoint ---")
    # Try the combined create-and-run endpoint
    r = requests.post(
        f"{URL}/threads/runs?api-version=2024-07-01-preview",
        headers=h,
        json={
            "assistant_id": AGENT_ID,
            "thread": {
                "messages": [
                    {"role": "user", "content": "How many clients are in the database?"}
                ]
            }
        }
    )
    print(f"  createAndRun: {r.status_code}")
    if r.status_code in (200, 201):
        data = r.json()
        tid = data.get("thread_id")
        rid = data.get("id")
        status = data.get("status")
        print(f"  Thread: {tid}, Run: {rid}, Status: {status}")
        
        for i in range(20):
            time.sleep(3)
            r2 = requests.get(
                f"{URL}/threads/{tid}/runs/{rid}?api-version=2024-07-01-preview",
                headers=h
            )
            if r2.status_code == 200:
                rd = r2.json()
                s = rd.get("status")
                print(f"    Poll {i}: {s}")
                if s == "completed":
                    r3 = requests.get(
                        f"{URL}/threads/{tid}/messages?api-version=2024-07-01-preview",
                        headers=h
                    )
                    if r3.status_code == 200:
                        for m in r3.json().get("data", []):
                            if m.get("role") == "assistant":
                                for c in m.get("content", []):
                                    if c.get("type") == "text":
                                        print(f"\n  ANSWER: {c['text']['value'][:500]}")
                    break
                elif s == "failed":
                    print(f"    Error: {rd.get('last_error')}")
                    break
    else:
        print(f"  Error: {r.text[:500]}")


if __name__ == "__main__":
    check_spn_sql_access()
    test_agent_with_header()
