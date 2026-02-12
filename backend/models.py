"""
Extended data models for Advisor and Admin views.
Supports multi-persona (Client, Advisor, Admin) with 1:1 client-advisor relationships.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


# ─── Enums ───────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    CLIENT = "client"
    ADVISOR = "advisor"
    ADMIN = "admin"


class Jurisdiction(str, Enum):
    US = "US"
    CA = "CA"


class ClientStatus(str, Enum):
    HEALTHY = "healthy"
    NEEDS_ATTENTION = "needs_attention"
    CRITICAL = "critical"


class RiskAppetite(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EscalationReason(str, Enum):
    USER_REQUESTED = "user_requested"
    AI_COMPLEXITY = "ai_complexity"
    REGULATORY_QUESTION = "regulatory_question"
    HIGH_VALUE_DECISION = "high_value_decision"


class EscalationStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ESCALATED_TO_COMPLIANCE = "escalated_to_compliance"


class EscalationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ResolutionType(str, Enum):
    ANSWERED = "answered"
    MEETING_SCHEDULED = "meeting_scheduled"
    REFERRED_OUT = "referred_out"
    NO_ACTION_NEEDED = "no_action_needed"


class MeetingType(str, Enum):
    INITIAL_CONSULTATION = "initial_consultation"
    PERIODIC_REVIEW = "periodic_review"
    ESCALATION_FOLLOWUP = "escalation_followup"
    SCENARIO_PLANNING = "scenario_planning"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class NoteCategory(str, Enum):
    GENERAL = "general"
    RISK_OBSERVATION = "risk_observation"
    OPPORTUNITY = "opportunity"
    COMPLIANCE = "compliance"
    FOLLOWUP = "followup"


class AdminPermission(str, Enum):
    MANAGE_PRODUCTS = "manage_products"
    REVIEW_COMPLIANCE = "review_compliance"
    MANAGE_USERS = "manage_users"
    VIEW_ANALYTICS = "view_analytics"


class ComplianceStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_MODIFICATION = "needs_modification"


class ComplianceSourceType(str, Enum):
    CHAT_RESPONSE = "chat_response"
    SCENARIO_PROJECTION = "scenario_projection"
    ADVISOR_NOTE = "advisor_note"
    ESCALATION_RESOLUTION = "escalation_resolution"


class RegulatoryCategory(str, Enum):
    CONTRIBUTION_LIMITS = "contribution_limits"
    WITHDRAWAL_RULES = "withdrawal_rules"
    TAX_TREATMENT = "tax_treatment"
    GOVERNMENT_BENEFITS = "government_benefits"
    AGE_REQUIREMENTS = "age_requirements"


class AccountType(str, Enum):
    # US accounts
    TRADITIONAL_401K = "401k"
    ROTH_401K = "roth_401k"
    TRADITIONAL_IRA = "traditional_ira"
    ROTH_IRA = "roth_ira"
    BROKERAGE = "brokerage"
    HSA = "hsa"
    # Canadian accounts
    RRSP = "rrsp"
    TFSA = "tfsa"
    RRIF = "rrif"
    RESP = "resp"
    NON_REGISTERED = "non_registered"


# ─── Base Models ─────────────────────────────────────────────────────────────

class BaseUser(BaseModel):
    """Base user model for all personas."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: UserRole
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Advisor Models ──────────────────────────────────────────────────────────

class AdvisorProfile(BaseUser):
    """Financial advisor profile."""
    role: UserRole = UserRole.ADVISOR
    license_number: Optional[str] = None
    jurisdictions: List[Jurisdiction] = [Jurisdiction.US]
    specializations: List[str] = []
    bio: Optional[str] = None
    
    # Computed at runtime
    client_count: Optional[int] = None
    total_aum: Optional[float] = None


class AdvisorDashboardMetrics(BaseModel):
    """Aggregated metrics for advisor dashboard."""
    total_aum: float
    client_count: int
    clients_by_status: Dict[str, int]  # healthy, needs_attention, critical
    clients_by_risk: Dict[str, int]    # low, medium, high
    pending_escalations: int
    upcoming_appointments: int
    today_appointments: int


class AdvisorNote(BaseModel):
    """Advisor-only notes on a client."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    advisor_id: str
    client_id: str
    content: str
    category: NoteCategory = NoteCategory.GENERAL
    is_pinned: bool = False
    related_conversation_id: Optional[str] = None
    related_scenario_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Admin Models ────────────────────────────────────────────────────────────

class AdminProfile(BaseUser):
    """System administrator profile."""
    role: UserRole = UserRole.ADMIN
    permissions: List[AdminPermission] = [
        AdminPermission.MANAGE_PRODUCTS,
        AdminPermission.REVIEW_COMPLIANCE,
        AdminPermission.MANAGE_USERS,
        AdminPermission.VIEW_ANALYTICS,
    ]


class ComplianceReviewItem(BaseModel):
    """AI advice flagged for compliance review."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_type: ComplianceSourceType
    source_id: str
    user_id: str
    
    ai_response: str
    context: str
    
    auto_flagged: bool = False
    flag_reason: Optional[str] = None
    risk_level: EscalationPriority = EscalationPriority.LOW
    
    status: ComplianceStatus = ComplianceStatus.PENDING
    reviewer_id: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class RegulatoryRule(BaseModel):
    """Regulatory rule for US or Canada."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    jurisdiction: Jurisdiction
    category: RegulatoryCategory
    
    title: str
    description: str
    current_values: Dict[str, Any]  # e.g., {"2026_limit": 23500}
    
    account_types: List[AccountType] = []
    age_requirements: Optional[Dict[str, int]] = None  # {"min": 50, "max": None}
    income_requirements: Optional[Dict[str, float]] = None
    
    effective_date: str
    source_url: Optional[str] = None
    last_verified: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    is_active: bool = True
    updated_by: str = "system"
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Escalation Models ───────────────────────────────────────────────────────

class EscalationTicket(BaseModel):
    """Escalation from client to advisor."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    advisor_id: str
    source_conversation_id: Optional[str] = None
    
    reason: EscalationReason
    trigger_message: Optional[str] = None
    ai_confidence_score: Optional[float] = None
    
    context_summary: str
    client_question: str
    suggested_response: Optional[str] = None
    
    status: EscalationStatus = EscalationStatus.PENDING
    priority: EscalationPriority = EscalationPriority.MEDIUM
    
    resolution_notes: Optional[str] = None
    resolution_type: Optional[ResolutionType] = None
    
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    acknowledged_at: Optional[str] = None
    resolved_at: Optional[str] = None


# ─── Appointment Models ──────────────────────────────────────────────────────

class PreMeetingBrief(BaseModel):
    """AI-generated pre-meeting brief."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    appointment_id: str
    
    client_summary: str
    financial_snapshot: Dict[str, Any]
    recent_activity: Dict[str, Any]
    suggested_topics: List[str]
    regulatory_considerations: List[str]
    
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Appointment(BaseModel):
    """Scheduled meeting between client and advisor."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    advisor_id: str
    
    scheduled_at: str
    duration_minutes: int = 30
    timezone: str = "America/New_York"
    
    meeting_type: MeetingType = MeetingType.PERIODIC_REVIEW
    related_escalation_id: Optional[str] = None
    agenda: Optional[str] = None
    
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    
    pre_meeting_brief: Optional[PreMeetingBrief] = None
    post_meeting_notes: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AvailabilitySlot(BaseModel):
    """Advisor availability slot."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    advisor_id: str
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str   # "09:00"
    end_time: str     # "17:00"
    is_available: bool = True


# ─── Extended Client Profile ─────────────────────────────────────────────────

class ExtendedClientProfile(BaseModel):
    """Client profile with advisor relationship fields."""
    # Original fields
    id: str
    name: str
    age: int
    current_cash: float
    investment_assets: float
    yearly_savings_rate: float
    salary: float
    portfolio: Dict[str, float]
    risk_appetite: str
    target_retire_age: int
    target_monthly_income: float
    description: Optional[str] = None
    
    # Extended fields for advisor system
    email: Optional[str] = None
    advisor_id: Optional[str] = None
    jurisdiction: Jurisdiction = Jurisdiction.US
    escalation_enabled: bool = True
    last_advisor_interaction: Optional[str] = None
    status: ClientStatus = ClientStatus.HEALTHY
    
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── API Response Models ─────────────────────────────────────────────────────

class AdvisorListResponse(BaseModel):
    """Response for listing advisors."""
    advisors: List[AdvisorProfile]


class AdminListResponse(BaseModel):
    """Response for listing admins."""
    admins: List[AdminProfile]


class ClientListResponse(BaseModel):
    """Response for advisor's client list."""
    clients: List[ExtendedClientProfile]
    total_count: int


class EscalationListResponse(BaseModel):
    """Response for escalation queue."""
    escalations: List[EscalationTicket]
    pending_count: int


class AppointmentListResponse(BaseModel):
    """Response for appointment list."""
    appointments: List[Appointment]
