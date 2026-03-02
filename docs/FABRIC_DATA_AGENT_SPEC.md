# Fabric Data Agent Integration — Spec & Execution Plan

## 1. Executive Summary

Integrate a **Microsoft Fabric Data Agent** as an alternative data source for the **client persona** in Sage Retirement Planning. When a user initiates a **what-if analysis** (via chat or the scenario projection overlay) or types a **scenario in chat**, the system can optionally query the Fabric Data Agent (backed by a lakehouse with client + portfolio data) instead of using local/in-memory data.

**Scope guardrails:**
- **Client persona only** — Advisor persona is completely untouched
- **Mock mode untouched** — The Fabric option only appears under Live mode
- **Additive** — Existing "Live (Local)" mode continues to work unchanged

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                         │
│                                                             │
│  ProfileBubble dropdown:                                    │
│    Persona: [Client ▾]  Mode: [Mock | Live ▾]               │
│                                                             │
│    When Live selected, sub-dropdown:                        │
│      ● Live (Local) — existing behavior                     │
│      ● Live (Fabric) — queries Fabric Data Agent            │
│                                                             │
│  Chat / ScenarioProjectionOverlay                           │
│    → sends `data_source: "local" | "fabric"` with requests  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP (SSE)
┌───────────────────────▼─────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│                                                             │
│  /chat/stream & /api/project-scenario                       │
│    → if data_source == "fabric":                            │
│         1. Query Fabric Data Agent for client/portfolio     │
│         2. Inject response into AI agent context            │
│         3. Return analysis as usual                         │
│    → else: existing local flow                              │
│                                                             │
│  NEW: /api/fabric/health — connectivity check               │
│  NEW: /api/fabric/query — direct NL query passthrough       │
│                                                             │
│  fabric_service.py — Fabric Data Agent client               │
│    Uses OpenAI Assistants API against published URL          │
│    Auth: Service Principal (client_credentials) or          │
│          User-delegated token (az cli w/ Fabric tenant)     │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS (OpenAI Assistants API)
┌───────────────────────▼─────────────────────────────────────┐
│  Fabric Data Agent (Published URL)                          │
│                                                             │
│  Lakehouse: sage_retirement_lakehouse                       │
│    Tables:                                                  │
│      - client_profiles                                      │
│      - portfolio_holdings                                   │
│      - portfolio_accounts                                   │
│      - portfolio_transactions                               │
│      - investment_products                                  │
│                                                             │
│  Data Agent: sage-retirement-data-agent                     │
│    Instructions: domain-specific for retirement planning    │
│    Few-shot examples: retirement scenario queries           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Key Decisions (NEED YOUR INPUT)

### Decision 1: Authentication Strategy (Cross-Tenant)

Your Fabric capacity lives in a **different tenant** than the Sage app's Azure resources. Options:

| Option | Pros | Cons |
|--------|------|------|
| **A. Service Principal (recommended)** | Automated, no user interaction. Register a multi-tenant app in Sage tenant, consent in Fabric tenant, grant Fabric workspace access. Backend uses `client_id`/`client_secret` to get token for Fabric tenant. | Requires admin consent in Fabric tenant. SPN must have Contributor on Fabric workspace. |
| **B. User-delegated (az cli)** | Quick for local dev — `az login --tenant <fabric-tenant>`. No app registration needed. | Not automatable for CI/CD or cloud deployment. Requires manual login. |
| **C. Multi-tenant app + user auth passthrough** | User authenticates to both tenants via browser. | Complex frontend flow. Not needed for a demo app. |

**Recommendation:** Start with **Option B** for immediate development (you already use `az cli` for the existing agent), then add **Option A** for production/cloud. We can add a `FABRIC_AUTH_MODE=cli|spn` env var.

### Decision 2: Data Agent Setup Method

| Option | Pros | Cons |
|--------|------|------|
| **A. Fabric Notebook (SDK)** | Uses official `fabric-data-agent-sdk`. Can create lakehouse, upload data, create & configure agent, publish — all programmatic. | Must run inside Fabric runtime. Cannot run from local machine. |
| **B. Published URL + REST seeding** | Published URL for querying. Use Fabric REST APIs (or OneLake APIs) to upload data to lakehouse programmatically from local machine. Agent creation via Fabric portal (one-time). | Agent creation/config is manual (one-time), but data seeding is automated. |
| **C. Hybrid** | Provide a ready-to-run Fabric notebook for one-click setup, AND a local script for data seeding via OneLake/REST. | Most flexible but two artifacts to maintain. |

**Recommendation:** **Option C** — Provide a Fabric notebook (`scripts/fabric_setup.ipynb`) that creates the lakehouse + data agent + publishes it. Also provide a local Python script (`scripts/seed_fabric_data.py`) that can upload/refresh data via the Fabric REST/OneLake API. The one-time setup runs in Fabric, ongoing data refreshes can be local.

### Decision 3: What Fabric Tenant/Workspace Details Do I Need?

I need from you:
1. **Fabric Tenant ID** (the tenant where your Fabric capacity lives)
2. **Fabric Workspace ID** (or name — I can look it up)
3. **Fabric Capacity name/region** (to validate cross-geo constraints — Data Agent requires same region as lakehouse)
4. Whether you want to create a **new workspace** for this or use an existing one
5. Whether you (or a Fabric admin) can **grant Service Principal access** to the workspace

### Decision 4: UI/UX for Mode Switcher

Current UI: `ProfileBubble` has a toggle for Mock/Live.

**Proposed change** (Client persona only, Live mode only):

```
[ Mock Mode ] [ Live Mode ▾ ]
                  ├── Local (default — existing behavior)
                  └── Fabric (query Fabric Data Agent)
```

When "Fabric" is selected:
- A small "Fabric" badge appears next to the mode indicator
- Health check runs on selection; shows error if Fabric is unreachable
- All what-if / scenario / chat calls include `data_source: "fabric"`

**Advisor persona:** Completely unchanged. The sub-dropdown only appears for Client persona.

---

## 4. Data Schema for Fabric Lakehouse

We'll create these lakehouse tables from the existing JSON data:

### Table: `client_profiles`

| Column | Type | Source |
|--------|------|--------|
| client_id | STRING | `id` |
| name | STRING | `name` |
| email | STRING | `email` |
| age | INT | `age` |
| current_cash | DECIMAL | `current_cash` |
| investment_assets | DECIMAL | `investment_assets` |
| yearly_savings_rate | DECIMAL | `yearly_savings_rate` |
| salary | DECIMAL | `salary` |
| stocks_pct | DECIMAL | `portfolio.stocks` |
| bonds_pct | DECIMAL | `portfolio.bonds` |
| real_estate_pct | DECIMAL | `portfolio.real_estate` |
| alternatives_pct | DECIMAL | `portfolio.alternatives` |
| cash_pct | DECIMAL | `portfolio.cash` |
| risk_appetite | STRING | `risk_appetite` |
| target_retire_age | INT | `target_retire_age` |
| target_monthly_income | DECIMAL | `target_monthly_income` |
| description | STRING | `description` |
| jurisdiction | STRING | `jurisdiction` |
| status | STRING | `status` |

### Table: `portfolio_accounts`

Generated from `lib/mockPortfolio.ts` logic, materialized per client:

| Column | Type |
|--------|------|
| client_id | STRING |
| account_id | STRING |
| account_name | STRING |
| account_type | STRING |
| balance | DECIMAL |
| currency | STRING |

### Table: `portfolio_holdings`

| Column | Type |
|--------|------|
| client_id | STRING |
| account_id | STRING |
| holding_id | STRING |
| symbol | STRING |
| name | STRING |
| shares | DECIMAL |
| price | DECIMAL |
| value | DECIMAL |
| allocation_pct | DECIMAL |
| sector | STRING |
| asset_class | STRING |
| day_change_pct | DECIMAL |

### Table: `portfolio_transactions`

| Column | Type |
|--------|------|
| client_id | STRING |
| account_id | STRING |
| transaction_id | STRING |
| date | DATE |
| type | STRING |
| description | STRING |
| amount | DECIMAL |

### Table: `investment_products`

Source: `backend/data/investment_products.json`

| Column | Type |
|--------|------|
| product_id | STRING |
| name | STRING |
| risk_level | STRING |
| expected_return | DECIMAL |
| risk_rating | STRING |
| asset_class | STRING |
| description | STRING |
| expense_ratio | DECIMAL |
| minimum_investment | DECIMAL |

---

## 5. Execution Plan

### Phase 1: Data Preparation & Seeding Scripts (Day 1)

| # | Task | Artifact |
|---|------|----------|
| 1.1 | Create `scripts/generate_fabric_seed_data.py` — reads `user_profiles.json`, `investment_products.json`, generates portfolio data via Python port of `mockPortfolio.ts` logic, outputs CSV/Parquet files | `scripts/generate_fabric_seed_data.py` |
| 1.2 | Create `scripts/fabric_setup.ipynb` — Fabric notebook that creates lakehouse, uploads seed data, creates Data Agent, configures tables + instructions + few-shots, publishes | `scripts/fabric_setup.ipynb` |
| 1.3 | Create `scripts/seed_fabric_lakehouse.py` — local script to upload seed data to an existing lakehouse via OneLake/Fabric REST API | `scripts/seed_fabric_lakehouse.py` |

### Phase 2: Backend Fabric Service (Day 1-2)

| # | Task | Artifact |
|---|------|----------|
| 2.1 | Create `backend/fabric_service.py` — FabricDataAgentClient class (OpenAI Assistants API wrapper against published URL, AAD token management, query method, health check) | `backend/fabric_service.py` |
| 2.2 | Add Fabric env vars to `backend/.env` | `FABRIC_DATA_AGENT_URL`, `FABRIC_TENANT_ID`, `FABRIC_CLIENT_ID`, `FABRIC_CLIENT_SECRET`, `FABRIC_AUTH_MODE` |
| 2.3 | Add `GET /api/fabric/health` endpoint | `backend/main.py` |
| 2.4 | Add `POST /api/fabric/query` endpoint (NL query passthrough) | `backend/main.py` |
| 2.5 | Modify `/chat/stream` to accept `data_source` param, branch to Fabric-enriched flow | `backend/main.py` |
| 2.6 | Modify `/api/project-scenario` to accept `data_source` param, branch to Fabric-enriched flow | `backend/main.py` |

### Phase 3: Frontend Mode Switcher (Day 2)

| # | Task | Artifact |
|---|------|----------|
| 3.1 | Add `DataSourceMode` type (`"local" | "fabric"`) to `lib/types.ts` | `lib/types.ts` |
| 3.2 | Add `dataSourceMode` state + setter to `app/page.tsx`, pass to components | `app/page.tsx` |
| 3.3 | Modify `ModeToggle` / `ProfileBubble` — add Live sub-dropdown (Local/Fabric) for client persona only | `components/frontend/shared/ModeToggle.tsx` or `ProfileBubble.tsx` |
| 3.4 | Wire `dataSourceMode` into `chatWithAssistantStreaming()` and `projectScenario()` calls in `lib/api.ts` | `lib/api.ts` |
| 3.5 | Add Fabric health indicator (green dot / error state) when Fabric mode selected | `ProfileBubble.tsx` |

### Phase 4: Testing (Day 2-3)

| # | Task | Artifact |
|---|------|----------|
| 4.1 | Create `tests/test_fabric_service.py` — unit tests with mocked OpenAI responses | `tests/test_fabric_service.py` |
| 4.2 | Create `tests/test_fabric_integration.py` — live integration test (queries actual Fabric Data Agent) | `tests/test_fabric_integration.py` |
| 4.3 | Create `tests/test_fabric_e2e.py` — end-to-end test (starts backend, hits /chat/stream with fabric mode, validates response) | `tests/test_fabric_e2e.py` |
| 4.4 | Verify advisor persona is completely unaffected | Manual + automated |

### Phase 5: Documentation (Day 3)

| # | Task | Artifact |
|---|------|----------|
| 5.1 | Update `README.md` with Fabric setup instructions | `README.md` |
| 5.2 | Add `FABRIC_SETUP.md` with step-by-step guide | `docs/FABRIC_SETUP.md` |

---

## 6. Backend Service Design: `fabric_service.py`

```python
"""
FabricDataAgentClient — queries a published Fabric Data Agent 
via the OpenAI Assistants API.

Auth approaches:
  - "cli": Uses AzureCliCredential targeting FABRIC_TENANT_ID
  - "spn": Uses ClientSecretCredential with FABRIC_CLIENT_ID / FABRIC_CLIENT_SECRET

The published Data Agent URL exposes an OpenAI-compatible API:
  - POST /assistants (create assistant)
  - POST /threads (create thread)
  - POST /threads/{id}/messages (add message)
  - POST /threads/{id}/runs (create run)
  - GET  /threads/{id}/runs/{id} (poll run status)
  - GET  /threads/{id}/messages (get results)
  - DELETE /threads/{id} (cleanup)
"""

class FabricDataAgentClient:
    def __init__(self, base_url, tenant_id, auth_mode, ...):
        ...
    
    async def query(self, question: str, timeout: int = 120) -> FabricQueryResult:
        """Send a natural-language question, poll for completion, return result."""
        ...
    
    async def health_check(self) -> bool:
        """Verify connectivity by creating+deleting a thread."""
        ...
    
    def _get_token(self) -> str:
        """Get AAD token for Fabric tenant."""
        ...
```

### Integration with existing `/chat/stream`:

When `data_source == "fabric"`:
1. Pre-query: ask the Fabric Data Agent about the client's current data  
   e.g., *"Show me the full portfolio for client {client_id} including all accounts, holdings, and recent transactions"*
2. Inject the structured response into the AI agent's system context as supplemental data
3. The AI agent (GPT-4.1) then uses this **real Fabric data** instead of generated mock data when computing what-if scenarios
4. The rest of the analysis pipeline (CodeInterpreter, product catalog, etc.) works unchanged

---

## 7. Frontend Changes (Mockup)

### ProfileBubble Changes (Client persona, Live mode only):

```
┌─────────────────────────────┐
│ 👤 John Doe                 │
│ Client                      │
├─────────────────────────────┤
│ Mode                        │
│ ○ Mock                      │
│ ● Live                      │
│   ├── ● Local (default)     │
│   └── ○ Fabric  🟢          │ ← green = healthy, 🔴 = unreachable
├─────────────────────────────┤
│ Switch Persona ▸            │
└─────────────────────────────┘
```

### Key behaviors:
- Sub-dropdown only visible when persona == "client" AND mode == "live"
- Default is "Local" (no behavioral change from current)
- Selecting "Fabric" triggers a health check; shows badge
- `chatWithAssistantStreaming()` and `projectScenario()` pass `data_source` param
- Mock mode: no changes at all (no sub-dropdown, no Fabric option)

---

## 8. Environment Variables (New)

```env
# Fabric Data Agent Configuration
FABRIC_DATA_AGENT_URL=https://<your-fabric-published-url>
FABRIC_TENANT_ID=<fabric-tenant-id>
FABRIC_AUTH_MODE=cli                    # "cli" or "spn"
FABRIC_CLIENT_ID=                       # only needed for spn mode
FABRIC_CLIENT_SECRET=                   # only needed for spn mode
FABRIC_QUERY_TIMEOUT_SECONDS=120
FABRIC_ENABLED=true                     # kill switch
```

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Fabric Data Agent latency (can be 10-30s) | Show streaming status updates; set 120s timeout; cache results per session |
| Cross-tenant auth failures | Graceful fallback to local mode with user notification; health check on mode switch |
| Fabric capacity unavailable | `FABRIC_ENABLED=false` kill switch; UI shows "Fabric unavailable" |
| Data drift between local JSON and Fabric lakehouse | Seed script generates both; CI can validate consistency |
| Advisor persona accidentally affected | `data_source` param only sent from client persona paths; advisor routes don't accept it |

---

## 10. What I Need From You Before Starting

1. **Fabric Tenant ID** where your capacity lives
2. **Fabric Workspace** — name of existing workspace or confirmation to create a new one
3. **Auth preference** — start with `az cli` (Option B) for now? Or set up Service Principal immediately?
4. **Published Data Agent URL** — if you already have a Fabric Data Agent, share the URL. If not, I'll generate the setup notebook for you to run.
5. **Confirmation on UI design** — is the nested Live dropdown approach (Local vs Fabric) acceptable?

---

## 11. Files That Will Be Created or Modified

### New files:
- `backend/fabric_service.py` — Fabric Data Agent client
- `scripts/generate_fabric_seed_data.py` — generate seed CSVs/Parquet from existing JSON
- `scripts/fabric_setup.ipynb` — Fabric notebook for one-click Lakehouse + Data Agent setup  
- `scripts/seed_fabric_lakehouse.py` — local script to push data to Fabric lakehouse
- `tests/test_fabric_service.py` — unit tests
- `tests/test_fabric_integration.py` — integration tests
- `tests/test_fabric_e2e.py` — e2e tests
- `docs/FABRIC_SETUP.md` — setup guide

### Modified files:
- `backend/.env` — add Fabric env vars
- `backend/main.py` — add `/api/fabric/*` endpoints, modify `/chat/stream` and `/api/project-scenario`
- `backend/models.py` — add `DataSourceMode` enum, update request models
- `lib/types.ts` — add `DataSourceMode` type
- `lib/api.ts` — pass `data_source` in live-mode API calls
- `app/page.tsx` — add `dataSourceMode` state, wire into components
- `components/frontend/shared/ModeToggle.tsx` or `components/frontend/ProfileBubble.tsx` — add Fabric sub-toggle
- `backend/pyproject.toml` — add `openai` dependency (for Fabric client)
