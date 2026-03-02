"""Test Fabric Data Agent with various api-versions and fresh threads."""
import os, sys, json, time, requests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from openai import OpenAI
from azure.identity import ClientSecretCredential

TENANT_ID = os.getenv("FABRIC_TENANT_ID")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET")
URL = os.getenv("FABRIC_DATA_AGENT_URL")
AGENT_ID = os.getenv("FABRIC_DATA_AGENT_ID")

cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
token = cred.get_token("https://api.fabric.microsoft.com/.default").token

# Try multiple api-versions
API_VERSIONS = [
    "2024-07-01-preview",
    "2024-05-01-preview",
    "2024-02-15-preview",
    "2025-01-01-preview",
    "2024-12-01-preview",
]

for ver in API_VERSIONS:
    print(f"\n{'='*60}")
    print(f"Trying api-version: {ver}")
    print(f"{'='*60}")
    
    client = OpenAI(
        base_url=URL,
        api_key=token,
        default_headers={"Content-Type": "application/json"},
        default_query={"api-version": ver},
    )
    
    try:
        # Create thread
        thread = client.beta.threads.create()
        print(f"  Thread: {thread.id}")
        
        # Add message
        msg = client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content="How many clients are in the database?"
        )
        print(f"  Message: {msg.id}")
        
        # Create run
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=AGENT_ID,
        )
        print(f"  Run: {run.id} status={run.status}")
        
        for i in range(20):
            time.sleep(3)
            run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
            print(f"    Poll {i}: {run.status}")
            if run.status == "completed":
                msgs = client.beta.threads.messages.list(thread_id=thread.id)
                for m in msgs.data:
                    if m.role == "assistant":
                        for c in m.content:
                            if hasattr(c, "text"):
                                print(f"\n  ANSWER: {c.text.value[:500]}")
                print(f"\n  SUCCESS with api-version={ver}")
                break
            elif run.status == "failed":
                print(f"    Error: {run.last_error}")
                break
            elif run.status in ("cancelled", "expired"):
                print(f"    Ended: {run.status}")
                break
    except Exception as e:
        print(f"  Exception: {e}")

# Also try raw REST call without OpenAI SDK
print(f"\n{'='*60}")
print("Direct REST API call (no SDK)")
print(f"{'='*60}")

h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Create thread
r = requests.post(f"{URL}/threads?api-version=2024-07-01-preview", headers=h, json={})
print(f"  Create thread: {r.status_code}")
if r.status_code in (200, 201):
    thread_data = r.json()
    tid = thread_data.get("id")
    print(f"  Thread ID: {tid}")
    
    # Add message
    r2 = requests.post(
        f"{URL}/threads/{tid}/messages?api-version=2024-07-01-preview",
        headers=h,
        json={"role": "user", "content": "How many clients are there?"}
    )
    print(f"  Add message: {r2.status_code}")
    
    # Create run
    r3 = requests.post(
        f"{URL}/threads/{tid}/runs?api-version=2024-07-01-preview",
        headers=h,
        json={"assistant_id": AGENT_ID}
    )
    print(f"  Create run: {r3.status_code}")
    if r3.status_code in (200, 201):
        run_data = r3.json()
        rid = run_data.get("id")
        print(f"  Run ID: {rid}, Status: {run_data.get('status')}")
        
        for i in range(20):
            time.sleep(3)
            r4 = requests.get(
                f"{URL}/threads/{tid}/runs/{rid}?api-version=2024-07-01-preview",
                headers=h
            )
            if r4.status_code == 200:
                rd = r4.json()
                print(f"    Poll {i}: {rd.get('status')}")
                if rd.get("status") == "completed":
                    r5 = requests.get(
                        f"{URL}/threads/{tid}/messages?api-version=2024-07-01-preview",
                        headers=h
                    )
                    if r5.status_code == 200:
                        for m in r5.json().get("data", []):
                            if m.get("role") == "assistant":
                                for c in m.get("content", []):
                                    if c.get("type") == "text":
                                        print(f"\n  ANSWER: {c['text']['value'][:500]}")
                    break
                elif rd.get("status") == "failed":
                    print(f"    Error: {rd.get('last_error')}")
                    print(f"    Full: {json.dumps(rd, indent=2, default=str)[:500]}")
                    break
    else:
        print(f"  Run error: {r3.text[:300]}")
else:
    print(f"  Thread error: {r.text[:300]}")
