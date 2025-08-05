# Sage Retirement Planning - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ & **pnpm**
- **[uv](https://docs.astral.sh/uv/)** — fast Python package manager
- **Azure Account** (optional, for live backend)

### 1. Setup Everything
```bash
# Windows
setup.bat

# macOS/Linux
chmod +x setup.sh && ./setup.sh
```

### 2. Run the Application
```bash
# Start both frontend and backend
npm run dev:full

# Or separately:
npm run dev          # Frontend only (http://localhost:3847)
npm run backend:dev  # Backend only  (http://localhost:8172)
```

### 3. Run Tests
```bash
npm run backend:test   # Backend regression tests
```

### 4. Configure Backend (Optional)
For live AI features, create `backend/.env`:
```env
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_RESOURCE_GROUP=your_resource_group
AZURE_PROJECT_NAME=your_project_name
AZURE_AI_STUDIO_CONNECTION_STRING=your_connection_string
```

---

## 🌐 Production Deployment

### Frontend (Vercel - Recommended)
```bash
npm i -g vercel
vercel
# Set NEXT_PUBLIC_API_URL=https://your-backend-url.com in Vercel dashboard
```

### Backend (Azure Container Apps)
```bash
# Build and deploy
az acr build --registry myregistry --image sage-backend backend/
az containerapp create \
  --name sage-backend \
  --resource-group myResourceGroup \
  --image myregistry.azurecr.io/sage-backend:latest \
  --target-port 8000 \
  --ingress external
```

### Alternative: Docker
```bash
docker-compose up --build
```

---

## 📁 Project Structure
```
sage-retirement-planning/
├── app/              # Next.js pages
├── components/       # UI components
├── lib/             # API & utilities
├── backend/         # Python FastAPI server
└── public/          # Static assets
```

---

## 🔧 Environment Variables

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8172
```

**Backend** (`backend/.env`):
```env
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_RESOURCE_GROUP=your_resource_group
AZURE_PROJECT_NAME=your_project_name
AZURE_AI_STUDIO_CONNECTION_STRING=your_connection_string
```

---

## � Common Issues

**Frontend not styling**: Make sure Tailwind CSS is properly imported in `app/globals.css`

**Backend not starting**: Run `cd backend && uv sync` to ensure dependencies are installed

**API not connecting**: Verify `NEXT_PUBLIC_API_URL` matches your backend URL (default: http://localhost:8172)

**React conflicts**: The app starts in mock mode by default - no backend needed for testing
