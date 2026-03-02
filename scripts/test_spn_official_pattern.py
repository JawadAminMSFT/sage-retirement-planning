"""
Test if SPN auth works with the correct Fabric-specific thread creation pattern.
"""

import os
import sys
import time
import uuid
import json
import requests
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, message=r".*Assistants API is deprecated.*")

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from azure.identity import ClientSecretCredential
from openai import OpenAI

TENANT_ID = os.getenv("FABRIC_TENANT_ID", "")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET", "")
DATA_AGENT_URL = os.getenv("FABRIC_DATA_AGENT_URL", "")

print(f"Tenant ID: {TENANT_ID}")
print(f"Client ID: {CLIENT_ID}")
print(f"Data Agent URL: {DATA_AGENT_URL}")

# Step 1: Authenticate with SPN
print("\n--- Step 1: SPN Auth ---")
credential = ClientSecretCredential(
    tenant_id=TENANT_ID,
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET
)
token = credential.get_token("https://api.fabric.microsoft.com/.default")
print(f"SPN token acquired, expires: {time.ctime(token.expires_on)}")

# Step 2: Create OpenAI client
print("\n--- Step 2: Create OpenAI client ---")
client = OpenAI(
    api_key="",
    base_url=DATA_AGENT_URL,
    default_query={"api-version": "2024-05-01-preview"},
    default_headers={
        "Authorization": f"Bearer {token.token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "ActivityId": str(uuid.uuid4())
    }
)

# Step 3: Create thread via Fabric endpoint
print("\n--- Step 3: Create thread via Fabric endpoint ---")
thread_name = f'sage-spn-test-{uuid.uuid4()}'

base_url = DATA_AGENT_URL.removesuffix("/openai").replace("/aiassistant", "/__private/aiassistant")
get_thread_url = f'{base_url}/threads/fabric?tag="{thread_name}"'

headers = {
    "Authorization": f"Bearer {token.token}",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "ActivityId": str(uuid.uuid4())
}

response = requests.get(get_thread_url, headers=headers)
print(f"Thread response status: {response.status_code}")
if response.status_code != 200:
    print(f"Thread response body: {response.text[:500]}")
    sys.exit(1)

thread = response.json()
thread["name"] = thread_name
print(f"Thread ID: {thread.get('id')}")

# Step 4: Create assistant
print("\n--- Step 4: Create assistant ---")
try:
    assistant = client.beta.assistants.create(model="not used")
    print(f"Assistant ID: {assistant.id}")
except Exception as e:
    print(f"Assistant creation failed: {e}")
    sys.exit(1)

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

# Step 7: Poll
print("\n--- Step 7: Poll ---")
start_time = time.time()
while run.status in ["queued", "in_progress"]:
    if time.time() - start_time > 120:
        print("Timeout")
        break
    print(f"  Status: {run.status}")
    time.sleep(2)
    run = client.beta.threads.runs.retrieve(thread_id=thread['id'], run_id=run.id)

print(f"Final status: {run.status}")

if run.status == "failed":
    print(f"FAILED - SPN auth does NOT work with Data Agent")
    if hasattr(run, 'last_error') and run.last_error:
        print(f"  Error: {run.last_error.code}: {run.last_error.message}")
elif run.status == "completed":
    print("SUCCESS - SPN auth WORKS with Data Agent!")
    messages = client.beta.threads.messages.list(thread_id=thread['id'], order="asc")
    for msg in messages.data:
        if msg.role == "assistant":
            try:
                print(f"ANSWER: {msg.content[0].text.value}")
            except:
                print(f"ANSWER: {msg.content}")

try:
    client.beta.threads.delete(thread_id=thread['id'])
except:
    pass
