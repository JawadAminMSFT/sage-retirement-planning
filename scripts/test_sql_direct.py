"""Test direct SQL query against the lakehouse SQL analytics endpoint."""
import os, sys, json, requests, struct
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
from azure.identity import ClientSecretCredential

TENANT_ID = os.getenv("FABRIC_TENANT_ID")
CLIENT_ID = os.getenv("FABRIC_CLIENT_ID")
CLIENT_SECRET = os.getenv("FABRIC_CLIENT_SECRET")
WORKSPACE_ID = "004abea8-0d5e-48d6-bf58-f6f23e41690c"
SQL_EP_ID = "e9b03130-caad-44cf-9590-b1b184120093"
LAKEHOUSE_ID = "e489f4bb-6032-47ca-82a9-ecb586dff277"

BASE = "https://api.fabric.microsoft.com/v1"

cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)

def test_sql_queries():
    """Test various SQL query endpoints."""
    
    # Try different token scopes
    scopes = [
        "https://api.fabric.microsoft.com/.default",
        "https://analysis.windows.net/powerbi/api/.default",
        "https://database.windows.net/.default",
    ]
    
    for scope in scopes:
        print(f"\n{'='*60}")
        print(f"Scope: {scope}")
        print(f"{'='*60}")
        
        try:
            token = cred.get_token(scope).token
        except Exception as e:
            print(f"  Token error: {e}")
            continue
        
        h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Try Fabric REST API execute queries
        urls_to_try = [
            f"{BASE}/workspaces/{WORKSPACE_ID}/lakehouses/{LAKEHOUSE_ID}/queryExecutions",
            f"{BASE}/workspaces/{WORKSPACE_ID}/sqlEndpoints/{SQL_EP_ID}/executeQueries",
        ]
        
        for url in urls_to_try:
            endpoint_name = url.split("/")[-1]
            print(f"\n  --- {endpoint_name} ---")
            r = requests.post(url, headers=h, json={
                "queries": [{"query": "SELECT COUNT(*) as cnt FROM clients"}],
                "type": "SqlQuery"
            })
            print(f"    Status: {r.status_code}")
            if r.status_code in (200, 202):
                print(f"    Result: {json.dumps(r.json(), indent=2)[:500]}")
            else:
                print(f"    Error: {r.text[:300]}")

def test_tds_endpoint():
    """Try connecting via TDS (pyodbc/pymssql) to the SQL endpoint."""
    print(f"\n{'='*60}")
    print("TDS Connection Test (pymssql)")
    print(f"{'='*60}")
    
    try:
        import pymssql
        
        token = cred.get_token("https://database.windows.net/.default").token
        
        # The SQL analytics endpoint connection string
        # Format: <workspace-name>-<lakehouse-guid>.datawarehouse.fabric.microsoft.com
        # or: <sql-endpoint-guid>.datawarehouse.fabric.microsoft.com
        server = f"{SQL_EP_ID}.datawarehouse.fabric.microsoft.com"
        database = "sage_retirement_data"
        
        print(f"  Server: {server}")
        print(f"  Database: {database}")
        
        # pymssql with AAD token
        # Need to encode the token as bytes for TDS
        token_bytes = token.encode("utf-16-le")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
        
        conn = pymssql.connect(
            server=server,
            database=database,
            tds_version="7.4",
        )
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients")
        row = cursor.fetchone()
        print(f"  Result: {row}")
        conn.close()
    except ImportError:
        print("  pymssql not installed")
    except Exception as e:
        print(f"  Error: {e}")
    
    print(f"\n{'='*60}")
    print("TDS Connection Test (pyodbc)")
    print(f"{'='*60}")
    
    try:
        import pyodbc
        
        token = cred.get_token("https://database.windows.net/.default").token
        
        server = f"{SQL_EP_ID}.datawarehouse.fabric.microsoft.com"
        database = "sage_retirement_data"
        
        # Build the connection string with access token
        conn_str = (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={server},1433;"
            f"DATABASE={database};"
            f"Encrypt=yes;"
            f"TrustServerCertificate=no;"
        )
        
        # Encode token for pyodbc
        token_bytes = token.encode("utf-16-le")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
        
        print(f"  Server: {server}")
        print(f"  Database: {database}")
        
        conn = pyodbc.connect(conn_str, attrs_before={1256: token_struct})
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients")
        row = cursor.fetchone()
        print(f"  Result: {row}")
        conn.close()
    except ImportError:
        print("  pyodbc not installed, trying to install...")
    except Exception as e:
        print(f"  Error: {e}")

def test_lakehouse_query_api():
    """Try the newer lakehouse query API (2023 onward)."""
    print(f"\n{'='*60}")
    print("Lakehouse Query via executeQueries (various URL patterns)")
    print(f"{'='*60}")
    
    token = cred.get_token("https://api.fabric.microsoft.com/.default").token
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Try various URL patterns
    patterns = [
        f"{BASE}/workspaces/{WORKSPACE_ID}/lakehouses/{LAKEHOUSE_ID}/queries",
        f"{BASE}/workspaces/{WORKSPACE_ID}/items/{LAKEHOUSE_ID}/executeQueries",
        f"{BASE}/workspaces/{WORKSPACE_ID}/items/{SQL_EP_ID}/executeQueries",
        f"https://api.fabric.microsoft.com/v1/workspaces/{WORKSPACE_ID}/warehouses/{LAKEHOUSE_ID}/executeQueries",
    ]
    
    for url in patterns:
        short = url.replace("https://api.fabric.microsoft.com/v1/workspaces/", "").replace(WORKSPACE_ID, "WS").replace(LAKEHOUSE_ID, "LH").replace(SQL_EP_ID, "SQL")
        print(f"\n  --- {short} ---")
        r = requests.post(url, headers=h, json={
            "queries": [{"query": "SELECT COUNT(*) as cnt FROM clients"}],
            "type": "SqlQuery"
        })
        print(f"    Status: {r.status_code}")
        if r.status_code in (200, 202):
            print(f"    Result: {json.dumps(r.json(), indent=2)[:500]}")
        elif r.text:
            print(f"    Error: {r.text[:300]}")


if __name__ == "__main__":
    test_sql_queries()
    test_lakehouse_query_api()
    test_tds_endpoint()
