"""
Storage abstraction layer for conversations and scenarios.
Supports local JSON storage and Azure Blob Storage.
"""

import os
import json
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid


# ─── Data Models ─────────────────────────────────────────────────────────────

class ConversationMessage(BaseModel):
    """A single message in a conversation."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Conversation(BaseModel):
    """A conversation with the Sage AI assistant."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = "New Conversation"
    messages: List[ConversationMessage] = []
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SavedScenario(BaseModel):
    """A saved What-If scenario projection."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    timeframe_months: int
    projection_result: Dict[str, Any]
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Storage Interface ───────────────────────────────────────────────────────

class StorageBackend(ABC):
    """Abstract storage backend interface."""
    
    @abstractmethod
    async def save_conversation(self, conversation: Conversation) -> str:
        """Save a conversation. Returns the conversation ID."""
        pass
    
    @abstractmethod
    async def get_conversation(self, user_id: str, conversation_id: str) -> Optional[Conversation]:
        """Get a specific conversation by ID."""
        pass
    
    @abstractmethod
    async def list_conversations(self, user_id: str) -> List[Conversation]:
        """List all conversations for a user."""
        pass
    
    @abstractmethod
    async def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        """Delete a conversation. Returns True if successful."""
        pass
    
    @abstractmethod
    async def save_scenario(self, scenario: SavedScenario) -> str:
        """Save a scenario. Returns the scenario ID."""
        pass
    
    @abstractmethod
    async def get_scenario(self, user_id: str, scenario_id: str) -> Optional[SavedScenario]:
        """Get a specific scenario by ID."""
        pass
    
    @abstractmethod
    async def list_scenarios(self, user_id: str) -> List[SavedScenario]:
        """List all scenarios for a user."""
        pass
    
    @abstractmethod
    async def delete_scenario(self, user_id: str, scenario_id: str) -> bool:
        """Delete a scenario. Returns True if successful."""
        pass


# ─── Local JSON Storage ──────────────────────────────────────────────────────

class LocalStorage(StorageBackend):
    """Local JSON file storage backend."""
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = Path(__file__).parent / "data" / "user_data"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_user_dir(self, user_id: str) -> Path:
        """Get or create user-specific directory."""
        user_dir = self.data_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir
    
    def _get_conversations_file(self, user_id: str) -> Path:
        """Get path to user's conversations file."""
        return self._get_user_dir(user_id) / "conversations.json"
    
    def _get_scenarios_file(self, user_id: str) -> Path:
        """Get path to user's scenarios file."""
        return self._get_user_dir(user_id) / "scenarios.json"
    
    def _load_json(self, file_path: Path) -> List[Dict]:
        """Load JSON array from file."""
        if not file_path.exists():
            return []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    
    def _save_json(self, file_path: Path, data: List[Dict]) -> None:
        """Save JSON array to file."""
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    # ── Conversations ──
    
    async def save_conversation(self, conversation: Conversation) -> str:
        file_path = self._get_conversations_file(conversation.user_id)
        conversations = self._load_json(file_path)
        
        # Update existing or add new
        conversation.updated_at = datetime.utcnow().isoformat()
        conv_dict = conversation.model_dump()
        
        existing_idx = next(
            (i for i, c in enumerate(conversations) if c.get("id") == conversation.id),
            None
        )
        
        if existing_idx is not None:
            conversations[existing_idx] = conv_dict
        else:
            conversations.append(conv_dict)
        
        self._save_json(file_path, conversations)
        return conversation.id
    
    async def get_conversation(self, user_id: str, conversation_id: str) -> Optional[Conversation]:
        file_path = self._get_conversations_file(user_id)
        conversations = self._load_json(file_path)
        
        for conv in conversations:
            if conv.get("id") == conversation_id:
                return Conversation(**conv)
        return None
    
    async def list_conversations(self, user_id: str) -> List[Conversation]:
        file_path = self._get_conversations_file(user_id)
        conversations = self._load_json(file_path)
        
        # Sort by updated_at descending
        conversations.sort(key=lambda c: c.get("updated_at", ""), reverse=True)
        return [Conversation(**c) for c in conversations]
    
    async def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        file_path = self._get_conversations_file(user_id)
        conversations = self._load_json(file_path)
        
        original_len = len(conversations)
        conversations = [c for c in conversations if c.get("id") != conversation_id]
        
        if len(conversations) < original_len:
            self._save_json(file_path, conversations)
            return True
        return False
    
    # ── Scenarios ──
    
    async def save_scenario(self, scenario: SavedScenario) -> str:
        file_path = self._get_scenarios_file(scenario.user_id)
        scenarios = self._load_json(file_path)
        
        scenario_dict = scenario.model_dump()
        
        existing_idx = next(
            (i for i, s in enumerate(scenarios) if s.get("id") == scenario.id),
            None
        )
        
        if existing_idx is not None:
            scenarios[existing_idx] = scenario_dict
        else:
            scenarios.append(scenario_dict)
        
        self._save_json(file_path, scenarios)
        return scenario.id
    
    async def get_scenario(self, user_id: str, scenario_id: str) -> Optional[SavedScenario]:
        file_path = self._get_scenarios_file(user_id)
        scenarios = self._load_json(file_path)
        
        for scenario in scenarios:
            if scenario.get("id") == scenario_id:
                return SavedScenario(**scenario)
        return None
    
    async def list_scenarios(self, user_id: str) -> List[SavedScenario]:
        file_path = self._get_scenarios_file(user_id)
        scenarios = self._load_json(file_path)
        
        # Sort by created_at descending
        scenarios.sort(key=lambda s: s.get("created_at", ""), reverse=True)
        return [SavedScenario(**s) for s in scenarios]
    
    async def delete_scenario(self, user_id: str, scenario_id: str) -> bool:
        file_path = self._get_scenarios_file(user_id)
        scenarios = self._load_json(file_path)
        
        original_len = len(scenarios)
        scenarios = [s for s in scenarios if s.get("id") != scenario_id]
        
        if len(scenarios) < original_len:
            self._save_json(file_path, scenarios)
            return True
        return False


# ─── Azure Blob Storage ──────────────────────────────────────────────────────

class AzureBlobStorage(StorageBackend):
    """Azure Blob Storage backend."""
    
    def __init__(self, connection_string: str = None, container_name: str = "sage-user-data"):
        self.connection_string = connection_string or os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = container_name
        self._client = None
        self._container = None
    
    def _get_client(self):
        """Lazy initialization of blob client."""
        if self._client is None:
            try:
                from azure.storage.blob import BlobServiceClient
                self._client = BlobServiceClient.from_connection_string(self.connection_string)
                self._container = self._client.get_container_client(self.container_name)
                # Create container if it doesn't exist
                try:
                    self._container.create_container()
                except Exception:
                    pass  # Container already exists
            except ImportError:
                raise ImportError("azure-storage-blob is required for Azure Blob Storage. Install with: pip install azure-storage-blob")
        return self._container
    
    def _get_blob_path(self, user_id: str, data_type: str) -> str:
        """Get blob path for user data."""
        return f"{user_id}/{data_type}.json"
    
    async def _load_blob(self, user_id: str, data_type: str) -> List[Dict]:
        """Load JSON array from blob."""
        container = self._get_client()
        blob_path = self._get_blob_path(user_id, data_type)
        
        try:
            blob_client = container.get_blob_client(blob_path)
            data = blob_client.download_blob().readall()
            return json.loads(data)
        except Exception:
            return []
    
    async def _save_blob(self, user_id: str, data_type: str, data: List[Dict]) -> None:
        """Save JSON array to blob."""
        container = self._get_client()
        blob_path = self._get_blob_path(user_id, data_type)
        
        blob_client = container.get_blob_client(blob_path)
        blob_client.upload_blob(
            json.dumps(data, indent=2, ensure_ascii=False),
            overwrite=True
        )
    
    # ── Conversations ──
    
    async def save_conversation(self, conversation: Conversation) -> str:
        conversations = await self._load_blob(conversation.user_id, "conversations")
        
        conversation.updated_at = datetime.utcnow().isoformat()
        conv_dict = conversation.model_dump()
        
        existing_idx = next(
            (i for i, c in enumerate(conversations) if c.get("id") == conversation.id),
            None
        )
        
        if existing_idx is not None:
            conversations[existing_idx] = conv_dict
        else:
            conversations.append(conv_dict)
        
        await self._save_blob(conversation.user_id, "conversations", conversations)
        return conversation.id
    
    async def get_conversation(self, user_id: str, conversation_id: str) -> Optional[Conversation]:
        conversations = await self._load_blob(user_id, "conversations")
        
        for conv in conversations:
            if conv.get("id") == conversation_id:
                return Conversation(**conv)
        return None
    
    async def list_conversations(self, user_id: str) -> List[Conversation]:
        conversations = await self._load_blob(user_id, "conversations")
        conversations.sort(key=lambda c: c.get("updated_at", ""), reverse=True)
        return [Conversation(**c) for c in conversations]
    
    async def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        conversations = await self._load_blob(user_id, "conversations")
        original_len = len(conversations)
        conversations = [c for c in conversations if c.get("id") != conversation_id]
        
        if len(conversations) < original_len:
            await self._save_blob(user_id, "conversations", conversations)
            return True
        return False
    
    # ── Scenarios ──
    
    async def save_scenario(self, scenario: SavedScenario) -> str:
        scenarios = await self._load_blob(scenario.user_id, "scenarios")
        
        scenario_dict = scenario.model_dump()
        
        existing_idx = next(
            (i for i, s in enumerate(scenarios) if s.get("id") == scenario.id),
            None
        )
        
        if existing_idx is not None:
            scenarios[existing_idx] = scenario_dict
        else:
            scenarios.append(scenario_dict)
        
        await self._save_blob(scenario.user_id, "scenarios", scenarios)
        return scenario.id
    
    async def get_scenario(self, user_id: str, scenario_id: str) -> Optional[SavedScenario]:
        scenarios = await self._load_blob(user_id, "scenarios")
        
        for scenario in scenarios:
            if scenario.get("id") == scenario_id:
                return SavedScenario(**scenario)
        return None
    
    async def list_scenarios(self, user_id: str) -> List[SavedScenario]:
        scenarios = await self._load_blob(user_id, "scenarios")
        scenarios.sort(key=lambda s: s.get("created_at", ""), reverse=True)
        return [SavedScenario(**s) for s in scenarios]
    
    async def delete_scenario(self, user_id: str, scenario_id: str) -> bool:
        scenarios = await self._load_blob(user_id, "scenarios")
        original_len = len(scenarios)
        scenarios = [s for s in scenarios if s.get("id") != scenario_id]
        
        if len(scenarios) < original_len:
            await self._save_blob(user_id, "scenarios", scenarios)
            return True
        return False


# ─── Storage Factory ─────────────────────────────────────────────────────────

def get_storage_backend() -> StorageBackend:
    """
    Get the configured storage backend.
    
    Set STORAGE_BACKEND=azure to use Azure Blob Storage.
    Default is local JSON storage.
    """
    backend_type = os.environ.get("STORAGE_BACKEND", "local").lower()
    
    if backend_type == "azure":
        connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        if not connection_string:
            print("Warning: AZURE_STORAGE_CONNECTION_STRING not set, falling back to local storage")
            return LocalStorage()
        return AzureBlobStorage(connection_string)
    
    return LocalStorage()


# Global storage instance
storage = get_storage_backend()
