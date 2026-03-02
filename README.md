# 🌿 Sage Retirement Planning

**A Microsoft accelerator for AI-powered retirement planning — the first application to integrate Work IQ, Foundry IQ, and Fabric IQ into a single full-stack experience.**

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Azure AI](https://img.shields.io/badge/Azure%20AI-Agents-0078D4?logo=microsoft-azure)](https://azure.microsoft.com/en-us/products/ai-services/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

> **Triple IQ Integration** — Sage combines **Work IQ** (Microsoft 365 context via MCP), **Foundry IQ** (Azure AI Search knowledge base via MCP), and **Fabric IQ** (Microsoft Fabric Data Agent for lakehouse analytics) to deliver a uniquely intelligent financial planning experience that no other accelerator offers.

---

## ✨ Key Features

### 🔮 AI-Powered Scenario Projections
Ask natural language questions like *"What if I maximize my 401(k) contributions?"* or *"How would a market crash affect my retirement?"* and get instant, personalized projections powered by Azure AI Agents.

### 📊 Real-Time Portfolio Analysis
- View projected account balances across 401(k), Roth IRA, and brokerage accounts
- See holding-level projections with allocation changes
- Understand risks and opportunities for each scenario

### ⏱️ Flexible Timeframes
Project scenarios across 3-month, 6-month, or 12-month horizons with proportionally accurate results.

### 🎯 Quick Scenario Templates
One-click example scenarios to explore common retirement planning questions:
- Max out 401(k) contributions
- Increase savings rate by 5%
- Simulate a 20% market crash
- Add Roth IRA contributions
- Plan for early retirement

### 🔄 Mock & Live Modes
- **Mock Mode**: Fully functional demo without Azure credentials
- **Live Mode**: Connect to Azure AI for real LLM-powered analysis

### 🧠 Triple IQ Integration (Differentiator)

| IQ Service | What It Does | Protocol |
|------------|-------------|----------|
| **Work IQ** | Pulls calendar, emails, files from Microsoft 365 to enrich advisor context (upcoming client meetings, recent correspondence, shared documents) | Local MCP via CLI |
| **Foundry IQ** | Retrieves grounded knowledge from an Azure AI Search knowledge base for advisor chat (compliance rules, product details, regulatory guidance) | Cloud MCP (Azure AI Search) |
| **Fabric IQ** | Queries a Microsoft Fabric Data Agent backed by a lakehouse for real client/portfolio analytics during what-if scenarios | OpenAI Assistants API via SPN |

All three are **optional and gracefully degrade** — the app works fully in mock mode with none of them configured.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Dashboard  │  │  Portfolio  │  │  Scenario Projection    │  │
│  │    View     │  │    View     │  │      Overlay            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  /chat     │  │ /project-  │  │ /advisor/* │  │ /api/     │  │
│  │  endpoint  │  │  scenario  │  │ WorkIQ+MCP │  │ fabric/*  │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└──────┬─────────────────┬────────────────┬──────────────┬────────┘
       │                 │                │              │
       ▼                 ▼                ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│  Azure AI    │  │  Foundry IQ  │  │ Work IQ  │  │  Fabric IQ   │
│  Foundry     │  │  (AI Search  │  │ (M365    │  │  (Data Agent │
│  GPT-4.1     │  │   MCP KB)    │  │  MCP)    │  │   Lakehouse) │
│  Agent       │  │              │  │          │  │              │
│  • Cashflow  │  │  Compliance  │  │ Calendar │  │  Client &    │
│  • Portfolio │  │  Products    │  │ Emails   │  │  Portfolio   │
│  • Risk      │  │  Regulations │  │ Files    │  │  Analytics   │
│  • Tax       │  │  Guidance    │  │ Meetings │  │  SQL + NL    │
└──────────────┘  └──────────────┘  └──────────┘  └──────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.11+ and uv
- (Optional) Azure AI Foundry project for live mode
- (Optional) Azure AI Search instance for Foundry IQ
- (Optional) Microsoft Fabric workspace with a published Data Agent for Fabric IQ
- (Optional) Work IQ CLI with local auth tokens for Work IQ

### 1. Clone and Install

```bash
git clone https://github.com/JawadAminMSFT/sage-retirement-planning.git
cd sage-retirement-planning

# Frontend
pnpm install

# Backend
cd backend
uv sync
```

### 2. Configure Environment

Copy the example env and fill in values for the capabilities you want:

```bash
cp .env.example backend/.env
```

**Core (required for live mode):**
```env
PROJECT_ENDPOINT=https://your-ai-foundry.services.ai.azure.com/api/projects/your-project
MODEL_DEPLOYMENT_NAME=gpt-4.1
DEMO_TENANT_ID=<your-azure-ad-tenant-id>   # if az cli targets a different tenant
```

**Foundry IQ — Azure AI Search Knowledge Base (MCP):**
```env
SAGE_KB_MCP_URL=https://<your-search>.search.windows.net/knowledgebases/<kb-name>/mcp?api-version=2025-11-01-preview
SAGE_KB_MCP_API_KEY=<your-search-api-key>
SAGE_KB_MCP_TOOL_NAME=knowledge_base_retrieve
SAGE_KB_MCP_TIMEOUT_SECONDS=8
SAGE_KB_MCP_RETRIES=1
```

**Fabric IQ — Microsoft Fabric Data Agent (SPN):**
```env
FABRIC_TENANT_ID=<fabric-tenant-id>
FABRIC_CLIENT_ID=<spn-application-client-id>
FABRIC_CLIENT_SECRET=<spn-client-secret>
FABRIC_DATA_AGENT_URL=https://api.fabric.microsoft.com/v1/workspaces/<ws-id>/dataagents/<agent-id>/aiassistant/openai
FABRIC_DATA_AGENT_ID=<published-assistant-id>
```

**Work IQ — Microsoft 365 Context (local MCP CLI):**
```env
# "local" = live queries via WorkIQ CLI  |  "mock" = static data  |  "disabled" = off
WORKIQ_MODE=local
```

### 3. Run the Application

**Terminal 1 - Backend (port 8172):**
```bash
cd backend
uv run uvicorn main:app --port 8172
```

**Terminal 2 - Frontend (port 3847):**
```bash
pnpm dev
```

Open http://localhost:3847 in your browser.

---

## 📸 Screenshots

### Dashboard View
Professional dashboard with YTD performance, quick stats, and AI chat interface.

### Portfolio View with "What If" Projections
Click the **"What If"** button to open the scenario projection overlay and explore how different decisions affect your retirement.

### Scenario Projection Results
See projected account balances, percentage changes, and AI-generated insights including risks and opportunities.

---

## 🧪 Testing

### Run All Tests
```bash
# Regression tests (no backend required)
python tests/test_regression.py

# Projection API tests (mock mode)
python tests/test_projection_api.py

# Live API tests (requires running backend)
python tests/test_projection_live.py
```

### Test Coverage
- ✅ 90+ regression tests across 6 phases
- ✅ 48+ projection API validation checks
- ✅ 11 live scenario tests with sanity validation

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, uv |
| **AI** | Azure AI Foundry Agents (GPT-4.1) |
| **Work IQ** | Microsoft 365 MCP integration (calendar, email, files) via local CLI |
| **Foundry IQ** | Azure AI Search Knowledge Base via cloud MCP |
| **Fabric IQ** | Microsoft Fabric Data Agent via OpenAI Assistants API (SPN auth) |
| **Styling** | Tailwind CSS, Lucide Icons |
| **Testing** | Python unittest, Live API tests |

---

## 📁 Project Structure

```
sage-retirement-planning/
├── app/                    # Next.js app router
│   ├── page.tsx           # Main application page
│   └── layout.tsx         # Root layout
├── components/
│   └── frontend/          # React components
│       ├── DashboardView.tsx
│       ├── PortfolioView.tsx
│       ├── ScenarioProjectionOverlay.tsx
│       └── ...
├── lib/
│   ├── api.ts             # API client (mock/live modes)
│   ├── mockData.ts        # Mock data generators
│   └── mockPortfolio.ts   # Sample portfolio data
├── backend/
│   ├── main.py            # FastAPI server
│   ├── workiq_service.py  # Work IQ integration (M365 MCP)
│   ├── fabric_service.py  # Fabric IQ integration (Data Agent)
│   ├── pyproject.toml     # Python dependencies
│   └── data/              # User profiles, products, mock data
├── scripts/
│   └── workiq-check/      # Work IQ CLI query script
├── skills/
│   └── azure-container-apps/  # Deployment skill (ACA)
├── docs/
│   ├── FABRIC_INTEGRATION.md  # Fabric IQ setup guide
│   └── ADVISOR_VIEW_SPEC.md   # Advisor view specification
├── tests/
│   ├── test_regression.py
│   ├── test_projection_api.py
│   └── test_projection_live.py
└── .env.example           # Environment template (all IQ vars)
```

---

---

## 🔌 IQ Integration Setup

### Foundry IQ (Azure AI Search MCP Knowledge Base)

Foundry IQ gives the advisor chat grounded knowledge from a curated knowledge base (compliance rules, product sheets, regulatory guidance).

1. **Create an Azure AI Search resource** in your Azure subscription
2. **Create a Knowledge Base** in the Azure AI Search resource with your advisor content (documents, PDFs, etc.)
3. **Enable the MCP endpoint** — the knowledge base exposes an MCP-compatible endpoint at:
   ```
   https://<search-name>.search.windows.net/knowledgebases/<kb-name>/mcp?api-version=2025-11-01-preview
   ```
4. **Set environment variables** in `backend/.env`:
   ```env
   SAGE_KB_MCP_URL=https://<search-name>.search.windows.net/knowledgebases/<kb-name>/mcp?api-version=2025-11-01-preview
   SAGE_KB_MCP_API_KEY=<your-admin-or-query-api-key>
   SAGE_KB_MCP_TOOL_NAME=knowledge_base_retrieve
   ```
5. The advisor chat will automatically use MCP-first retrieval with fallback to the AI agent if MCP is unavailable.

### Fabric IQ (Microsoft Fabric Data Agent)

Fabric IQ enables natural-language queries against a Fabric Lakehouse containing client and portfolio data.

1. **Set up a Fabric workspace** with a Lakehouse containing your client/portfolio tables
2. **Create and publish a Data Agent** in the Fabric workspace (see [docs/FABRIC_INTEGRATION.md](docs/FABRIC_INTEGRATION.md) for step-by-step)
3. **Register a Service Principal (SPN)** in the Fabric tenant with Contributor access to the workspace
4. **Set environment variables** in `backend/.env`:
   ```env
   FABRIC_TENANT_ID=<fabric-aad-tenant-id>
   FABRIC_CLIENT_ID=<spn-app-client-id>
   FABRIC_CLIENT_SECRET=<spn-client-secret>
   FABRIC_DATA_AGENT_URL=https://api.fabric.microsoft.com/v1/workspaces/<ws-id>/dataagents/<agent-id>/aiassistant/openai
   FABRIC_DATA_AGENT_ID=<published-assistant-id>
   ```
5. The client persona in Live mode will show a **Live (Fabric)** data source option for what-if analysis.

### Work IQ (Microsoft 365 Context via MCP)

Work IQ enriches the advisor experience with real-time Microsoft 365 context: today's calendar, recent emails about clients, shared files.

1. **Install the Work IQ CLI** and authenticate with your Microsoft 365 account locally
2. **Place the MCP query script** at `scripts/workiq-check/query.mjs` (included in the repo)
3. **Set environment variable** in `backend/.env`:
   ```env
   WORKIQ_MODE=local    # "local" for live CLI queries, "mock" for static demo data, "disabled" to turn off
   ```
4. On startup, the backend pre-fetches calendar, email, meeting, and file context into an in-memory cache (5-min TTL).
5. For cloud deployments where the CLI is not available, use `WORKIQ_MODE=mock` to serve bundled demo data from `backend/data/workiq_mock.json`.

---

## 🔐 Security

- ✅ No hardcoded secrets in source code
- ✅ Environment variables for all credentials
- ✅ `.env` files are gitignored
- ✅ Input validation on all API endpoints
- ✅ Fabric IQ uses SPN (ClientSecretCredential) — isolated from user az cli auth
- ✅ Foundry IQ uses API key scoped to the search resource
- ✅ Work IQ runs only locally with user's own M365 auth tokens

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<p align="center">
  <strong>Built with ❤️ using Azure AI Foundry, Azure AI Search, Microsoft Fabric & Work IQ</strong>
</p>
