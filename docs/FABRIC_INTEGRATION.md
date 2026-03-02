# Fabric Data Agent Integration

## Overview

The Sage Retirement Planning app can optionally query a **Microsoft Fabric Data Agent** for client and portfolio data instead of using local/in-memory data. This is available only under the **client persona** in **Live mode**.

## Architecture

```
Frontend (Next.js)
  └─ Mode selector: Mock | Live(Local) | Live(Fabric)
       └─ sends data_source: "local" | "fabric" with API requests

Backend (FastAPI)
  ├─ /chat/stream        → branches on data_source
  ├─ /api/project-scenario → branches on data_source
  ├─ /api/fabric/health   → SPN token check
  └─ /api/fabric/query    → direct NL query to Fabric

Fabric Data Agent (OpenAI Assistants API)
  └─ Published URL → queries Lakehouse tables via SQL
       └─ Lakehouse: sage-retirement-data
            ├─ clients
            ├─ accounts
            ├─ holdings
            ├─ transactions
            └─ investment_products
```

## Setup Guide

### 1. Create Service Principal

In the **Fabric tenant** (Contoso / `3acec0fd-ecb3-4e12-8f69-6fa150cca992`):

1. Azure Portal → **App registrations** → **New registration**
   - Name: `sage-fabric-connector`
   - Supported account types: Single tenant
2. **Certificates & secrets** → **New client secret** → copy the value
3. Note the **Application (client) ID**
4. In the Fabric workspace (`jawad-demo-01`) → **Manage access** → add the SPN as **Contributor**

### 2. Set Environment Variables

In `backend/.env`:

```env
FABRIC_TENANT_ID=3acec0fd-ecb3-4e12-8f69-6fa150cca992
FABRIC_CLIENT_ID=<application-client-id>
FABRIC_CLIENT_SECRET=<client-secret-value>
FABRIC_DATA_AGENT_URL=<published-data-agent-url>
FABRIC_DATA_AGENT_ID=<published-assistant-id>
```

### 3. Generate Seed Data

```bash
python scripts/generate_fabric_seed_data.py
```

Creates CSVs in `scripts/seed_data/`:
- `clients.csv` (7 rows)
- `accounts.csv` (21 rows)
- `holdings.csv` (111 rows)
- `transactions.csv` (84 rows)
- `investment_products.csv` (18 rows)

### 4. Set Up Fabric Workspace

```bash
python scripts/fabric_setup.py
```

This will:
1. Find the `jawad-demo-01` workspace
2. Create a `sage-retirement-data` Lakehouse
3. Upload seed CSVs to OneLake
4. Print guidance for creating the Data Agent via Fabric Notebook

### 5. Create & Publish Data Agent

Follow the notebook code printed by `fabric_setup.py` to create and publish the Data Agent within Fabric. After publishing, update the `.env` with the published URL and agent ID.

### 6. Test

```bash
# Run all integration tests
python scripts/test_fabric_integration.py

# Test specific functionality
python scripts/test_fabric_integration.py --test health
python scripts/test_fabric_integration.py --test query
python scripts/test_fabric_integration.py --test chat
python scripts/test_fabric_integration.py --test scenario
```

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `backend/fabric_service.py` | Fabric Data Agent client (OpenAI Assistants API + SPN auth) |
| `scripts/generate_fabric_seed_data.py` | Generate CSV seed data from user_profiles.json |
| `scripts/fabric_setup.py` | Automate Fabric workspace/lakehouse/upload setup |
| `scripts/test_fabric_integration.py` | End-to-end integration tests |
| `scripts/seed_data/*.csv` | Generated seed data for Fabric Lakehouse |

### Modified Files
| File | Changes |
|------|---------|
| `backend/models.py` | Added `DataSourceMode` enum |
| `backend/main.py` | Added Fabric import, `/api/fabric/*` endpoints, `data_source` param on chat/scenario |
| `backend/pyproject.toml` | Added `openai>=1.30.0` dependency |
| `backend/.env` | Added `FABRIC_*` environment variables |
| `lib/types.ts` | Added `DataSourceMode` type |
| `lib/api.ts` | Added `DataSourceMode`, `setDataSourceMode()`, `checkFabricHealth()`, `queryFabricDirect()`, wired `data_source` into requests |
| `components/frontend/ProfileBubble.tsx` | Added Data Source selector (Local/Fabric buttons) in Live mode |
| `app/page.tsx` | Added `dataSourceMode` state, `fabricAvailable` check, Data Source selector in header dropdown |

## Design Decisions

1. **SPN auth isolated from az cli** — The Fabric tenant (`3acec0fd-...`) uses `ClientSecretCredential` which doesn't interfere with the app's `AzureCliCredential` for the demo tenant (`16b3c013-...`).

2. **Fabric branch in existing endpoints** — Rather than creating separate `/fabric/chat/stream` endpoints, the existing `/chat/stream` and `/api/project-scenario` endpoints accept an optional `data_source` parameter. This keeps the frontend simple.

3. **Graceful degradation** — If Fabric env vars aren't set, the backend starts normally with `FABRIC_AVAILABLE=False`. The frontend checks `/api/fabric/health` on load and disables the Fabric button if unavailable.

4. **Mock mode untouched** — The Data Source selector only appears when in Live mode on the client persona. Mock mode is completely unaffected.

5. **Advisor persona untouched** — No changes to advisor chat, advisor dashboard, or advisor-related endpoints.
