"""Test Data Agent variations - no api-version, different endpoints."""
import os, sys, json, time, requests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from azure.identity import ClientSecretCredential, DeviceCodeCredential

TENANT_ID = os.getenv("FABRIC_TENANT_ID")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET")
WORKSPACE_ID = "004abea8-0d5e-48d6-bf58-f6f23e41690c"
AGENT_ID = "7311726d-f193-4fd4-9e72-116c1e5568d3"

cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
token = cred.get_token("https://api.fabric.microsoft.com/.default").token
h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Base URL from user
BASE_URL = f"https://api.fabric.microsoft.com/v1/workspaces/{WORKSPACE_ID}/dataagents/{AGENT_ID}/aiassistant/openai"

# Test 1: No api-version at all
print("=" * 60)
print("Test 1: No api-version parameter")
print("=" * 60)

r = requests.post(f"{BASE_URL}/threads", headers=h, json={})
print(f"Create thread: {r.status_code}")
if r.status_code in (200, 201):
    tid = r.json().get("id")
    print(f"  Thread: {tid}")
    
    r2 = requests.post(f"{BASE_URL}/threads/{tid}/messages", headers=h,
                        json={"role": "user", "content": "How many clients?"})
    print(f"Add message: {r2.status_code}")
    
    r3 = requests.post(f"{BASE_URL}/threads/{tid}/runs", headers=h,
                        json={"assistant_id": AGENT_ID})
    print(f"Create run: {r3.status_code}")
    if r3.status_code in (200, 201):
        run = r3.json()
        rid = run.get("id")
        print(f"  Run: {rid} status={run.get('status')}")
        
        for i in range(15):
            time.sleep(3)
            r4 = requests.get(f"{BASE_URL}/threads/{tid}/runs/{rid}", headers=h)
            rd = r4.json()
            s = rd.get("status")
            print(f"    Poll {i}: {s}")
            if s == "completed":
                r5 = requests.get(f"{BASE_URL}/threads/{tid}/messages", headers=h)
                for m in r5.json().get("data", []):
                    if m.get("role") == "assistant":
                        for c in m.get("content", []):
                            if c.get("type") == "text":
                                print(f"  ANSWER: {c['text']['value'][:500]}")
                break
            elif s == "failed":
                print(f"    Error: {rd.get('last_error')}")
                break
    else:
        print(f"  Error: {r3.text[:300]}")
else:
    print(f"  Error: {r.text[:300]}")


# Test 2: Try with /chat/completions instead (maybe it's not an Assistants API)
print(f"\n{'='*60}")
print("Test 2: Chat Completions endpoint")
print(f"{'='*60}")

r = requests.post(f"{BASE_URL}/chat/completions", headers=h, json={
    "messages": [{"role": "user", "content": "How many clients are there?"}],
    "model": AGENT_ID,
})
print(f"Chat completions: {r.status_code}")
if r.status_code == 200:
    print(f"  Response: {json.dumps(r.json(), indent=2)[:500]}")
else:
    print(f"  Error: {r.text[:300]}")

# Test 3: Try /v1 in the URL (double v1?)
print(f"\n{'='*60}")
print("Test 3: Base URL without /openai suffix")
print(f"{'='*60}")

base2 = f"https://api.fabric.microsoft.com/v1/workspaces/{WORKSPACE_ID}/dataagents/{AGENT_ID}/aiassistant"
r = requests.post(f"{base2}/openai/threads", headers=h, json={})
print(f"Threads (explicit /openai/): {r.status_code}")
if r.status_code in (200, 201):
    print(f"  Thread: {r.json().get('id')}")

# Try v2024-07-01 as URL segment instead of query param
r = requests.post(f"{BASE_URL}/threads?api-version=2024-02-15-preview", headers=h, json={})
print(f"\nThreads (2024-02-15-preview): {r.status_code}")
if r.status_code in (200, 201):
    tid = r.json().get("id")
    r3 = requests.post(f"{BASE_URL}/threads/{tid}/runs?api-version=2024-02-15-preview", 
                       headers=h, json={"assistant_id": AGENT_ID})
    print(f"Run (2024-02-15-preview): {r3.status_code}")
    if r3.status_code in (200, 201):
        run = r3.json()
        rid = run.get("id")
        for i in range(10):
            time.sleep(3)
            r4 = requests.get(f"{BASE_URL}/threads/{tid}/runs/{rid}?api-version=2024-02-15-preview", headers=h)
            rd = r4.json()
            s = rd.get("status")
            print(f"    Poll {i}: {s}")
            if s == "completed":
                r5 = requests.get(f"{BASE_URL}/threads/{tid}/messages?api-version=2024-02-15-preview", headers=h)
                for m in r5.json().get("data", []):
                    if m.get("role") == "assistant":
                        for c in m.get("content", []):
                            if c.get("type") == "text":
                                print(f"  ANSWER: {c['text']['value'][:500]}")
                break
            elif s in ("failed", "cancelled"):
                print(f"    Error: {rd.get('last_error')}")
                break

# Test 4: Check if there's a /completions endpoint
print(f"\n{'='*60}")
print("Test 4: Various endpoint patterns")
print(f"{'='*60}")

endpoints = [
    f"{BASE_URL}/deployments/{AGENT_ID}/chat/completions",
    f"{BASE_URL}/chat/completions?api-version=2024-07-01-preview",
    f"{BASE_URL}/completions?api-version=2024-07-01-preview",
]
for ep in endpoints:
    short = ep.replace(f"https://api.fabric.microsoft.com/v1/workspaces/{WORKSPACE_ID}/dataagents/{AGENT_ID}/aiassistant/openai", "...")
    r = requests.post(ep, headers=h, json={
        "messages": [{"role": "user", "content": "hello"}],
    })
    print(f"  {short}: {r.status_code}")
    if r.status_code in (200, 201):
        print(f"  Response: {r.text[:300]}")
    elif r.status_code != 404:
        print(f"  Error: {r.text[:200]}")
