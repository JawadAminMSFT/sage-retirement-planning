"""
Advisor API Routes
FastAPI router for advisor-specific endpoints.
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from models import (
    AdvisorProfile,
    AdvisorDashboardMetrics,
    AdvisorNote,
    NoteCategory,
    ExtendedClientProfile,
    EscalationTicket,
    EscalationStatus,
    EscalationPriority,
    ResolutionType,
    Appointment,
    AppointmentStatus,
)
from advisor_storage import advisor_storage

router = APIRouter(prefix="/advisor", tags=["advisor"])


# ─── Request/Response Models ─────────────────────────────────────────────────

class AdvisorUpdateRequest(BaseModel):
    name: Optional[str] = None
    license_number: Optional[str] = None
    jurisdictions: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    bio: Optional[str] = None


class NoteCreateRequest(BaseModel):
    content: str
    category: NoteCategory = NoteCategory.GENERAL
    is_pinned: bool = False
    related_conversation_id: Optional[str] = None
    related_scenario_id: Optional[str] = None


class NoteUpdateRequest(BaseModel):
    content: Optional[str] = None
    category: Optional[NoteCategory] = None
    is_pinned: Optional[bool] = None


class EscalationUpdateRequest(BaseModel):
    status: Optional[EscalationStatus] = None
    priority: Optional[EscalationPriority] = None


class EscalationResolveRequest(BaseModel):
    resolution_type: ResolutionType
    resolution_notes: str


# ─── Advisor Profile Endpoints ───────────────────────────────────────────────

@router.get("/{advisor_id}", response_model=AdvisorProfile)
async def get_advisor(advisor_id: str):
    """Get advisor profile by ID."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    # Add computed fields
    clients = await advisor_storage.get_clients_for_advisor(advisor_id)
    advisor.client_count = len(clients)
    advisor.total_aum = sum(c.investment_assets + c.current_cash for c in clients)
    
    return advisor


@router.put("/{advisor_id}", response_model=AdvisorProfile)
async def update_advisor(advisor_id: str, update: AdvisorUpdateRequest):
    """Update advisor profile."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    # Apply updates
    if update.name is not None:
        advisor.name = update.name
    if update.license_number is not None:
        advisor.license_number = update.license_number
    if update.jurisdictions is not None:
        advisor.jurisdictions = update.jurisdictions
    if update.specializations is not None:
        advisor.specializations = update.specializations
    if update.bio is not None:
        advisor.bio = update.bio
    
    await advisor_storage.save_advisor(advisor)
    return advisor


@router.get("/{advisor_id}/dashboard", response_model=AdvisorDashboardMetrics)
async def get_advisor_dashboard(advisor_id: str):
    """Get dashboard metrics for an advisor."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    metrics = await advisor_storage.get_advisor_dashboard_metrics(advisor_id)
    return AdvisorDashboardMetrics(**metrics)


# ─── Client Management Endpoints ─────────────────────────────────────────────

@router.get("/{advisor_id}/clients", response_model=List[ExtendedClientProfile])
async def get_advisor_clients(
    advisor_id: str,
    status: Optional[str] = Query(None, description="Filter by status: healthy, needs_attention, critical"),
    risk: Optional[str] = Query(None, description="Filter by risk appetite: low, medium, high"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction: US, CA"),
    sort_by: Optional[str] = Query("name", description="Sort field: name, aum, status, age"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc, desc"),
):
    """Get all clients for an advisor with optional filtering and sorting."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    clients = await advisor_storage.get_clients_for_advisor(advisor_id)
    
    # Apply filters
    if status:
        clients = [c for c in clients if c.status.value == status]
    if risk:
        clients = [c for c in clients if c.risk_appetite == risk]
    if jurisdiction:
        clients = [c for c in clients if c.jurisdiction.value == jurisdiction]
    
    # Apply sorting
    def get_sort_key(client):
        if sort_by == "aum":
            return client.investment_assets + client.current_cash
        elif sort_by == "status":
            status_order = {"critical": 0, "needs_attention": 1, "healthy": 2}
            return status_order.get(client.status.value, 2)
        elif sort_by == "age":
            return client.age
        else:  # name
            return client.name.lower()
    
    reverse = sort_order == "desc"
    clients.sort(key=get_sort_key, reverse=reverse)
    
    return clients


@router.get("/{advisor_id}/clients/{client_id}", response_model=ExtendedClientProfile)
async def get_advisor_client(advisor_id: str, client_id: str):
    """Get detailed client profile."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    client = await advisor_storage.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.advisor_id != advisor_id:
        raise HTTPException(status_code=403, detail="Client not assigned to this advisor")
    
    return client


# ─── Advisor Notes Endpoints ─────────────────────────────────────────────────

@router.get("/{advisor_id}/clients/{client_id}/notes", response_model=List[AdvisorNote])
async def get_client_notes(
    advisor_id: str, 
    client_id: str,
    category: Optional[NoteCategory] = None,
):
    """Get all notes for a client."""
    # Verify access
    client = await advisor_storage.get_client(client_id)
    if not client or client.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Client not found or not assigned to advisor")
    
    notes = await advisor_storage.get_notes_for_client(advisor_id, client_id)
    
    if category:
        notes = [n for n in notes if n.category == category]
    
    return notes


@router.post("/{advisor_id}/clients/{client_id}/notes", response_model=AdvisorNote)
async def create_client_note(advisor_id: str, client_id: str, note_req: NoteCreateRequest):
    """Create a new note for a client."""
    # Verify access
    client = await advisor_storage.get_client(client_id)
    if not client or client.advisor_id != advisor_id:
        raise HTTPException(status_code=404, detail="Client not found or not assigned to advisor")
    
    note = AdvisorNote(
        advisor_id=advisor_id,
        client_id=client_id,
        content=note_req.content,
        category=note_req.category,
        is_pinned=note_req.is_pinned,
        related_conversation_id=note_req.related_conversation_id,
        related_scenario_id=note_req.related_scenario_id,
    )
    
    await advisor_storage.save_note(note)
    return note


@router.put("/{advisor_id}/notes/{note_id}", response_model=AdvisorNote)
async def update_note(advisor_id: str, note_id: str, update: NoteUpdateRequest):
    """Update an existing note."""
    note = await advisor_storage.get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.advisor_id != advisor_id:
        raise HTTPException(status_code=403, detail="Note does not belong to this advisor")
    
    if update.content is not None:
        note.content = update.content
    if update.category is not None:
        note.category = update.category
    if update.is_pinned is not None:
        note.is_pinned = update.is_pinned
    
    await advisor_storage.save_note(note)
    return note


@router.delete("/{advisor_id}/notes/{note_id}")
async def delete_note(advisor_id: str, note_id: str):
    """Delete a note."""
    note = await advisor_storage.get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.advisor_id != advisor_id:
        raise HTTPException(status_code=403, detail="Note does not belong to this advisor")
    
    success = await advisor_storage.delete_note(note_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete note")
    
    return {"message": "Note deleted successfully"}


# ─── Escalation Endpoints ────────────────────────────────────────────────────

@router.get("/{advisor_id}/escalations", response_model=List[EscalationTicket])
async def get_advisor_escalations(
    advisor_id: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
):
    """Get all escalations for an advisor."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    escalations = await advisor_storage.get_escalations_for_advisor(advisor_id)
    
    if status:
        escalations = [e for e in escalations if e.status.value == status]
    if priority:
        escalations = [e for e in escalations if e.priority.value == priority]
    
    return escalations


@router.get("/{advisor_id}/escalations/pending", response_model=List[EscalationTicket])
async def get_pending_escalations(advisor_id: str):
    """Get pending escalations for an advisor."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    return await advisor_storage.get_pending_escalations(advisor_id)


@router.put("/escalations/{escalation_id}", response_model=EscalationTicket)
async def update_escalation(escalation_id: str, update: EscalationUpdateRequest):
    """Update escalation status or priority."""
    escalation = await advisor_storage.get_escalation(escalation_id)
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    if update.status is not None:
        escalation.status = update.status
        if update.status == EscalationStatus.IN_PROGRESS and not escalation.acknowledged_at:
            escalation.acknowledged_at = datetime.utcnow().isoformat()
    
    if update.priority is not None:
        escalation.priority = update.priority
    
    await advisor_storage.save_escalation(escalation)
    return escalation


@router.put("/escalations/{escalation_id}/resolve", response_model=EscalationTicket)
async def resolve_escalation(escalation_id: str, resolution: EscalationResolveRequest):
    """Resolve an escalation."""
    escalation = await advisor_storage.get_escalation(escalation_id)
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    escalation.status = EscalationStatus.RESOLVED
    escalation.resolution_type = resolution.resolution_type
    escalation.resolution_notes = resolution.resolution_notes
    escalation.resolved_at = datetime.utcnow().isoformat()
    
    await advisor_storage.save_escalation(escalation)
    return escalation


# ─── Appointment Endpoints ───────────────────────────────────────────────────

@router.get("/{advisor_id}/appointments", response_model=List[Appointment])
async def get_advisor_appointments(
    advisor_id: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    upcoming_only: bool = Query(False, description="Only show future appointments"),
):
    """Get all appointments for an advisor."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    appointments = await advisor_storage.get_appointments_for_advisor(advisor_id)
    
    if status:
        appointments = [a for a in appointments if a.status.value == status]
    
    if upcoming_only:
        now = datetime.utcnow().isoformat()
        appointments = [a for a in appointments if a.scheduled_at >= now]
    
    return appointments


@router.get("/{advisor_id}/appointments/today", response_model=List[Appointment])
async def get_today_appointments(advisor_id: str):
    """Get today's appointments for an advisor."""
    advisor = await advisor_storage.get_advisor(advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    appointments = await advisor_storage.get_appointments_for_advisor(advisor_id)
    today = datetime.utcnow().date().isoformat()
    
    return [a for a in appointments if a.scheduled_at.startswith(today)]
