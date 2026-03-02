"""Check SQL endpoint and try a direct query."""
import os, sys, json, requests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from azure.identity import ClientSecretCredential

cred = ClientSecretCredential(
    os.getenv("FABRIC_TENANT_ID"),
    os.getenv("FABRIC_CLIENT_ID"),
    os.getenv("FABRIC_CLIENT_SECRET"),
)
token = cred.get_token("https://api.fabric.microsoft.com/.default").token
h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
ws = "004abea8-0d5e-48d6-bf58-f6f23e41690c"

# List SQL endpoints
r = requests.get(f"https://api.fabric.microsoft.com/v1/workspaces/{ws}/items?type=SQLEndpoint", headers=h)
print(f"SQL Endpoints: {r.status_code}")
for item in r.json().get("value", []):
    print(f"  {item['displayName']}: {item['id']}")

# List all items to see what types exist
r2 = requests.get(f"https://api.fabric.microsoft.com/v1/workspaces/{ws}/items", headers=h)
print(f"\nAll items: {r2.status_code}")
for item in r2.json().get("value", []):
    print(f"  {item['type']:25s} {item['id']}  {item['displayName']}")
