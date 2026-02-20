# Environment Configuration Guide

This guide explains all environment variables for Sage Retirement Planning's frontend and backend.

## Overview

Configuration is separated into two files:
- **Frontend**: `.env.local` (generated from `.env.example`)
- **Backend**: `backend/.env` (generated from `backend/.env.example`)

---

## Frontend Configuration

**Location**: `.env.local` (copy from `.env.example`)

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API endpoint | `http://localhost:8172` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for voice | `ws://localhost:8172` |

### Optional Variables

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_VOICE_ENABLED` | Enable voice mode | `true` | `true`, `false` |
| `NEXT_PUBLIC_APP_ENV` | Application environment | `development` | `development`, `staging`, `production` |
| `NEXT_PUBLIC_MOCK_MODE` | Use mock data (no backend) | `false` | `true`, `false` |
| `NEXT_PUBLIC_MOCK_DELAY` | Mock API delay (ms) | `1000` | Any number |
| `NEXT_PUBLIC_DEBUG` | Enable debug logging | `false` | `true`, `false` |

### Example: Local Development

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8172
NEXT_PUBLIC_WS_URL=ws://localhost:8172
NEXT_PUBLIC_VOICE_ENABLED=true
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_MOCK_MODE=false
NEXT_PUBLIC_DEBUG=true
```

### Example: Production

```bash
# .env.local (or set in deployment platform)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_VOICE_ENABLED=true
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_MOCK_MODE=false
NEXT_PUBLIC_DEBUG=false
```

---

## Backend Configuration

**Location**: `backend/.env` (copy from `backend/.env.example`)

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PROJECT_ENDPOINT` | Azure AI project endpoint | `https://your-project.openai.azure.com` |
| `MODEL_DEPLOYMENT_NAME` | GPT model deployment | `gpt-4` |
| `AZURE_REALTIME_ENDPOINT` | Voice API endpoint | `https://your-resource.openai.azure.com` |
| `VOICE_MODEL_DEPLOYMENT` | Voice model deployment | `gpt-4o-realtime-preview` |

### Authentication (Choose ONE option)

#### Option 1: Azure CLI (Local Development)

**No environment variables needed!**

```bash
# Just login with Azure CLI
az login
az account set --subscription "your-subscription-id"
```

The `DefaultAzureCredential` will automatically use your CLI credentials.

#### Option 2: Service Principal (Production)

```bash
# Create service principal first:
az ad sp create-for-rbac --name "sage-app-sp" \
  --role "Cognitive Services OpenAI User" \
  --scopes /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource>

# Then set these in backend/.env:
AZURE_CLIENT_ID=your-app-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_SECRET=your-password
```

#### Option 3: Managed Identity (Azure Hosting)

**No environment variables needed!**

Enable managed identity on your Azure resource (App Service, Container App, etc.) and assign the "Cognitive Services OpenAI User" role.

### Voice Configuration

| Variable | Description | Default | Range/Options |
|----------|-------------|---------|---------------|
| `VOICE_DEFAULT_VOICE` | Default voice for responses | `alloy` | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| `VOICE_VAD_THRESHOLD` | Voice activity detection sensitivity | `0.5` | `0.0` - `1.0` (lower = more sensitive) |
| `VOICE_SILENCE_DURATION_MS` | Silence before turn ends | `700` | Milliseconds (500-2000 recommended) |
| `VOICE_SAMPLE_RATE` | Audio sample rate | `24000` | `24000` (24kHz) |

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8172` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3847` |
| `ENVIRONMENT` | Server environment | `development` |

### WebSocket Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_MAX_CONNECTIONS` | Max concurrent WebSocket connections | `100` |
| `WS_CONNECTION_TIMEOUT` | Connection timeout (seconds) | `300` |

### Storage Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PATH` | Local storage path | `./data` |

### Logging Configuration

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging level | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |

### Example: Local Development (Azure CLI)

```bash
# backend/.env
PROJECT_ENDPOINT=https://your-project.openai.azure.com
MODEL_DEPLOYMENT_NAME=gpt-4

AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime-preview
VOICE_DEFAULT_VOICE=alloy
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=700

PORT=8172
CORS_ORIGINS=http://localhost:3847
ENVIRONMENT=development
LOG_LEVEL=DEBUG

# No AAD variables needed - using Azure CLI
```

### Example: Production (Service Principal)

```bash
# backend/.env
PROJECT_ENDPOINT=https://your-project.openai.azure.com
MODEL_DEPLOYMENT_NAME=gpt-4

AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime-preview
VOICE_DEFAULT_VOICE=alloy
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=700

# AAD Service Principal
AZURE_CLIENT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
AZURE_TENANT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
AZURE_CLIENT_SECRET=your-secret-here

PORT=8172
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Example: Azure Hosting (Managed Identity)

```bash
# backend/.env
PROJECT_ENDPOINT=https://your-project.openai.azure.com
MODEL_DEPLOYMENT_NAME=gpt-4

AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime-preview
VOICE_DEFAULT_VOICE=alloy
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=700

PORT=8172
CORS_ORIGINS=https://yourdomain.com
ENVIRONMENT=production
LOG_LEVEL=INFO

# No AAD variables needed - using managed identity
```

---

## Configuration by Environment

### Development

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8172
NEXT_PUBLIC_WS_URL=ws://localhost:8172
NEXT_PUBLIC_VOICE_ENABLED=true
NEXT_PUBLIC_DEBUG=true

# Backend (backend/.env)
# Use Azure CLI authentication (az login)
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

### Staging

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api-staging.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api-staging.yourdomain.com
NEXT_PUBLIC_VOICE_ENABLED=true
NEXT_PUBLIC_APP_ENV=staging

# Backend (backend/.env)
# Use Service Principal OR Managed Identity
ENVIRONMENT=staging
LOG_LEVEL=INFO
AZURE_CLIENT_ID=...  # If using service principal
AZURE_TENANT_ID=...
AZURE_CLIENT_SECRET=...
```

### Production

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_VOICE_ENABLED=true
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_DEBUG=false

# Backend (backend/.env)
# Use Managed Identity (recommended) OR Service Principal
ENVIRONMENT=production
LOG_LEVEL=WARNING
# No AAD variables if using managed identity
```

---

## Validation

### Frontend Validation

Check that variables are loaded in browser console:

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
console.log('WS URL:', process.env.NEXT_PUBLIC_WS_URL)
console.log('Voice Enabled:', process.env.NEXT_PUBLIC_VOICE_ENABLED)
```

### Backend Validation

```bash
cd backend

# Check environment loading
python -c "import os; from dotenv import load_dotenv; load_dotenv(); \
  print('Endpoint:', os.getenv('PROJECT_ENDPOINT')); \
  print('Voice Endpoint:', os.getenv('AZURE_REALTIME_ENDPOINT'))"

# Test Azure authentication
python -c "from azure.identity import DefaultAzureCredential; \
  cred = DefaultAzureCredential(); \
  token = cred.get_token('https://cognitiveservices.azure.com/.default'); \
  print('✓ Azure authentication working')"
```

---

## Common Issues

### Frontend: "API URL not defined"

**Problem**: `NEXT_PUBLIC_API_URL` not set

**Solution**:
1. Create `.env.local` from `.env.example`
2. Restart Next.js dev server: `npm run dev`
3. Variables must start with `NEXT_PUBLIC_`

### Backend: "DefaultAzureCredential failed"

**Problem**: Azure authentication not configured

**Solution** (choose one):
- **Local dev**: Run `az login`
- **Production**: Set service principal variables or enable managed identity
- **Verify**: Run `az account show`

### Voice: "WebSocket connection failed"

**Problem**: `NEXT_PUBLIC_WS_URL` incorrect or backend not running

**Solution**:
1. Check backend is running: `curl http://localhost:8172/health`
2. Verify WS URL matches backend port (default: 8172)
3. For production, use `wss://` not `ws://`

### CORS Errors

**Problem**: Frontend origin not allowed by backend

**Solution**:
Update `CORS_ORIGINS` in `backend/.env`:
```bash
CORS_ORIGINS=http://localhost:3847,https://yourdomain.com
```

---

## Security Best Practices

### ✅ DO

- ✅ Use `.env.local` for frontend (automatically ignored by git)
- ✅ Use `backend/.env` for backend (should be in `.gitignore`)
- ✅ Use AAD authentication (not API keys)
- ✅ Use managed identity in Azure
- ✅ Rotate service principal secrets regularly
- ✅ Use different credentials per environment
- ✅ Set restrictive CORS origins in production

### ❌ DON'T

- ❌ Commit `.env` or `.env.local` files
- ❌ Share credentials in chat/email
- ❌ Use production credentials in development
- ❌ Hardcode credentials in code
- ❌ Use `CORS_ORIGINS=*` in production
- ❌ Expose `NEXT_PUBLIC_` variables with secrets

---

## Environment Variables Reference

### Frontend Variables (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8172
NEXT_PUBLIC_WS_URL=ws://localhost:8172
NEXT_PUBLIC_VOICE_ENABLED=true
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME=Sage Retirement Planning
NEXT_PUBLIC_MOCK_MODE=false
NEXT_PUBLIC_MOCK_DELAY=1000
NEXT_PUBLIC_DEBUG=false
```

### Backend Variables (backend/.env)

```bash
# Azure OpenAI
PROJECT_ENDPOINT=https://your-project.openai.azure.com
MODEL_DEPLOYMENT_NAME=gpt-4

# Azure Voice Live
AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime-preview
VOICE_DEFAULT_VOICE=alloy
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=700
VOICE_SAMPLE_RATE=24000

# AAD Authentication (optional - uses DefaultAzureCredential)
# AZURE_CLIENT_ID=
# AZURE_TENANT_ID=
# AZURE_CLIENT_SECRET=

# Server
PORT=8172
CORS_ORIGINS=http://localhost:3847
ENVIRONMENT=development

# WebSocket
WS_MAX_CONNECTIONS=100
WS_CONNECTION_TIMEOUT=300

# Storage
STORAGE_PATH=./data

# Logging
LOG_LEVEL=INFO
```

---

## Quick Setup

1. **Frontend**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Backend**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your values
   ```

3. **Azure CLI** (for local dev):
   ```bash
   az login
   ```

4. **Verify**:
   ```bash
   # Backend health
   curl http://localhost:8172/health

   # Voice health
   curl http://localhost:8172/ws/voice/health
   ```

---

## Related Documentation

- [Quick Start Guide](./quickstart.md) - Getting started
- [Voice Setup Guide](./voice/setup.md) - Voice mode configuration
- [Voice Authentication](./voice/authentication.md) - AAD authentication details
- [Deployment Guide](./deployment.md) - Production deployment
