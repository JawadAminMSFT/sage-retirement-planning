"""Test Data Agent with different token scopes."""
import os, sys, json, time
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

SCOPES = [
    "https://api.fabric.microsoft.com/.default",
    "https://analysis.windows.net/powerbi/api/.default",
]

for scope in SCOPES:
    print(f"\n{'='*60}")
    print(f"Scope: {scope}")
    print(f"{'='*60}")
    
    try:
        token = cred.get_token(scope).token
    except Exception as e:
        print(f"  Token error: {e}")
        continue

    client = OpenAI(
        base_url=URL,
        api_key=token,
        default_headers={"Content-Type": "application/json"},
        default_query={"api-version": "2024-07-01-preview"},
    )
    
    try:
        thread = client.beta.threads.create()
        print(f"  Thread: {thread.id}")
        
        msg = client.beta.threads.messages.create(
            thread_id=thread.id, role="user",
            content="How many clients are there?"
        )
        print(f"  Message: {msg.id}")
        
        run = client.beta.threads.runs.create(
            thread_id=thread.id, assistant_id=AGENT_ID,
        )
        print(f"  Run: {run.id} status={run.status}")
        
        for i in range(15):
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
                break
            elif run.status in ("failed", "cancelled", "expired"):
                print(f"    Error: {run.last_error}")
                break
    except Exception as e:
        print(f"  Exception: {e}")

# Also try with Azure CLI credential (user identity)
print(f"\n{'='*60}")
print("Azure CLI Credential (user identity)")
print(f"{'='*60}")

try:
    from azure.identity import AzureCliCredential
    az_cred = AzureCliCredential(tenant_id=TENANT_ID)
    token = az_cred.get_token("https://api.fabric.microsoft.com/.default").token
    print(f"  Got user token: {token[:20]}...")
    
    client = OpenAI(
        base_url=URL,
        api_key=token,
        default_headers={"Content-Type": "application/json"},
        default_query={"api-version": "2024-07-01-preview"},
    )
    
    thread = client.beta.threads.create()
    print(f"  Thread: {thread.id}")
    
    msg = client.beta.threads.messages.create(
        thread_id=thread.id, role="user",
        content="How many clients are there?"
    )
    
    run = client.beta.threads.runs.create(
        thread_id=thread.id, assistant_id=AGENT_ID,
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
            break
        elif run.status in ("failed", "cancelled", "expired"):
            print(f"    Error: {run.last_error}")
            break
except Exception as e:
    print(f"  Error: {e}")
