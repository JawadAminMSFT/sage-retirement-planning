# Azure Active Directory (AAD) Authentication for Voice Mode

## Summary

The voice mode implementation now uses **Azure Active Directory (AAD) authentication** instead of API keys for enhanced security and better Azure integration.

## Changes Made

### 1. **Backend Code** (`backend/voice/realtime_client.py`)

**Removed:**
- `api_key` parameter from constructor
- API key-based authentication

**Added:**
- `azure.identity.DefaultAzureCredential` for AAD authentication
- Automatic token acquisition and refresh
- Token caching with 5-minute refresh buffer
- Support for multiple authentication methods

### 2. **Authentication Methods Supported**

`DefaultAzureCredential` automatically tries these methods in order:

1. **Environment Variables** (Service Principal):
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_SECRET`

2. **Managed Identity** (when running in Azure):
   - Automatically used for App Services, Container Apps, VMs, etc.
   - No configuration needed

3. **Azure CLI** (for local development):
   - Uses credentials from `az login`
   - Perfect for developer workstations

4. **Visual Studio Code** credentials

5. **Azure PowerShell** credentials

### 3. **Environment Configuration Changes**

**Before (API Key):**
```bash
AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_REALTIME_API_KEY=your-api-key-here  # ❌ Removed
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime
```

**After (AAD):**
```bash
AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime

# For production (Service Principal):
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_SECRET=your-client-secret

# For local dev: No variables needed (use Azure CLI)
# For Azure hosting: No variables needed (use Managed Identity)
```

## Benefits of AAD Authentication

### 1. **Security**
- ✅ No API keys stored in code or config files
- ✅ Automatic token rotation (tokens expire after 1 hour)
- ✅ Role-Based Access Control (RBAC) via Azure roles
- ✅ Audit logs in Azure AD

### 2. **Compliance**
- ✅ Meets enterprise security requirements
- ✅ Supports Zero Trust architecture
- ✅ Centralized identity management

### 3. **Flexibility**
- ✅ Same code works in development and production
- ✅ Easy local development with Azure CLI
- ✅ Seamless Azure deployment with Managed Identity
- ✅ No credential rotation needed for managed identities

### 4. **Best Practices**
- ✅ Follows Microsoft's recommended authentication pattern
- ✅ Works with all Azure services
- ✅ Production-ready approach

## Setup Instructions

### Local Development (Quickest)

1. Install Azure CLI:
   ```bash
   # Windows (using winget)
   winget install Microsoft.AzureCLI

   # macOS
   brew install azure-cli

   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. Login to Azure:
   ```bash
   az login
   ```

3. Install Python dependency:
   ```bash
   cd backend
   uv add azure-identity
   ```

4. Set environment variables (only endpoint needed):
   ```bash
   AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
   VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime
   ```

5. Run backend:
   ```bash
   uv run python main.py
   ```

**That's it!** DefaultAzureCredential will automatically use your Azure CLI credentials.

### Production Deployment

#### Option A: Service Principal (Recommended)

1. Create service principal:
   ```bash
   az ad sp create-for-rbac --name "sage-voice-sp" \
     --role "Cognitive Services OpenAI User" \
     --scopes /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource>
   ```

2. Set environment variables from output:
   ```bash
   AZURE_CLIENT_ID=<appId from output>
   AZURE_TENANT_ID=<tenant from output>
   AZURE_CLIENT_SECRET=<password from output>
   AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
   VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime
   ```

#### Option B: Managed Identity (Best for Azure hosting)

1. Enable managed identity on your Azure resource (App Service, Container App, etc.)

2. Assign role to managed identity:
   ```bash
   az role assignment create \
     --assignee <managed-identity-principal-id> \
     --role "Cognitive Services OpenAI User" \
     --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource>
   ```

3. Set only these environment variables:
   ```bash
   AZURE_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
   VOICE_MODEL_DEPLOYMENT=gpt-4o-realtime
   ```

**No credentials needed!** Managed identity is automatically detected.

## Required Azure Role

All authentication methods require the identity to have this role:

```bash
az role assignment create \
  --assignee <principal-id or email> \
  --role "Cognitive Services OpenAI User" \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource>
```

## Token Management

The implementation automatically handles:

- ✅ **Token acquisition** on first connection
- ✅ **Token caching** for performance
- ✅ **Automatic refresh** when token expires
- ✅ **Token validation** before each request
- ✅ **5-minute refresh buffer** (refreshes token if it expires within 5 minutes)

## Troubleshooting

### Error: "DefaultAzureCredential failed to retrieve a token"

**Solution 1**: Verify Azure CLI login
```bash
az account show
```

**Solution 2**: Check service principal credentials
```bash
# Test credentials
az login --service-principal \
  -u $AZURE_CLIENT_ID \
  -p $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID
```

**Solution 3**: Verify managed identity is enabled
```bash
az webapp identity show --name <app-name> --resource-group <rg>
```

### Error: "Insufficient permissions"

Check role assignment:
```bash
az role assignment list \
  --assignee <principal-id or email> \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource>
```

Assign role if missing:
```bash
az role assignment create \
  --assignee <principal-id or email> \
  --role "Cognitive Services OpenAI User" \
  --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<resource>
```

### Error: "Token expired"

The implementation automatically refreshes tokens, but if you see this:

1. Check system time is correct
2. Verify network connectivity to Azure AD
3. Check token cache: tokens expire after 1 hour

## Migration from API Keys

If you were using API keys before:

1. **Remove** `AZURE_REALTIME_API_KEY` from `.env`
2. **Install** azure-identity: `uv add azure-identity`
3. **Choose** authentication method (Azure CLI for dev, Managed Identity for prod)
4. **Verify** role assignment: "Cognitive Services OpenAI User"
5. **Test** token acquisition
6. **Deploy**

No code changes needed - just configuration!

## References

- [DefaultAzureCredential Documentation](https://learn.microsoft.com/python/api/azure-identity/azure.identity.defaultazurecredential)
- [Azure OpenAI Authentication](https://learn.microsoft.com/azure/ai-services/openai/how-to/managed-identity)
- [Azure RBAC for Cognitive Services](https://learn.microsoft.com/azure/ai-services/openai/how-to/role-based-access-control)
- [Managed Identity Overview](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
