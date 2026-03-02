"""
Test the Fabric Data Agent using the EXACT pattern from the official
Microsoft fabric_data_agent_client SDK.

Key differences from our previous attempts:
1. Thread creation via Fabric-specific /__private/aiassistant/threads/fabric endpoint
2. Assistant creation via client.beta.assistants.create(model="not used")
3. API version 2024-05-01-preview
4. Extra headers (ActivityId, Accept, Content-Type)
5. Uses InteractiveBrowserCredential (user auth, not SPN)
"""

import os
import sys
import time
import uuid
import json
import requests
import warnings

# Suppress OpenAI deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, message=r".*Assistants API is deprecated.*")

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from azure.identity import InteractiveBrowserCredential
from openai import OpenAI

TENANT_ID = os.getenv("FABRIC_TENANT_ID", "")
DATA_AGENT_URL = os.getenv("FABRIC_DATA_AGENT_URL", "")

print(f"Tenant ID: {TENANT_ID}")
print(f"Data Agent URL: {DATA_AGENT_URL}")

# Step 1: Authenticate with InteractiveBrowserCredential (like official client)
print("\n--- Step 1: Authenticate ---")
credential = InteractiveBrowserCredential(tenant_id=TENANT_ID)
token = credential.get_token("https://api.fabric.microsoft.com/.default")
print(f"Token acquired, expires: {time.ctime(token.expires_on)}")

# Step 2: Create OpenAI client (exact same config as official client)
print("\n--- Step 2: Create OpenAI client ---")
client = OpenAI(
    api_key="",  # Not used - Bearer token instead
    base_url=DATA_AGENT_URL,
    default_query={"api-version": "2024-05-01-preview"},
    default_headers={
        "Authorization": f"Bearer {token.token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "ActivityId": str(uuid.uuid4())
    }
)
print("OpenAI client created")

# Step 3: Create thread using Fabric-specific endpoint (THE KEY DIFFERENCE)
print("\n--- Step 3: Create thread via Fabric endpoint ---")
thread_name = f'sage-test-{uuid.uuid4()}'

if "aiskills" in DATA_AGENT_URL:
    base_url = DATA_AGENT_URL.replace("aiskills", "dataagents").removesuffix("/openai").replace("/aiassistant", "/__private/aiassistant")
else:
    base_url = DATA_AGENT_URL.removesuffix("/openai").replace("/aiassistant", "/__private/aiassistant")

get_thread_url = f'{base_url}/threads/fabric?tag="{thread_name}"'
print(f"Thread URL: {get_thread_url}")

headers = {
    "Authorization": f"Bearer {token.token}",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "ActivityId": str(uuid.uuid4())
}

response = requests.get(get_thread_url, headers=headers)
print(f"Thread response status: {response.status_code}")
print(f"Thread response: {response.text[:500]}")
response.raise_for_status()
thread = response.json()
thread["name"] = thread_name
print(f"Thread ID: {thread.get('id')}")

# Step 4: Create assistant (exact same as official client)
print("\n--- Step 4: Create assistant ---")
assistant = client.beta.assistants.create(model="not used")
print(f"Assistant ID: {assistant.id}")

# Step 5: Create message
print("\n--- Step 5: Create message ---")
question = "How many clients are in the database?"
msg = client.beta.threads.messages.create(
    thread_id=thread['id'],
    role="user",
    content=question
)
print(f"Message created: {msg.id}")

# Step 6: Create run
print("\n--- Step 6: Create run ---")
run = client.beta.threads.runs.create(
    thread_id=thread['id'],
    assistant_id=assistant.id
)
print(f"Run ID: {run.id}, Status: {run.status}")

# Step 7: Poll for completion
print("\n--- Step 7: Poll run ---")
start_time = time.time()
timeout = 120
while run.status in ["queued", "in_progress"]:
    if time.time() - start_time > timeout:
        print(f"Timeout after {timeout}s")
        break
    print(f"  Status: {run.status}")
    time.sleep(2)
    run = client.beta.threads.runs.retrieve(
        thread_id=thread['id'],
        run_id=run.id
    )

print(f"Final status: {run.status}")

if run.status == "failed":
    print(f"Run failed!")
    if hasattr(run, 'last_error') and run.last_error:
        print(f"  Error code: {run.last_error.code}")
        print(f"  Error message: {run.last_error.message}")
    # Dump full run object
    print(f"\nFull run object:")
    print(json.dumps(run.model_dump(), indent=2, default=str))

elif run.status == "completed":
    # Get messages
    print("\n--- Step 8: Get response ---")
    messages = client.beta.threads.messages.list(
        thread_id=thread['id'],
        order="asc"
    )
    
    for msg in messages.data:
        if msg.role == "assistant":
            try:
                content = msg.content[0]
                if hasattr(content, 'text') and hasattr(content.text, 'value'):
                    print(f"ANSWER: {content.text.value}")
                else:
                    print(f"ANSWER (raw): {content}")
            except (IndexError, AttributeError):
                print(f"ANSWER (fallback): {msg.content}")

# Clean up
try:
    client.beta.threads.delete(thread_id=thread['id'])
    print("\nThread cleaned up.")
except Exception as e:
    print(f"Cleanup: {e}")
