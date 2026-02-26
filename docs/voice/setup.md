# Voice Mode Setup Guide

This guide walks you through setting up Azure Voice Live integration for voice chat in both the client and advisor portals.

## Prerequisites

1. **Azure OpenAI Resource** with gpt-4o-realtime model deployment
2. **Azure Subscription** with appropriate permissions
3. **Node.js** 18+ and **Python** 3.10+
4. **Modern Browser** with microphone support (Chrome, Safari, Firefox, Edge)

---

## Part 1: Azure Configuration

### Step 1: Deploy gpt-4o-realtime Model

1. Go to [Azure OpenAI Studio](https://oai.azure.com/)
2. Navigate to **Deployments** → **Create new deployment**
3. Select the **gpt-4o-realtime** model
4. Choose a deployment name (e.g., `gpt-4o-realtime`)
5. Set capacity limits as needed
6. Click **Create**

### Step 2: Configure Azure Active Directory (AAD) Authentication

**The voice integration uses AAD authentication instead of API keys for better security.**

#### Option A: Local Development (Azure CLI) - Recommended for Dev

1. Install [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
2. Login to Azure:
   ```bash
   az login
   ```
3. Set your subscription (if you have multiple):
   ```bash
   az account set --subscription "your-subscription-id"
   ```
4. Verify your identity:
   ```bash
   az account show
   ```

#### Option B: Service Principal (Production)

1. Create a service principal:
   ```bash
   az ad sp create-for-rbac --name "sage-voice-sp" --role "Cognitive Services OpenAI User" \
     --scopes /subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.CognitiveServices/accounts/<resource-name>
   ```

2. Save the output (you'll need these for environment variables):
   - `appId` → `AZURE_CLIENT_ID`
   - `tenant` → `AZURE_TENANT_ID`
   - `password` → `AZURE_CLIENT_SECRET`

#### Option C: Managed Identity (When running in Azure)

1. Enable system-assigned managed identity on your Azure resource (App Service, Container App, VM, etc.)
2. Assign the "Cognitive Services OpenAI User" role to the managed identity:
   ```bash
   az role assignment create \
     --assignee <managed-identity-principal-id> \
     --role "Cognitive Services OpenAI User" \
     --scope /subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.CognitiveServices/accounts/<resource-name>
   ```

3. No environment variables needed - DefaultAzureCredential will automatically use the managed identity

### Step 3: Assign Required Azure Role

Ensure the identity (user, service principal, or managed identity) has the correct role:

```bash
az role assignment create \
  --assignee <principal-id or user-email> \
  --role "Cognitive Services OpenAI User" \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg-name>/providers/Microsoft.CognitiveServices/accounts/<resource-name>
```

You can also assign at resource group level:
```bash
az role assignment create \
  --assignee <principal-id or user-email> \
  --role "Cognitive Services OpenAI User" \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg-name>
```

### Step 4: Configure CORS for WebSocket

1. In Azure Portal, go to your **Azure OpenAI resource**
2. Navigate to **Resource Management** → **CORS**
3. Add allowed origins:
   - Development: `http://localhost:3847`
   - Production: `https://your-production-domain.com`
4. Enable: `GET`, `POST`, `OPTIONS`
5. Click **Save**

---

## Part 2: Backend Setup

### Step 1: Install Dependencies

```bash
cd backend
uv add websockets
uv add azure-identity  # For AAD authentication
```

For Azure Voice Live SDK (placeholder - check for official package):
```bash
# When available:
# uv add azure-ai-realtime
```

**Note**: The current implementation includes placeholder code for Azure Voice Live API. You'll need to integrate the actual Azure SDK once officially released.

### Step 2: Configure Environment Variables

Copy the voice configuration template:

```bash
cp .env.voice.example .env
```

Edit `.env` and configure:

#### For Local Development (Azure CLI):
```bash
# Azure Voice Live Configuration
AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime
VOICE_DEFAULT_VOICE=alloy
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=700
VOICE_SAMPLE_RATE=24000

# No AAD variables needed - will use Azure CLI credentials
```

#### For Production (Service Principal):
```bash
# Azure Voice Live Configuration
AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime
VOICE_DEFAULT_VOICE=alloy

# AAD Service Principal
AZURE_CLIENT_ID=your-client-id-from-step-2
AZURE_TENANT_ID=your-tenant-id-from-step-2
AZURE_CLIENT_SECRET=your-client-secret-from-step-2

# Voice Settings
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=700
VOICE_SAMPLE_RATE=24000
```

#### For Azure Hosting (Managed Identity):
```bash
# Azure Voice Live Configuration
AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime
VOICE_DEFAULT_VOICE=alloy
VOICE_VAD_THRESHOLD=0.5
VOICE_SILENCE_DURATION_MS=700
VOICE_SAMPLE_RATE=24000

# No AAD variables needed - will use managed identity automatically
```

### Step 3: Verify AAD Authentication

Test that your Azure credentials work:

```bash
cd backend

# Verify Azure CLI login (for local dev)
az account show

# Test token acquisition (optional)
python -c "from azure.identity import DefaultAzureCredential; cred = DefaultAzureCredential(); token = cred.get_token('https://cognitiveservices.azure.com/.default'); print('Token acquired successfully')"
```

### Step 4: Start Backend Server

```bash
cd backend
uv run python main.py
```

Verify voice routes are registered:
```bash
curl http://localhost:8172/ws/voice/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "voice",
  "active_sessions": 0,
  "timestamp": "2024-..."
}
```

---

## Part 3: Frontend Setup

### Step 1: Configure Environment Variables

Copy the voice configuration template:

```bash
cp .env.local.voice.example .env.local
```

Edit `.env.local`:

```bash
# Voice Mode Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:8172
NEXT_PUBLIC_VOICE_ENABLED=true
```

### Step 2: Start Frontend

```bash
npm run dev
```

The frontend should be available at `http://localhost:3847`

---

## Part 4: Testing Voice Mode

### Test in Client Portal

1. Open `http://localhost:3847`
2. Select a user profile
3. Click the **microphone button** (left side of chat input)
4. **Allow microphone permission** when prompted
5. Speak into your microphone
6. AI should respond with audio
7. Voice transcripts appear in chat history

### Test in Advisor Portal

1. Navigate to the Advisor view (URL varies by setup)
2. Click the **microphone button**
3. Ask a regulatory question (e.g., "What are the 2026 401k limits?")
4. AI provides spoken response with citations

### Verify Features

- [ ] Microphone button appears in both portals
- [ ] Button color matches persona (emerald for client, indigo for advisor)
- [ ] Chat bar transforms to waveform when voice is active
- [ ] Waveform animates with audio level
- [ ] Can hear AI audio responses
- [ ] Voice transcripts saved to conversation history
- [ ] Can switch between voice and text modes
- [ ] Can interrupt AI mid-response (click mic again)

---

## Troubleshooting

### Issue: Microphone Permission Denied

**Solution**:
- Chrome: Settings → Privacy → Site Settings → Microphone → Allow
- Safari: Safari → Preferences → Websites → Microphone → Allow
- Firefox: about:preferences#privacy → Permissions → Microphone → Settings

### Issue: WebSocket Connection Failed

**Symptoms**: Voice button doesn't activate, console shows WebSocket errors

**Solutions**:
1. Verify backend is running: `curl http://localhost:8172/ws/voice/health`
2. Check `NEXT_PUBLIC_WS_URL` in `.env.local` matches backend port (8172)
3. Ensure firewall allows WebSocket connections

### Issue: No Audio Playback

**Solutions**:
1. Check browser console for audio errors
2. Verify audio output device in system settings
3. Try clicking on the page first (browsers require user gesture for audio)
4. On iOS Safari, ensure "Silent Mode" is off

### Issue: Azure API Errors

**Symptoms**: Console shows 401/403 errors

**Solutions**:
1. Verify `AZURE_REALTIME_API_KEY` is correct
2. Check API key hasn't expired
3. Ensure gpt-4o-realtime deployment exists
4. Verify CORS is configured correctly

### Issue: High Latency (> 2 seconds)

**Solutions**:
1. Check Azure region (use closest to users)
2. Verify network connection quality
3. Reduce `VOICE_VAD_THRESHOLD` for faster turn detection
4. Lower `VOICE_SILENCE_DURATION_MS` for quicker responses

### Issue: Waveform Not Animating

**Solutions**:
1. Check browser DevTools console for errors
2. Verify `audioLevel` prop is updating in React DevTools
3. Clear browser cache and reload
4. Try different browser (Canvas API compatibility)

---

## Browser Compatibility

| Browser | Version | Voice Input | Audio Playback | Waveform | Notes |
|---------|---------|-------------|----------------|----------|-------|
| Chrome | 90+ | ✅ | ✅ | ✅ | Best performance |
| Safari | 14+ | ✅ | ✅ | ✅ | Requires user gesture for AudioContext |
| Firefox | 88+ | ✅ | ✅ | ✅ | Fully supported |
| Edge | 90+ | ✅ | ✅ | ✅ | Chromium-based, same as Chrome |
| Mobile Chrome | Latest | ✅ | ✅ | ✅ | Android 8+ |
| Mobile Safari | iOS 14+ | ⚠️ | ✅ | ✅ | Must resume AudioContext on gesture |

---

## Production Deployment

### Backend

1. **Environment Variables**:
   ```bash
   AZURE_REALTIME_ENDPOINT=https://prod-resource.openai.azure.com
   AZURE_REALTIME_API_KEY=<production-key>
   WS_MAX_CONNECTIONS=500  # Scale as needed
   ```

2. **WebSocket over TLS**:
   - Ensure your backend supports WSS (WebSocket Secure)
   - Configure SSL certificate

3. **Scaling**:
   - Each WebSocket connection maintains state
   - Consider sticky sessions for load balancing
   - Monitor active sessions: `GET /ws/voice/sessions`

### Frontend

1. **Environment Variables**:
   ```bash
   NEXT_PUBLIC_WS_URL=wss://your-domain.com
   NEXT_PUBLIC_VOICE_ENABLED=true
   ```

2. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

3. **CDN Considerations**:
   - WebSocket connections bypass CDN
   - Configure CDN to pass through `/ws/*` paths

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Voice Session Metrics**:
   - Active sessions: `GET /ws/voice/sessions`
   - Average session duration
   - Success/error rate

2. **Audio Quality**:
   - Latency (user speech → AI response)
   - Transcript accuracy
   - Audio dropouts/glitches

3. **User Behavior**:
   - Voice vs text usage ratio
   - Interruption frequency
   - Session abandonment rate

### Logging

Backend logs voice events:
```python
# In session_manager.py
print(f"Voice session started: {session_id}")
print(f"Turn saved - User: '{user_transcript}', Assistant: '{assistant_transcript}'")
```

Add structured logging in production:
```python
import logging
logger = logging.getLogger("voice")
logger.info("voice_turn_complete", extra={
    "session_id": session_id,
    "user_transcript": user_transcript,
    "duration_ms": duration_ms
})
```

---

## Security Considerations

1. **WebSocket Authentication**:
   - Current implementation: JWT token in query parameter
   - Add authentication middleware in production

2. **Rate Limiting**:
   - Limit: 1 concurrent session per user
   - Hourly limit: 10 sessions per user
   - Implement in `routes.py`

3. **Audio Privacy**:
   - Audio streams only, never stored on disk
   - Transcripts stored in conversation history (encrypted at rest)
   - GDPR compliance: allow users to delete voice conversations

4. **Input Validation**:
   - Validate audio format (PCM16, 24kHz)
   - Check audio chunk size limits
   - Sanitize user transcripts before storage

---

## Cost Optimization

### Azure OpenAI Pricing

- gpt-4o-realtime charges per audio minute
- Monitor usage: Azure Cost Management
- Set budget alerts

### Optimization Strategies

1. **Efficient Turn Detection**:
   - Tune `VOICE_VAD_THRESHOLD` to reduce false positives
   - Optimize `VOICE_SILENCE_DURATION_MS`

2. **Session Lifecycle**:
   - Auto-close inactive sessions after timeout
   - Implement session cleanup

3. **Caching**:
   - Cache common regulatory responses (advisor portal)
   - Reduce redundant API calls

---

## Next Steps

1. **Conversation History Integration**:
   - Voice turns already save to storage
   - Add voice badge/icon in message display
   - Implement voice message search

2. **Advanced Features**:
   - Multi-language support
   - Custom voice selection per user
   - Voice speed control
   - Voice-to-text fallback mode

3. **Testing**:
   - Write unit tests for audio processing
   - Integration tests for WebSocket protocol
   - Load testing (50+ concurrent sessions)

---

## Support

### Documentation

- [Azure OpenAI Voice API Docs](https://learn.microsoft.com/azure/ai-services/openai/)
- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebSocket API MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

### Common Issues

- Check backend logs: `backend/logs/voice.log`
- Browser console: Enable verbose logging
- Network tab: Inspect WebSocket frames

### Getting Help

- Review implementation plan: `~/.claude/plans/cheeky-dancing-dewdrop.md`
- Check backend health: `http://localhost:8172/ws/voice/health`
- Verify environment config: `.env` and `.env.local`

---

## Architecture Reference

```
┌─────────────┐               ┌──────────────┐               ┌─────────────────┐
│   Browser   │               │   FastAPI    │               │  Azure Voice    │
│             │  WebSocket    │   Backend    │   Azure SDK   │      Live       │
│  Microphone ├──────────────►│              ├──────────────►│  gpt-4o-realtime│
│             │   PCM16       │  Session Mgr │   PCM16       │                 │
│  Speakers   │◄──────────────┤              │◄──────────────┤                 │
│             │   Audio       │  Voice Routes│   Audio       │                 │
└─────────────┘               └──────────────┘               └─────────────────┘
       │                              │
       │         Transcript           │
       ▼                              ▼
┌─────────────┐               ┌──────────────┐
│  Conversation│               │   Storage    │
│   History   │◄──────────────┤   (Cosmos)   │
│   Display   │               │              │
└─────────────┘               └──────────────┘
```

---

## Changelog

- **v1.0.0** (2024-02-13): Initial voice mode implementation
  - Azure Voice Live integration
  - WebSocket-based bidirectional streaming
  - Dual-portal support (client + advisor)
  - Waveform visualization
  - Conversation history integration
