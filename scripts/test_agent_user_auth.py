"""
Test Fabric Data Agent with user-delegated auth (device code flow).
This confirms whether user auth works vs SPN auth.
"""
import os, sys, json, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from openai import OpenAI
from azure.identity import DeviceCodeCredential

TENANT_ID = os.getenv("FABRIC_TENANT_ID")  # Contoso tenant
URL = os.getenv("FABRIC_DATA_AGENT_URL")
AGENT_ID = os.getenv("FABRIC_DATA_AGENT_ID")

# Use the well-known Azure CLI public client ID
# This works for device code flow in any tenant
AZURE_CLI_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"

print("Getting user token via device code flow...")
print(f"Tenant: {TENANT_ID}")

cred = DeviceCodeCredential(
    tenant_id=TENANT_ID,
    client_id=AZURE_CLI_CLIENT_ID,
)

token = cred.get_token("https://api.fabric.microsoft.com/.default").token
print(f"Got token: {token[:20]}...")

client = OpenAI(
    base_url=URL,
    api_key=token,
    default_headers={"Content-Type": "application/json"},
    default_query={"api-version": "2024-07-01-preview"},
)

print("\nCreating thread...")
thread = client.beta.threads.create()
print(f"  Thread: {thread.id}")

print("Adding message...")
msg = client.beta.threads.messages.create(
    thread_id=thread.id, role="user",
    content="How many clients are in the database? List their names."
)
print(f"  Message: {msg.id}")

print("Creating run...")
run = client.beta.threads.runs.create(
    thread_id=thread.id, assistant_id=AGENT_ID,
)
print(f"  Run: {run.id} status={run.status}")

for i in range(30):
    time.sleep(3)
    run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
    print(f"  Poll {i}: {run.status}")
    if run.status == "completed":
        msgs = client.beta.threads.messages.list(thread_id=thread.id)
        for m in msgs.data:
            if m.role == "assistant":
                for c in m.content:
                    if hasattr(c, "text"):
                        print(f"\n  ANSWER: {c.text.value}")
        print("\n  SUCCESS! User-delegated auth works.")
        break
    elif run.status in ("failed", "cancelled", "expired"):
        print(f"  Error: {run.last_error}")
        break
