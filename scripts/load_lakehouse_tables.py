"""
Load CSV files from OneLake Files/ into Delta tables in the lakehouse.
The Fabric Data Agent requires Delta tables to query.
"""
import os, sys, json, requests, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from azure.identity import ClientSecretCredential

TENANT_ID = os.getenv("FABRIC_TENANT_ID")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET")
WORKSPACE_ID = "004abea8-0d5e-48d6-bf58-f6f23e41690c"
LAKEHOUSE_ID = "e489f4bb-6032-47ca-82a9-ecb586dff277"

BASE = "https://api.fabric.microsoft.com/v1"

CSV_FILES = ["clients", "accounts", "holdings", "transactions", "investment_products"]

def get_token():
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    return cred.get_token("https://api.fabric.microsoft.com/.default").token

def headers():
    return {"Authorization": f"Bearer {get_token()}", "Content-Type": "application/json"}

def poll_operation(loc, h, max_polls=40, interval=5):
    for i in range(max_polls):
        time.sleep(interval)
        pr = requests.get(loc, headers=h)
        if pr.status_code == 200:
            data = pr.json() if pr.text else {}
            status = data.get("status", "")
            pct = data.get("percentComplete", "?")
            print(f"    Poll {i}: {status} ({pct}%)")
            if status in ("Succeeded", "succeeded", "Completed", "completed"):
                return data
            if status in ("Failed", "failed"):
                print(f"    FAILED: {json.dumps(data, indent=2)}")
                return None
        else:
            print(f"    Poll {i}: HTTP {pr.status_code}")
    print("    Timed out.")
    return None

def load_table(table_name):
    """Load a CSV from Files/seed_data/ into a Delta table."""
    h = headers()
    
    # Use the Table Load API
    payload = {
        "relativePath": f"Files/{table_name}.csv",
        "pathType": "File",
        "mode": "Overwrite",
        "formatOptions": {
            "format": "Csv",
            "header": True,
            "delimiter": ","
        }
    }
    
    url = f"{BASE}/workspaces/{WORKSPACE_ID}/lakehouses/{LAKEHOUSE_ID}/tables/{table_name}/load"
    print(f"  Loading {table_name}...")
    r = requests.post(url, headers=h, json=payload)
    print(f"    Status: {r.status_code}")
    
    if r.status_code == 202:
        loc = r.headers.get("Location") or r.headers.get("Operation-Location")
        if loc:
            result = poll_operation(loc, h)
            if result and result.get("status") in ("Succeeded", "succeeded"):
                print(f"    ✓ {table_name} loaded as Delta table")
                return True
            else:
                print(f"    ✗ {table_name} failed")
                return False
        else:
            print(f"    Accepted (no poll URL)")
            return True
    elif r.status_code == 200:
        print(f"    ✓ {table_name} loaded")
        return True
    else:
        print(f"    Error: {r.text[:300]}")
        return False

def verify_tables():
    """List all tables in the lakehouse."""
    h = headers()
    r = requests.get(f"{BASE}/workspaces/{WORKSPACE_ID}/lakehouses/{LAKEHOUSE_ID}/tables", headers=h)
    if r.status_code == 200:
        tables = r.json().get("data", [])
        print(f"\nLakehouse tables ({len(tables)}):")
        for t in tables:
            print(f"  {t.get('name', t)}: {t.get('format', '?')} - {t.get('location', '?')}")
        return tables
    else:
        print(f"Error listing tables: {r.status_code} {r.text[:200]}")
        return []

def main():
    print("=" * 60)
    print("Load CSVs into Delta Tables")
    print("=" * 60)
    
    success = 0
    for name in CSV_FILES:
        if load_table(name):
            success += 1
    
    print(f"\n{success}/{len(CSV_FILES)} tables loaded")
    verify_tables()

if __name__ == "__main__":
    main()
