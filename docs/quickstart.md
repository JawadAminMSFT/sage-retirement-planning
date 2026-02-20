# Sage — Quickstart Guide

Get the retirement planning app running locally in under 5 minutes.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **pnpm** | 9+ | `npm i -g pnpm` |
| **Python** | 3.11+ | [python.org](https://python.org) |
| **uv** | latest | `pip install uv` or [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |

---

## 1. Clone & Install

```bash
git clone <repo-url> sage-retirement-planning
cd sage-retirement-planning

# Frontend
pnpm install

# Backend
cd backend
uv sync
cd ..
```

---

## 2. Choose Your Mode

### Demo Mode (no backend needed)

Start only the frontend — it uses built-in mock data:

```bash
pnpm dev
```

Open **http://localhost:3847** and start chatting. Toggle **Demo/Live** in the profile dropdown (top right).

### Live Mode (Azure AI backend)

1. Copy your environment variables into `backend/.env`:

```env
PROJECT_ENDPOINT=https://your-project.services.ai.azure.com
MODEL_DEPLOYMENT_NAME=your-deployment
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your-eval-deployment
AZURE_OPENAI_KEY=your-key
```

2. Start the backend:

```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8172 --reload
```

3. In a second terminal, start the frontend:

```bash
pnpm dev
```

4. Open **http://localhost:3847**, toggle to **Live** mode in the profile dropdown, and ask a question.

---

## 3. Docker (both services)

```bash
docker compose up --build
```

- Frontend → **http://localhost:3847**
- Backend → **http://localhost:8172**

---

## 4. Test a Scenario

1. Select a user profile (top right).
2. Type or pick a scenario: *"What if I retire at 62 instead of 65?"*
3. Watch the streaming status → metrics, allocation chart, cashflow chart.
4. Click follow-up questions in the **Next Steps** panel.
5. (Live mode) Click the evaluate button (🤖) on analysis cards to score the AI agent.

---

## 5. Run Regression Tests

```bash
# All phases (0-5)
python tests/test_regression.py

# Single phase
python tests/test_regression.py --phase 5

# Backend unit tests (requires uv environment)
cd backend
uv run pytest tests/
```

### Test Coverage

| Phase | Tests | What it checks |
|-------|-------|----------------|
| 0 | 33 | Live + demo flow validation, .env vars, CORS, port consistency |
| 1 | 21 | uv migration, port 8172/3847, Dockerfile, docker-compose |
| 2 | 11 | Dead file removal (shadcn, unused components) |
| 3 | 6 | CSS cleanup, lean globals.css |
| 4 | 12 | npm dependency pruning |
| 5 | 9 | page.tsx decomposition, extracted components, onKeyDown fix |

---

## 6. Project Structure

```
app/
  page.tsx          ← Main app (394 lines, imports components)
  layout.tsx        ← Root layout
  globals.css       ← Tailwind + animations

components/frontend/
  AnalysisCard.tsx   ← Scenario results: metrics, allocation, chart
  CashflowChart.tsx  ← SVG area chart for projections
  MetricCard.tsx     ← Reusable metric display with progress ring
  ProfileBubble.tsx  ← Header profile dropdown + mode toggle
  ProfileSelectModal.tsx ← Full-screen profile picker
  QuickScenariosCard.tsx ← Scenario suggestion grid
  StatusBubble.tsx   ← Streaming status indicator

lib/
  analysis.ts       ← Shared types, formatters, validation logic
  api.ts            ← API client (mock + live branches)
  mockData.ts       ← Demo mode data + streaming simulation
  utils.ts          ← cn() Tailwind merge utility

backend/
  main.py           ← FastAPI server (port 8172)
  pyproject.toml    ← Python deps managed by uv
```

---

## Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | **3847** |
| Backend (FastAPI) | **8172** |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Module not found` on frontend | Run `pnpm install` |
| Backend won't start | Check `backend/.env` has valid Azure credentials |
| Mock mode not loading profiles | Clear browser cache, hard refresh |
| `EADDRINUSE` port conflict | Kill the process on 3847/8172 or change in `package.json` / `main.py` |
| Regression test encoding error | Tests use UTF-8 reading; ensure files are saved as UTF-8 |
