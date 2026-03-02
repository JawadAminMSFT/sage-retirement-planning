"""Try various element formats for the datasource and update draft only."""
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
BASE = "https://api.fabric.microsoft.com/v1"

TABLES = ["clients", "accounts", "holdings", "transactions", "investment_products"]

def get_token():
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    return cred.get_token("https://api.fabric.microsoft.com/.default").token

def headers():
    return {"Authorization": f"Bearer {get_token()}", "Content-Type": "application/json"}

def to_b64(obj):
    return base64.b64encode(json.dumps(obj, indent=2).encode("utf-8")).decode("ascii")

def poll(loc, h, max_polls=15, interval=3):
    for i in range(max_polls):
        time.sleep(interval)
        pr = requests.get(loc, headers=h)
        if pr.status_code == 200:
            data = pr.json() if pr.text else {}
            s = data.get("status", "")
            print(f"    Poll {i}: {s}")
            if s in ("Succeeded", "succeeded"):
                return True
            if s in ("Failed", "failed"):
                err = data.get("error", {})
                print(f"    Error: {err}")
                return False
    return False

def try_update(label, parts):
    h = headers()
    payload = {"definition": {"parts": parts}}
    print(f"\n--- {label} ---")
    r = requests.post(
        f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/updateDefinition",
        headers=h, json=payload
    )
    print(f"  Status: {r.status_code}")
    if r.status_code == 202:
        loc = r.headers.get("Location")
        return poll(loc, h)
    elif r.status_code == 200:
        return True
    else:
        print(f"  Err: {r.text[:300]}")
        return False


# Attempt 1: Draft datasource only with elements as name+type
elements_v1 = [{"name": t, "type": "table"} for t in TABLES]
ds_v1 = {
    "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/dataAgent/definition/dataSource/1.0.0/schema.json",
    "artifactId": LAKEHOUSE_ID,
    "workspaceId": WORKSPACE_ID,
    "dataSourceInstructions": None,
    "displayName": "sage_retirement_data",
    "type": "lakehouse_tables",
    "userDescription": None,
    "metadata": {},
    "elements": elements_v1
}
try_update("Attempt 1: draft datasource with elements [{name, type}]", [
    {"path": "Files/Config/draft/lakehouse-tables-sage_retirement_data/datasource.json",
     "payload": to_b64(ds_v1), "payloadType": "InlineBase64"}
])

# Attempt 2: Elements as just strings
ds_v2 = dict(ds_v1)
ds_v2["elements"] = TABLES
try_update("Attempt 2: draft datasource elements as strings", [
    {"path": "Files/Config/draft/lakehouse-tables-sage_retirement_data/datasource.json",
     "payload": to_b64(ds_v2), "payloadType": "InlineBase64"}
])

# Attempt 3: Elements as dicts with schema, schemaName, tableName
elements_v3 = [{"schemaName": "dbo", "tableName": t} for t in TABLES]
ds_v3 = dict(ds_v1)
ds_v3["elements"] = elements_v3
try_update("Attempt 3: draft datasource elements [{schemaName, tableName}]", [
    {"path": "Files/Config/draft/lakehouse-tables-sage_retirement_data/datasource.json",
     "payload": to_b64(ds_v3), "payloadType": "InlineBase64"}
])

# Attempt 4: Elements with schema + name + description
elements_v4 = [{"schema": "dbo", "name": t, "description": ""} for t in TABLES]
ds_v4 = dict(ds_v1)
ds_v4["elements"] = elements_v4
try_update("Attempt 4: draft datasource elements [{schema, name, description}]", [
    {"path": "Files/Config/draft/lakehouse-tables-sage_retirement_data/datasource.json",
     "payload": to_b64(ds_v4), "payloadType": "InlineBase64"}
])

# Attempt 5: Try updating draft + published datasource separately (not stage_config)
print("\n--- Attempt 5: draft datasource + published datasource ---")
h = headers()
# Use the format from attempt 1 for both
parts = [
    {"path": "Files/Config/draft/lakehouse-tables-sage_retirement_data/datasource.json",
     "payload": to_b64(ds_v1), "payloadType": "InlineBase64"},
    {"path": "Files/Config/published/lakehouse-tables-sage_retirement_data/datasource.json",
     "payload": to_b64(ds_v1), "payloadType": "InlineBase64"},
]
r = requests.post(
    f"{BASE}/workspaces/{WORKSPACE_ID}/items/{AGENT_ID}/updateDefinition",
    headers=h, json={"definition": {"parts": parts}}
)
print(f"  Status: {r.status_code}")
if r.status_code == 202:
    loc = r.headers.get("Location")
    poll(loc, h)
elif r.status_code != 200:
    print(f"  Err: {r.text[:300]}")
