# 🌿 Sage Retirement Planning

**An AI-powered retirement planning assistant that helps users explore "What If" scenarios and make informed financial decisions.**

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Azure AI](https://img.shields.io/badge/Azure%20AI-Agents-0078D4?logo=microsoft-azure)](https://azure.microsoft.com/en-us/products/ai-services/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## ✨ Key Features

### 🔮 AI-Powered Scenario Projections
Ask natural language questions like *"What if I maximize my 401(k) contributions?"* or *"How would a market crash affect my retirement?"* and get instant, personalized projections powered by Azure AI Agents.

### 🎙️ Voice Mode
Speak with your AI retirement planning assistant using Azure Voice Live (gpt-4o-realtime). Natural, real-time voice conversations with audio responses. Available in both Client and Advisor portals.

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
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   /chat     │  │  /project-  │  │   Azure AI Agents       │  │
│  │  endpoint   │  │   scenario  │  │   Integration           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Azure AI Foundry                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  GPT-4.1 Agent with Financial Planning Tools            │    │
│  │  • Cashflow Analysis  • Portfolio Projection            │    │
│  │  • Risk Assessment    • Tax Optimization                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.11+ and uv
- (Optional) Azure AI Foundry project for live mode

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

**Frontend** (`.env.local`):
```bash
cp .env.example .env.local
# Edit .env.local with your backend URL
```

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
# For local dev with Azure CLI:
az login
# Or add your Azure credentials for production
```

See [Environment Configuration Guide](./docs/environment-configuration.md) for detailed setup.

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

## 📚 Documentation

Comprehensive documentation is available in the [docs folder](./docs/):

- **[📖 Documentation Index](./docs/README.md)** - Start here for all documentation
- **[⚡ Quick Start Guide](./docs/quickstart.md)** - Detailed setup instructions
- **[🎙️ Voice Mode Setup](./docs/voice/setup.md)** - Configure voice chat with Azure Voice Live
- **[🔐 Voice Authentication](./docs/voice/authentication.md)** - AAD authentication guide
- **[⚙️ Environment Config](./docs/environment-configuration.md)** - Complete environment variable reference
- **[🚀 Deployment Guide](./docs/deployment.md)** - Production deployment
- **[🔧 Backend README](./docs/backend/README.md)** - Backend-specific documentation

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
| **AI** | Azure AI Agents, GPT-4.1 |
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
│   ├── pyproject.toml     # Python dependencies
│   └── data/              # User profiles & products
├── tests/
│   ├── test_regression.py
│   ├── test_projection_api.py
│   └── test_projection_live.py
└── .env.example           # Environment template
```

---

## 🔐 Security

- ✅ No hardcoded secrets in source code
- ✅ Environment variables for all credentials
- ✅ `.env` files are gitignored
- ✅ Input validation on all API endpoints

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<p align="center">
  <strong>Built with ❤️ using Azure AI Foundry</strong>
</p>
