"""
Fabric Data Agent Service
═══════════════════════════════════════════════════════════════════════════════
Connects to a published Microsoft Fabric Data Agent via the OpenAI Assistants
API (compatible endpoint).  Uses a Service Principal (ClientSecretCredential)
in the Fabric tenant — completely isolated from the app's own AzureCliCredential.

Environment Variables Required:
  FABRIC_TENANT_ID            – AAD tenant ID hosting the Fabric capacity
  FABRIC_CLIENT_ID            – SPN application (client) ID registered in that tenant
  FABRIC_CLIENT_SECRET        – SPN client secret
  FABRIC_DATA_AGENT_URL       – Published Data Agent base URL
                                 (e.g. https://<region>.fabric.microsoft.com/v1)
  FABRIC_DATA_AGENT_ID        – The assistant ID of the published Data Agent

Usage from main.py:
    from fabric_service import fabric_client, query_fabric_data_agent
    result = await query_fabric_data_agent("Show me Sarah Chen's portfolio")
"""

from __future__ import annotations

import os
import json
import time
import uuid
import asyncio
import logging
import warnings
from dataclasses import dataclass, field
from typing import Optional, Any, AsyncGenerator

import requests

# Suppress OpenAI Assistants API deprecation warnings
# (Fabric Data Agents don't support the newer Responses API yet)
warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    message=r".*Assistants API is deprecated.*"
)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("fabric_service")


# ─── Configuration ────────────────────────────────────────────────────────────

@dataclass
class FabricConfig:
    """Resolved from environment variables at startup."""
    tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""
    data_agent_url: str = ""
    data_agent_id: str = ""
    # Token cache
    _token: Optional[str] = field(default=None, repr=False)
    _token_expiry: float = field(default=0.0, repr=False)

    @property
    def is_configured(self) -> bool:
        return all([
            self.tenant_id,
            self.client_id,
            self.client_secret,
            self.data_agent_url,
            self.data_agent_id,
        ])

    @property
    def has_spn_credentials(self) -> bool:
        return all([self.tenant_id, self.client_id, self.client_secret])


def _load_config() -> FabricConfig:
    return FabricConfig(
        tenant_id=os.getenv("FABRIC_TENANT_ID", ""),
        client_id=os.getenv("FABRIC_CLIENT_ID", ""),
        client_secret=os.getenv("FABRIC_CLIENT_SECRET", ""),
        data_agent_url=os.getenv("FABRIC_DATA_AGENT_URL", ""),
        data_agent_id=os.getenv("FABRIC_DATA_AGENT_ID", ""),
    )


# ─── Token Management ────────────────────────────────────────────────────────

def _get_bearer_token(cfg: FabricConfig) -> str:
    """
    Acquire an AAD token for the Fabric / Power BI API scope using the SPN.
    Caches the token until 5 minutes before expiry.
    """
    now = time.time()
    if cfg._token and cfg._token_expiry > now + 300:
        return cfg._token

    from azure.identity import ClientSecretCredential  # lazy import

    credential = ClientSecretCredential(
        tenant_id=cfg.tenant_id,
        client_id=cfg.client_id,
        client_secret=cfg.client_secret,
    )
    # Fabric Data Agent APIs use the Fabric resource scope
    token_result = credential.get_token("https://api.fabric.microsoft.com/.default")
    cfg._token = token_result.token
    cfg._token_expiry = token_result.expires_on
    logger.info("Fabric SPN token acquired (expires in %d s)", int(cfg._token_expiry - now))
    return cfg._token


# ─── OpenAI Assistants Client Wrapper ─────────────────────────────────────────

class FabricDataAgentClient:
    """
    Thin wrapper around the OpenAI Python SDK pointed at the Fabric Data Agent
    published URL.  The Data Agent exposes an OpenAI Assistants-compatible API.
    """

    def __init__(self, config: FabricConfig):
        self.config = config
        self._client = None

    def _ensure_client(self):
        """Lazily create (or refresh) the OpenAI client with a fresh token."""
        from openai import OpenAI  # lazy import

        token = _get_bearer_token(self.config)
        # Re-create client with Bearer token auth + Fabric-specific headers
        self._client = OpenAI(
            api_key="",  # Not used — we use Bearer token in headers
            base_url=self.config.data_agent_url,
            default_query={"api-version": "2024-05-01-preview"},
            default_headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
                "ActivityId": str(uuid.uuid4()),
            },
        )
        return self._client

    def _create_fabric_thread(self, thread_name: str | None = None) -> dict:
        """
        Create a thread using Fabric's private endpoint.

        The Fabric Data Agent requires threads to be created via a special
        /__private/aiassistant/threads/fabric endpoint rather than the standard
        OpenAI POST /threads endpoint.
        """
        token = _get_bearer_token(self.config)
        url = self.config.data_agent_url

        if thread_name is None:
            thread_name = f"sage-{uuid.uuid4()}"

        # Build Fabric private thread URL
        if "aiskills" in url:
            base = url.replace("aiskills", "dataagents").removesuffix("/openai").replace(
                "/aiassistant", "/__private/aiassistant"
            )
        else:
            base = url.removesuffix("/openai").replace(
                "/aiassistant", "/__private/aiassistant"
            )

        thread_url = f'{base}/threads/fabric?tag="{thread_name}"'

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "ActivityId": str(uuid.uuid4()),
        }

        resp = requests.get(thread_url, headers=headers, timeout=30)
        resp.raise_for_status()
        thread = resp.json()
        thread["name"] = thread_name
        logger.debug("Fabric thread created: %s", thread.get("id"))
        return thread

    # ── Synchronous query (runs in thread pool from async) ──────────────

    def query_sync(self, question: str, *, timeout: float = 60) -> dict:
        """
        Send a question to the Fabric Data Agent and wait for the response.

        Returns:
            {
                "answer": str,            # Natural-language answer
                "sql_query": str | None,  # SQL generated (if any)
                "data": list | None,      # Tabular data returned (if any)
                "thread_id": str,
            }
        """
        client = self._ensure_client()

        # 1. Create thread via Fabric-specific private endpoint
        thread = self._create_fabric_thread()
        thread_id = thread["id"]

        try:
            # 2. Create an assistant handle (Fabric ignores model param)
            assistant = client.beta.assistants.create(model="not used")

            # 3. Add user message
            client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=question,
            )

            # 4. Create a run and poll until completed
            run = client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=assistant.id,
            )

            start = time.time()
            while run.status in ("queued", "in_progress"):
                if time.time() - start > timeout:
                    raise TimeoutError(f"Fabric Data Agent run timed out after {timeout}s")
                time.sleep(2)
                run = client.beta.threads.runs.retrieve(
                    thread_id=thread_id,
                    run_id=run.id,
                )

            if run.status == "failed":
                error_msg = getattr(run, "last_error", None)
                raise RuntimeError(f"Fabric Data Agent run failed: {error_msg or run.status}")

            # 5. Retrieve assistant messages
            messages = client.beta.threads.messages.list(
                thread_id=thread_id, order="asc"
            )

            answer = ""
            sql_query = None
            data = None

            for msg in messages.data:
                if msg.role == "assistant":
                    for block in msg.content:
                        if block.type == "text":
                            text = block.text.value
                            # Attempt to parse structured response
                            try:
                                parsed = json.loads(text)
                                if isinstance(parsed, dict):
                                    answer = parsed.get("answer", text)
                                    sql_query = parsed.get("sql_query")
                                    data = parsed.get("data")
                                else:
                                    answer = text
                            except json.JSONDecodeError:
                                answer = text
                    break  # Only the first assistant message

            return {
                "answer": answer,
                "sql_query": sql_query,
                "data": data,
                "thread_id": thread_id,
            }

        finally:
            # 6. Cleanup thread
            try:
                client.beta.threads.delete(thread_id)
            except Exception:
                pass  # best-effort

    # ── Async wrapper ───────────────────────────────────────────────────

    async def query(self, question: str, *, timeout: float = 60) -> dict:
        """Async wrapper — runs the sync query in a thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.query_sync(question, timeout=timeout),
        )

    # ── Streaming query (SSE-compatible) ────────────────────────────────

    async def query_stream(
        self, question: str, *, timeout: float = 60
    ) -> AsyncGenerator[dict, None]:
        """
        Stream-style interface.  Yields SSE-compatible dicts:
          {"type": "status", "data": {...}}
          {"type": "content", "data": {"text": "..."}}
          {"type": "complete", "data": {...}}
        """
        yield {
            "type": "status",
            "data": {"status": "Querying Fabric Data Agent..."},
            "timestamp": time.time(),
        }

        try:
            result = await self.query(question, timeout=timeout)

            yield {
                "type": "content",
                "data": {"text": result["answer"]},
                "timestamp": time.time(),
            }

            yield {
                "type": "complete",
                "data": {
                    "text": result["answer"],
                    "sql_query": result.get("sql_query"),
                    "fabric_data": result.get("data"),
                    "source": "fabric",
                },
                "timestamp": time.time(),
            }

        except Exception as e:
            logger.exception("Fabric Data Agent query failed")
            yield {
                "type": "error",
                "data": {"error": str(e), "source": "fabric"},
                "timestamp": time.time(),
            }

    # ── Health check ────────────────────────────────────────────────────

    def health_check(self) -> dict:
        """Quick connectivity / token check with granular status."""
        has_spn = self.config.has_spn_credentials
        has_agent = bool(self.config.data_agent_url and self.config.data_agent_id)

        if not has_spn:
            return {
                "status": "not_configured",
                "message": (
                    "Fabric SPN credentials not set. "
                    "Set FABRIC_TENANT_ID, FABRIC_CLIENT_ID, and FABRIC_CLIENT_SECRET."
                ),
            }

        # SPN creds exist — try acquiring a token
        try:
            _get_bearer_token(self.config)
        except Exception as e:
            return {
                "status": "error",
                "message": f"SPN token acquisition failed: {e}",
            }

        if not has_agent:
            return {
                "status": "spn_ok_agent_pending",
                "message": (
                    "SPN authentication works. "
                    "Set FABRIC_DATA_AGENT_URL and FABRIC_DATA_AGENT_ID "
                    "after publishing the Data Agent in Fabric."
                ),
            }

        return {
            "status": "ok",
            "message": "Fabric SPN token acquired successfully.",
            "data_agent_url": self.config.data_agent_url,
        }


# ─── Module-level singleton ──────────────────────────────────────────────────

_config = _load_config()
fabric_client = FabricDataAgentClient(_config)

FABRIC_AVAILABLE = _config.is_configured

if FABRIC_AVAILABLE:
    logger.info(
        "Fabric Data Agent configured — URL=%s  Agent=%s",
        _config.data_agent_url,
        _config.data_agent_id,
    )
else:
    logger.warning(
        "Fabric Data Agent NOT configured (missing env vars). "
        "Live-Fabric mode will be unavailable."
    )


# ─── Helper: build enriched prompt from Fabric data ──────────────────────────

def build_fabric_enriched_prompt(
    user_question: str,
    fabric_result: dict,
    original_profile: Optional[dict] = None,
) -> str:
    """
    Combine the user's question with data retrieved from Fabric into a prompt
    that can be fed to the main Azure AI Agent for analysis.
    """
    parts = [
        "The following client/portfolio data was retrieved from the Fabric Data Agent:\n",
    ]

    if fabric_result.get("data"):
        parts.append("=== Retrieved Data ===")
        parts.append(json.dumps(fabric_result["data"], indent=2))
        parts.append("=== End Data ===\n")

    if fabric_result.get("answer"):
        parts.append(f"Fabric Agent Summary: {fabric_result['answer']}\n")

    if original_profile:
        parts.append(f"Local Profile Context: {json.dumps(original_profile, default=str)}\n")

    parts.append(f"User Question: {user_question}")

    return "\n".join(parts)
