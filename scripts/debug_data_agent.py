"""Debug the Fabric Data Agent query step by step."""
import os, sys, json, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from openai import OpenAI
from azure.identity import ClientSecretCredential

tenant = os.getenv("FABRIC_TENANT_ID")
cid = os.getenv("FABRIC_CLIENT_ID")
secret = os.getenv("FABRIC_CLIENT_SECRET")
url = os.getenv("FABRIC_DATA_AGENT_URL")
agent_id = os.getenv("FABRIC_DATA_AGENT_ID")

print(f"URL: {url}")
print(f"Agent ID: {agent_id}")

cred = ClientSecretCredential(tenant, cid, secret)
token = cred.get_token("https://api.fabric.microsoft.com/.default").token
print(f"Token: {token[:20]}...")

client = OpenAI(
    base_url=url,
    api_key=token,
    default_headers={"Content-Type": "application/json"},
    default_query={"api-version": "2024-07-01-preview"},
)

# List available assistants first
print("\n--- Listing assistants ---")
try:
    assistants = client.beta.assistants.list()
    for a in assistants.data:
        print(f"  Assistant: id={a.id} name={a.name}")
    if not assistants.data:
        print("  (no assistants found)")
except Exception as e:
    print(f"  Error: {e}")

# Try creating thread & run
print("\n--- Creating thread ---")
thread = client.beta.threads.create()
print(f"Thread: {thread.id}")

print("\n--- Adding message ---")
msg = client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="List all clients"
)
print(f"Message: {msg.id}")

print(f"\n--- Creating run (assistant_id={agent_id}) ---")
try:
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=agent_id,
    )
    print(f"Run: {run.id} status={run.status}")

    for i in range(30):
        time.sleep(3)
        run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
        print(f"  Poll {i}: status={run.status}")
        if run.status == "completed":
            msgs = client.beta.threads.messages.list(thread_id=thread.id)
            for m in msgs.data:
                if m.role == "assistant":
                    for c in m.content:
                        if hasattr(c, "text"):
                            print(f"\n  Answer: {c.text.value[:800]}")
                        else:
                            print(f"\n  Content: {c}")
            break
        elif run.status == "failed":
            print(f"  Last error: {run.last_error}")
            # Dump full run object
            print(f"  Full run: {json.dumps(run.model_dump(), indent=2, default=str)[:1000]}")
            break
        elif run.status in ("cancelled", "expired"):
            print(f"  Run ended: {run.status}")
            break
except Exception as e:
    print(f"Run error: {e}")
