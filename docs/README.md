# Sage Retirement Planning - Documentation Index

Welcome to the Sage Retirement Planning documentation. This index helps you find the right documentation for your needs.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Voice Mode](#voice-mode)
- [Backend](#backend)
- [Deployment](#deployment)
- [Environment Configuration](#environment-configuration)

---

## Getting Started

### Quick Start Guide
**📄 [docs/quickstart.md](./quickstart.md)**

The fastest way to get Sage Retirement Planning running locally:
- Prerequisites and installation
- Local development setup
- Running the application
- Basic usage

**Best for**: First-time users, developers setting up locally

---

## Voice Mode

Voice mode allows users to speak with the AI assistant and receive audio responses using Azure Voice Live (gpt-4o-realtime).

### Setup Guide
**📄 [docs/voice/setup.md](./voice/setup.md)**

Complete setup instructions for voice mode:
- Azure configuration steps
- Backend and frontend setup
- Environment variables
- Testing voice functionality
- Troubleshooting common issues

**Best for**: Developers implementing or debugging voice features

### Authentication Guide
**📄 [docs/voice/authentication.md](./voice/authentication.md)**

Azure Active Directory (AAD) authentication for voice mode:
- AAD authentication vs API keys
- Local development with Azure CLI
- Production setup with Service Principal
- Managed Identity for Azure hosting
- Token management and troubleshooting

**Best for**: DevOps engineers, security-conscious developers

### Implementation Details
**📄 [docs/voice/implementation.md](./voice/implementation.md)**

Technical implementation summary:
- Architecture decisions
- Component structure
- File organization
- Development status
- Next steps

**Best for**: Developers understanding the voice implementation

---

## Backend

### Backend README
**📄 [docs/backend/README.md](./backend/README.md)**

Backend-specific documentation:
- FastAPI server setup
- Azure AI Agents integration
- API endpoints
- Development workflow

**Best for**: Backend developers

### Agent Evaluation
**📄 [docs/backend/agent-evaluation.md](./backend/agent-evaluation.md)**

AI agent evaluation system:
- Evaluation metrics
- Running evaluations
- Interpreting results
- Best practices

**Best for**: ML engineers, quality assurance

---

## Deployment

### Deployment Guide
**📄 [docs/deployment.md](./deployment.md)**

Production deployment instructions:
- Azure App Service deployment
- Container deployment
- Environment configuration
- CI/CD setup
- Monitoring and logging

**Best for**: DevOps engineers, deployment

---

## Environment Configuration

### Configuration Guide
**📄 [docs/environment-configuration.md](./environment-configuration.md)**

Comprehensive guide to all environment variables:
- Frontend configuration (`.env.local`)
- Backend configuration (`backend/.env`)
- Authentication options (Azure CLI, Service Principal, Managed Identity)
- Environment-specific setups (dev, staging, production)
- Validation and troubleshooting
- Security best practices

**Best for**: All developers, DevOps engineers

### Frontend Environment Variables
**📄 [.env.example](../.env.example)**

Frontend (Next.js) configuration:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_WS_URL` - WebSocket URL for voice
- `NEXT_PUBLIC_VOICE_ENABLED` - Enable/disable voice mode
- Feature flags and build configuration

**Location**: Root directory `.env.example`
**Usage**: Copy to `.env.local` and configure

### Backend Environment Variables
**📄 [backend/.env.example](../backend/.env.example)**

Backend (FastAPI) configuration:
- Azure OpenAI configuration
- AAD authentication settings
- Voice Live API configuration
- WebSocket settings
- Server and storage configuration

**Location**: `backend/.env.example`
**Usage**: Copy to `backend/.env` and configure

---

## Architecture Overview

```
Sage Retirement Planning
├── Frontend (Next.js 15.2 + React 19)
│   ├── Client Portal - Retirement planning chat
│   ├── Advisor Portal - Regulatory guidance
│   └── Voice Mode - Real-time voice chat
│
├── Backend (FastAPI + Python)
│   ├── Azure AI Agents - Chat intelligence
│   ├── Voice API - WebSocket voice sessions
│   └── Storage - Conversation persistence
│
└── Azure Services
    ├── Azure OpenAI - GPT-4 models
    ├── Azure Voice Live - gpt-4o-realtime
    └── AAD - Authentication
```

---

## Quick Reference

### Development Commands

```bash
# Frontend
npm run dev          # Start development server (port 3847)
npm run build        # Build for production
npm run start        # Start production server

# Backend
cd backend
uv run python main.py  # Start FastAPI server (port 8172)
```

### Azure CLI Commands

```bash
# Login to Azure
az login

# Check authentication
az account show

# Test token for Cognitive Services
python -c "from azure.identity import DefaultAzureCredential; \
  cred = DefaultAzureCredential(); \
  token = cred.get_token('https://cognitiveservices.azure.com/.default'); \
  print('Token acquired')"
```

### Health Check Endpoints

```bash
# Backend API health
curl http://localhost:8172/health

# Voice service health
curl http://localhost:8172/ws/voice/health
```

---

## Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Quick Start | ✅ Complete | 2024-02-13 |
| Voice Setup | ✅ Complete | 2024-02-13 |
| Voice Authentication | ✅ Complete | 2024-02-13 |
| Voice Implementation | ✅ Complete | 2024-02-13 |
| Backend README | ✅ Complete | 2024-01-XX |
| Agent Evaluation | ✅ Complete | 2024-01-XX |
| Deployment | ✅ Complete | 2024-01-XX |
| Environment Config | ✅ Complete | 2024-02-13 |

---

## Contributing

When adding new documentation:

1. **Place in appropriate folder**:
   - Voice-related: `docs/voice/`
   - Backend-specific: `docs/backend/`
   - General: `docs/`

2. **Update this index** with:
   - Link to new document
   - Brief description
   - Target audience

3. **Format consistently**:
   - Use clear headings
   - Include code examples
   - Add troubleshooting sections
   - Date stamps for version control

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/sage-retirement-planning/issues)
- **Documentation Feedback**: Create an issue with label `documentation`
- **Voice Mode Issues**: See [troubleshooting section](./voice/setup.md#troubleshooting)

---

## Version

Documentation version: 1.0.0
Last updated: 2024-02-13
Application version: See [package.json](../package.json)
