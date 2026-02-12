"""
Storage layer for Advisor and Admin entities.
Extends the existing LocalStorage pattern for new entity types.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

from models import (
    AdvisorProfile,
    AdminProfile,
    AdvisorNote,
    EscalationTicket,
    Appointment,
    AvailabilitySlot,
    ComplianceReviewItem,
    RegulatoryRule,
    ExtendedClientProfile,
    EscalationStatus,
    ClientStatus,
)


class AdvisorStorage:
    """Storage backend for advisor-related entities."""
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = Path(__file__).parent / "data"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def _load_json(self, filename: str) -> List[Dict]:
        """Load JSON array from file."""
        file_path = self.data_dir / filename
        if not file_path.exists():
            return []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Handle both array and object formats
                if isinstance(data, list):
                    return data
                return data.get("items", [])
        except (json.JSONDecodeError, IOError):
            return []
    
    def _save_json(self, filename: str, data: List[Dict]) -> None:
        """Save JSON array to file."""
        file_path = self.data_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    # ─── Advisors ────────────────────────────────────────────────────────────
    
    async def get_advisors(self) -> List[AdvisorProfile]:
        """Get all advisors."""
        data = self._load_json("advisors.json")
        return [AdvisorProfile(**a) for a in data]
    
    async def get_advisor(self, advisor_id: str) -> Optional[AdvisorProfile]:
        """Get advisor by ID."""
        advisors = await self.get_advisors()
        return next((a for a in advisors if a.id == advisor_id), None)
    
    async def save_advisor(self, advisor: AdvisorProfile) -> str:
        """Save or update advisor."""
        data = self._load_json("advisors.json")
        advisor.updated_at = datetime.utcnow().isoformat()
        advisor_dict = advisor.model_dump()
        
        existing_idx = next(
            (i for i, a in enumerate(data) if a.get("id") == advisor.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = advisor_dict
        else:
            data.append(advisor_dict)
        
        self._save_json("advisors.json", data)
        return advisor.id
    
    async def delete_advisor(self, advisor_id: str) -> bool:
        """Delete advisor."""
        data = self._load_json("advisors.json")
        original_len = len(data)
        data = [a for a in data if a.get("id") != advisor_id]
        if len(data) < original_len:
            self._save_json("advisors.json", data)
            return True
        return False
    
    # ─── Admins ──────────────────────────────────────────────────────────────
    
    async def get_admins(self) -> List[AdminProfile]:
        """Get all admins."""
        data = self._load_json("admins.json")
        return [AdminProfile(**a) for a in data]
    
    async def get_admin(self, admin_id: str) -> Optional[AdminProfile]:
        """Get admin by ID."""
        admins = await self.get_admins()
        return next((a for a in admins if a.id == admin_id), None)
    
    async def save_admin(self, admin: AdminProfile) -> str:
        """Save or update admin."""
        data = self._load_json("admins.json")
        admin.updated_at = datetime.utcnow().isoformat()
        admin_dict = admin.model_dump()
        
        existing_idx = next(
            (i for i, a in enumerate(data) if a.get("id") == admin.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = admin_dict
        else:
            data.append(admin_dict)
        
        self._save_json("admins.json", data)
        return admin.id
    
    # ─── Clients (Extended) ──────────────────────────────────────────────────
    
    async def get_clients_for_advisor(self, advisor_id: str) -> List[ExtendedClientProfile]:
        """Get all clients assigned to an advisor."""
        data = self._load_json("user_profiles.json")
        clients = []
        for c in data:
            if c.get("advisor_id") == advisor_id:
                clients.append(ExtendedClientProfile(**c))
        return clients
    
    async def get_client(self, client_id: str) -> Optional[ExtendedClientProfile]:
        """Get client by ID."""
        data = self._load_json("user_profiles.json")
        for c in data:
            if c.get("id") == client_id:
                return ExtendedClientProfile(**c)
        return None
    
    async def get_all_clients(self) -> List[ExtendedClientProfile]:
        """Get all clients."""
        data = self._load_json("user_profiles.json")
        return [ExtendedClientProfile(**c) for c in data]
    
    async def update_client(self, client: ExtendedClientProfile) -> str:
        """Update client profile."""
        data = self._load_json("user_profiles.json")
        client.updated_at = datetime.utcnow().isoformat()
        client_dict = client.model_dump()
        
        existing_idx = next(
            (i for i, c in enumerate(data) if c.get("id") == client.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = client_dict
        else:
            data.append(client_dict)
        
        self._save_json("user_profiles.json", data)
        return client.id
    
    # ─── Advisor Notes ───────────────────────────────────────────────────────
    
    async def get_notes_for_client(self, advisor_id: str, client_id: str) -> List[AdvisorNote]:
        """Get all notes for a client from an advisor."""
        data = self._load_json("advisor_notes.json")
        notes = []
        for n in data:
            if n.get("advisor_id") == advisor_id and n.get("client_id") == client_id:
                notes.append(AdvisorNote(**n))
        # Sort by pinned first, then by created_at descending
        notes.sort(key=lambda x: (not x.is_pinned, x.created_at), reverse=True)
        return notes
    
    async def get_note(self, note_id: str) -> Optional[AdvisorNote]:
        """Get note by ID."""
        data = self._load_json("advisor_notes.json")
        for n in data:
            if n.get("id") == note_id:
                return AdvisorNote(**n)
        return None
    
    async def save_note(self, note: AdvisorNote) -> str:
        """Save or update note."""
        data = self._load_json("advisor_notes.json")
        note.updated_at = datetime.utcnow().isoformat()
        note_dict = note.model_dump()
        
        existing_idx = next(
            (i for i, n in enumerate(data) if n.get("id") == note.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = note_dict
        else:
            data.append(note_dict)
        
        self._save_json("advisor_notes.json", data)
        return note.id
    
    async def delete_note(self, note_id: str) -> bool:
        """Delete note."""
        data = self._load_json("advisor_notes.json")
        original_len = len(data)
        data = [n for n in data if n.get("id") != note_id]
        if len(data) < original_len:
            self._save_json("advisor_notes.json", data)
            return True
        return False
    
    # ─── Escalations ─────────────────────────────────────────────────────────
    
    async def get_escalations_for_advisor(self, advisor_id: str) -> List[EscalationTicket]:
        """Get all escalations for an advisor."""
        data = self._load_json("escalations.json")
        escalations = []
        for e in data:
            if e.get("advisor_id") == advisor_id:
                escalations.append(EscalationTicket(**e))
        # Sort by priority and created_at
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        escalations.sort(key=lambda x: (priority_order.get(x.priority.value, 2), x.created_at))
        return escalations
    
    async def get_pending_escalations(self, advisor_id: str) -> List[EscalationTicket]:
        """Get pending escalations for an advisor."""
        all_escalations = await self.get_escalations_for_advisor(advisor_id)
        return [e for e in all_escalations if e.status in [EscalationStatus.PENDING, EscalationStatus.IN_PROGRESS]]
    
    async def get_escalations_for_client(self, client_id: str) -> List[EscalationTicket]:
        """Get all escalations for a client."""
        data = self._load_json("escalations.json")
        return [EscalationTicket(**e) for e in data if e.get("client_id") == client_id]
    
    async def get_escalation(self, escalation_id: str) -> Optional[EscalationTicket]:
        """Get escalation by ID."""
        data = self._load_json("escalations.json")
        for e in data:
            if e.get("id") == escalation_id:
                return EscalationTicket(**e)
        return None
    
    async def save_escalation(self, escalation: EscalationTicket) -> str:
        """Save or update escalation."""
        data = self._load_json("escalations.json")
        escalation_dict = escalation.model_dump()
        
        existing_idx = next(
            (i for i, e in enumerate(data) if e.get("id") == escalation.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = escalation_dict
        else:
            data.append(escalation_dict)
        
        self._save_json("escalations.json", data)
        return escalation.id
    
    # ─── Appointments ────────────────────────────────────────────────────────
    
    async def get_appointments_for_advisor(self, advisor_id: str) -> List[Appointment]:
        """Get all appointments for an advisor."""
        data = self._load_json("appointments.json")
        appointments = []
        for a in data:
            if a.get("advisor_id") == advisor_id:
                appointments.append(Appointment(**a))
        appointments.sort(key=lambda x: x.scheduled_at)
        return appointments
    
    async def get_appointments_for_client(self, client_id: str) -> List[Appointment]:
        """Get all appointments for a client."""
        data = self._load_json("appointments.json")
        return [Appointment(**a) for a in data if a.get("client_id") == client_id]
    
    async def get_appointment(self, appointment_id: str) -> Optional[Appointment]:
        """Get appointment by ID."""
        data = self._load_json("appointments.json")
        for a in data:
            if a.get("id") == appointment_id:
                return Appointment(**a)
        return None
    
    async def save_appointment(self, appointment: Appointment) -> str:
        """Save or update appointment."""
        data = self._load_json("appointments.json")
        appointment.updated_at = datetime.utcnow().isoformat()
        appointment_dict = appointment.model_dump()
        
        existing_idx = next(
            (i for i, a in enumerate(data) if a.get("id") == appointment.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = appointment_dict
        else:
            data.append(appointment_dict)
        
        self._save_json("appointments.json", data)
        return appointment.id
    
    async def delete_appointment(self, appointment_id: str) -> bool:
        """Delete appointment."""
        data = self._load_json("appointments.json")
        original_len = len(data)
        data = [a for a in data if a.get("id") != appointment_id]
        if len(data) < original_len:
            self._save_json("appointments.json", data)
            return True
        return False
    
    # ─── Availability ────────────────────────────────────────────────────────
    
    async def get_availability(self, advisor_id: str) -> List[AvailabilitySlot]:
        """Get availability slots for an advisor."""
        data = self._load_json("availability.json")
        return [AvailabilitySlot(**s) for s in data if s.get("advisor_id") == advisor_id]
    
    async def save_availability(self, slot: AvailabilitySlot) -> str:
        """Save or update availability slot."""
        data = self._load_json("availability.json")
        slot_dict = slot.model_dump()
        
        existing_idx = next(
            (i for i, s in enumerate(data) if s.get("id") == slot.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = slot_dict
        else:
            data.append(slot_dict)
        
        self._save_json("availability.json", data)
        return slot.id
    
    # ─── Compliance ──────────────────────────────────────────────────────────
    
    async def get_compliance_queue(self, status: Optional[str] = None) -> List[ComplianceReviewItem]:
        """Get compliance review queue."""
        data = self._load_json("compliance_reviews.json")
        items = [ComplianceReviewItem(**c) for c in data]
        if status:
            items = [i for i in items if i.status.value == status]
        items.sort(key=lambda x: (x.risk_level.value != "high", x.created_at))
        return items
    
    async def get_compliance_item(self, item_id: str) -> Optional[ComplianceReviewItem]:
        """Get compliance item by ID."""
        data = self._load_json("compliance_reviews.json")
        for c in data:
            if c.get("id") == item_id:
                return ComplianceReviewItem(**c)
        return None
    
    async def save_compliance_item(self, item: ComplianceReviewItem) -> str:
        """Save or update compliance item."""
        data = self._load_json("compliance_reviews.json")
        item_dict = item.model_dump()
        
        existing_idx = next(
            (i for i, c in enumerate(data) if c.get("id") == item.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = item_dict
        else:
            data.append(item_dict)
        
        self._save_json("compliance_reviews.json", data)
        return item.id
    
    # ─── Regulatory Rules ────────────────────────────────────────────────────
    
    async def get_regulatory_rules(self, jurisdiction: Optional[str] = None) -> List[RegulatoryRule]:
        """Get regulatory rules, optionally filtered by jurisdiction."""
        data = self._load_json("regulatory_rules.json")
        rules = [RegulatoryRule(**r) for r in data if r.get("is_active", True)]
        if jurisdiction:
            rules = [r for r in rules if r.jurisdiction.value == jurisdiction]
        return rules
    
    async def get_regulatory_rule(self, rule_id: str) -> Optional[RegulatoryRule]:
        """Get regulatory rule by ID."""
        data = self._load_json("regulatory_rules.json")
        for r in data:
            if r.get("id") == rule_id:
                return RegulatoryRule(**r)
        return None
    
    async def save_regulatory_rule(self, rule: RegulatoryRule) -> str:
        """Save or update regulatory rule."""
        data = self._load_json("regulatory_rules.json")
        rule.updated_at = datetime.utcnow().isoformat()
        rule_dict = rule.model_dump()
        
        existing_idx = next(
            (i for i, r in enumerate(data) if r.get("id") == rule.id),
            None
        )
        
        if existing_idx is not None:
            data[existing_idx] = rule_dict
        else:
            data.append(rule_dict)
        
        self._save_json("regulatory_rules.json", data)
        return rule.id
    
    # ─── Dashboard Metrics ───────────────────────────────────────────────────
    
    async def get_advisor_dashboard_metrics(self, advisor_id: str) -> Dict[str, Any]:
        """Calculate dashboard metrics for an advisor."""
        clients = await self.get_clients_for_advisor(advisor_id)
        escalations = await self.get_pending_escalations(advisor_id)
        appointments = await self.get_appointments_for_advisor(advisor_id)
        
        # Calculate AUM
        total_aum = sum(c.investment_assets + c.current_cash for c in clients)
        
        # Count by status
        status_counts = {"healthy": 0, "needs_attention": 0, "critical": 0}
        for c in clients:
            status_counts[c.status.value] = status_counts.get(c.status.value, 0) + 1
        
        # Count by risk
        risk_counts = {"low": 0, "medium": 0, "high": 0}
        for c in clients:
            risk_counts[c.risk_appetite] = risk_counts.get(c.risk_appetite, 0) + 1
        
        # Today's appointments
        today = datetime.utcnow().date().isoformat()
        today_appts = [a for a in appointments if a.scheduled_at.startswith(today)]
        
        # Upcoming appointments (next 7 days)
        from datetime import timedelta
        week_from_now = (datetime.utcnow() + timedelta(days=7)).isoformat()
        upcoming_appts = [a for a in appointments 
                         if a.scheduled_at >= datetime.utcnow().isoformat() 
                         and a.scheduled_at <= week_from_now]
        
        return {
            "total_aum": total_aum,
            "client_count": len(clients),
            "clients_by_status": status_counts,
            "clients_by_risk": risk_counts,
            "pending_escalations": len(escalations),
            "upcoming_appointments": len(upcoming_appts),
            "today_appointments": len(today_appts),
        }


# Global instance
advisor_storage = AdvisorStorage()
