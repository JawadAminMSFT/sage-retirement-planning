"""Check the current Data Agent definition."""
import os, sys, json, requests, base64, time
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
agent = "7311726d-f193-4fd4-9e72-116c1e5568d3"
BASE = "https://api.fabric.microsoft.com/v1"

r = requests.post(f"{BASE}/workspaces/{ws}/items/{agent}/getDefinition", headers=h)
print(f"getDefinition: {r.status_code}")
if r.status_code == 202:
    loc = r.headers.get("Location")
    retry = int(r.headers.get("Retry-After", "5"))
    time.sleep(retry)
    pr = requests.get(loc, headers=h)
    if pr.status_code == 200 and pr.json().get("status") == "Succeeded":
        rr = requests.get(loc + "/result", headers=h)
        if rr.status_code == 200:
            for part in rr.json().get("definition", {}).get("parts", []):
                decoded = base64.b64decode(part["payload"]).decode("utf-8")
                print(f"\n=== {part['path']} ===")
                try:
                    print(json.dumps(json.loads(decoded), indent=2))
                except Exception:
                    print(decoded[:500])
elif r.status_code == 200:
    for part in r.json().get("definition", {}).get("parts", []):
        decoded = base64.b64decode(part["payload"]).decode("utf-8")
        print(f"\n=== {part['path']} ===")
        try:
            print(json.dumps(json.loads(decoded), indent=2))
        except Exception:
            print(decoded[:500])
