# 🏛️ Sage Advisor View — Implementation Specification

> **Version**: 1.0  
> **Last Updated**: February 11, 2026  
> **Status**: Approved for Implementation

---

## 📋 Executive Summary

This specification defines the implementation of an **Advisor View** for Sage, transforming it into a dual-persona platform with three distinct user types:

| Persona | Description |
|---------|-------------|
| **Client** | End users managing their retirement planning with AI assistance |
| **Advisor** | Financial advisors managing a book of clients with AI-powered insights |
| **Admin** | System administrators managing product catalog and compliance review |

### Key Design Decisions

- ✅ **1:1 Client-Advisor Relationship**: Each client has exactly one assigned advisor
- ✅ **Joint US/Canada Regulatory Support**: Tax rules, contribution limits, government programs
- ✅ **Admin View**: Product catalog management + AI compliance review
- ❌ **No White-labeling**: Single Sage brand
- ❌ **No Offline Access**: Online-only operation

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Client    │  │   Advisor    │  │    Admin     │  │    Shared    │     │
│  │     View     │  │     View     │  │     View     │  │  Components  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend (FastAPI)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Client     │  │   Advisor    │  │    Admin     │  │  Regulatory  │     │
│  │   Endpoints  │  │   Endpoints  │  │   Endpoints  │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     Azure AI Agent (Multi-Persona)                   │   │
│  │  • Client Agent Tools  • Advisor Agent Tools  • Regulatory Tools    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model

### Core Entities

```typescript
// ─── User Types ─────────────────────────────────────────────────────────────

type UserRole = 'client' | 'advisor' | 'admin'

interface BaseUser {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

// Client Profile (extends existing UserProfile)
interface ClientProfile extends BaseUser {
  role: 'client'
  advisor_id: string                    // 1:1 relationship
  jurisdiction: 'US' | 'CA'             // For regulatory rules
  
  // Financial data (existing)
  age: number
  current_cash: number
  investment_assets: number
  yearly_savings_rate: number
  salary: number
  portfolio: Record<string, number>
  risk_appetite: 'low' | 'medium' | 'high'
  target_retire_age: number
  target_monthly_income: number
  description?: string
  
  // New fields
  escalation_enabled: boolean
  last_advisor_interaction?: string
  status: 'healthy' | 'needs_attention' | 'critical'
}

// Advisor Profile
interface AdvisorProfile extends BaseUser {
  role: 'advisor'
  license_number?: string
  jurisdictions: ('US' | 'CA')[]        // Can serve clients in these jurisdictions
  specializations?: string[]
  bio?: string
}

// Admin Profile
interface AdminProfile extends BaseUser {
  role: 'admin'
  permissions: AdminPermission[]
}

type AdminPermission = 
  | 'manage_products' 
  | 'review_compliance' 
  | 'manage_users'
  | 'view_analytics'

// ─── Escalation System ──────────────────────────────────────────────────────

interface EscalationTicket {
  id: string
  client_id: string
  advisor_id: string
  source_conversation_id?: string
  
  // Trigger info
  reason: 'user_requested' | 'ai_complexity' | 'regulatory_question' | 'high_value_decision'
  trigger_message?: string
  ai_confidence_score?: number
  
  // Context
  context_summary: string               // AI-generated summary
  client_question: string
  suggested_response?: string           // AI draft for advisor
  
  // Status
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated_to_compliance'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Resolution
  resolution_notes?: string
  resolution_type?: 'answered' | 'meeting_scheduled' | 'referred_out' | 'no_action_needed'
  
  // Timestamps
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
}

// ─── Appointment System ─────────────────────────────────────────────────────

interface Appointment {
  id: string
  client_id: string
  advisor_id: string
  
  // Scheduling
  scheduled_at: string
  duration_minutes: number
  timezone: string
  
  // Type and context
  meeting_type: 'initial_consultation' | 'periodic_review' | 'escalation_followup' | 'scenario_planning'
  related_escalation_id?: string
  agenda?: string
  
  // Status
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  
  // AI-generated content
  pre_meeting_brief?: PreMeetingBrief
  post_meeting_notes?: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

interface PreMeetingBrief {
  id: string
  appointment_id: string
  
  // AI-generated content
  client_summary: string
  financial_snapshot: {
    total_assets: number
    goal_progress_percent: number
    risk_score: number
    key_concerns: string[]
  }
  recent_activity: {
    last_login: string
    scenarios_explored: string[]
    questions_asked: string[]
  }
  suggested_topics: string[]
  regulatory_considerations: string[]
  
  generated_at: string
}

// ─── Advisor Notes ──────────────────────────────────────────────────────────

interface AdvisorNote {
  id: string
  advisor_id: string
  client_id: string
  
  content: string
  category: 'general' | 'risk_observation' | 'opportunity' | 'compliance' | 'followup'
  is_pinned: boolean
  
  // Linking
  related_conversation_id?: string
  related_scenario_id?: string
  
  created_at: string
  updated_at: string
}

// ─── Product Catalog (Admin-managed) ────────────────────────────────────────

interface InvestmentProduct {
  id: string
  name: string
  ticker?: string
  
  // Classification
  asset_class: 'equity' | 'fixed_income' | 'balanced' | 'alternatives' | 'cash' | 'target_date'
  sub_class?: string
  risk_rating: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  
  // Performance
  exp_return: number                    // Expected annual return
  expense_ratio: number
  
  // Constraints
  minimum_investment: number
  jurisdictions: ('US' | 'CA')[]        // Available in these jurisdictions
  account_types: AccountType[]          // Eligible account types
  
  // Metadata
  description: string
  prospectus_url?: string
  
  // Admin fields
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

type AccountType = 
  // US accounts
  | '401k' | 'roth_401k' | 'traditional_ira' | 'roth_ira' | 'brokerage' | 'hsa'
  // Canadian accounts  
  | 'rrsp' | 'tfsa' | 'rrif' | 'resp' | 'non_registered'

// ─── Compliance Review (Admin) ──────────────────────────────────────────────

interface ComplianceReviewItem {
  id: string
  
  // Source
  source_type: 'chat_response' | 'scenario_projection' | 'advisor_note' | 'escalation_resolution'
  source_id: string
  user_id: string                       // Client or advisor who triggered
  
  // Content
  ai_response: string
  context: string
  
  // Flags
  auto_flagged: boolean                 // AI detected potential issue
  flag_reason?: string
  risk_level: 'low' | 'medium' | 'high'
  
  // Review
  status: 'pending' | 'approved' | 'rejected' | 'needs_modification'
  reviewer_id?: string
  review_notes?: string
  reviewed_at?: string
  
  // Timestamps
  created_at: string
}

// ─── Regulatory Knowledge Base ──────────────────────────────────────────────

interface RegulatoryRule {
  id: string
  jurisdiction: 'US' | 'CA'
  category: 'contribution_limits' | 'withdrawal_rules' | 'tax_treatment' | 'government_benefits' | 'age_requirements'
  
  // Rule content
  title: string
  description: string
  current_values: Record<string, number | string>  // e.g., { "2026_limit": 23500 }
  
  // Applicability
  account_types?: AccountType[]
  age_requirements?: { min?: number; max?: number }
  income_requirements?: { min?: number; max?: number }
  
  // Metadata
  effective_date: string
  source_url?: string
  last_verified: string
  
  // Admin
  is_active: boolean
  updated_by: string
  updated_at: string
}
```

---

## 🔌 API Endpoints

### Client Endpoints (Existing + Extensions)

```
# Existing (unchanged)
GET    /health
GET    /profiles
POST   /chat                            # Streaming chat
POST   /project-scenario                # Scenario projection
GET    /quick-scenarios/{profile_id}
GET    /conversations/{user_id}
POST   /conversations
DELETE /conversations/{user_id}/{conversation_id}
GET    /scenarios/{user_id}
POST   /scenarios

# New - Escalation (Client-initiated)
POST   /escalations                     # Create escalation request
GET    /escalations/client/{client_id}  # View own escalations

# New - Appointments (Client-facing)
GET    /appointments/client/{client_id}
GET    /appointments/availability/{advisor_id}
POST   /appointments                    # Book appointment
PUT    /appointments/{id}/cancel
```

### Advisor Endpoints (New)

```
# Profile
GET    /advisor/{advisor_id}
PUT    /advisor/{advisor_id}

# Dashboard
GET    /advisor/{advisor_id}/dashboard
GET    /advisor/{advisor_id}/metrics

# Client Management
GET    /advisor/{advisor_id}/clients
GET    /advisor/{advisor_id}/clients/{client_id}
GET    /advisor/{advisor_id}/clients/{client_id}/summary    # AI-generated
GET    /advisor/{advisor_id}/clients/{client_id}/risks
GET    /advisor/{advisor_id}/clients/{client_id}/conversations
GET    /advisor/{advisor_id}/clients/{client_id}/scenarios

# AI Catch-up
POST   /advisor/{advisor_id}/brief-me                       # Streaming
POST   /advisor/{advisor_id}/clients/{client_id}/brief-me   # Client-specific

# Advisor Notes
GET    /advisor/{advisor_id}/clients/{client_id}/notes
POST   /advisor/{advisor_id}/clients/{client_id}/notes
PUT    /advisor/{advisor_id}/notes/{note_id}
DELETE /advisor/{advisor_id}/notes/{note_id}

# Escalations
GET    /advisor/{advisor_id}/escalations
GET    /advisor/{advisor_id}/escalations/pending
PUT    /escalations/{id}                                    # Update status
PUT    /escalations/{id}/resolve

# Appointments
GET    /advisor/{advisor_id}/appointments
GET    /advisor/{advisor_id}/appointments/today
PUT    /advisor/{advisor_id}/availability
GET    /appointments/{id}/pre-brief                         # AI-generated

# Advisor Chat
POST   /advisor/chat                                        # Streaming
POST   /advisor/chat/regulatory                             # Regulatory queries

# What-If Analysis
POST   /advisor/project-scenario                            # Same as client but with advisor context
POST   /advisor/bulk-scenario                               # Multiple clients
```

### Admin Endpoints (New)

```
# Product Catalog
GET    /admin/products
GET    /admin/products/{id}
POST   /admin/products
PUT    /admin/products/{id}
DELETE /admin/products/{id}
PUT    /admin/products/{id}/toggle-active

# Compliance Review
GET    /admin/compliance/queue
GET    /admin/compliance/queue/pending
GET    /admin/compliance/{id}
PUT    /admin/compliance/{id}/review
GET    /admin/compliance/stats

# Regulatory Rules
GET    /admin/regulatory
GET    /admin/regulatory/{jurisdiction}
POST   /admin/regulatory
PUT    /admin/regulatory/{id}

# User Management
GET    /admin/users
GET    /admin/users/{id}
PUT    /admin/users/{id}
POST   /admin/users                                         # Create advisor/admin
PUT    /admin/users/{client_id}/assign-advisor
```

---

## 🎨 UI Components

### Navigation Structure

```
Client Mode:
├── Home (Dashboard)
├── Portfolio
├── Activity
└── Sage AI

Advisor Mode:
├── Dashboard (AUM, alerts, escalations)
├── Clients (list + detail)
├── Appointments
└── Sage AI (Advisor)

Admin Mode:
├── Dashboard (system health, compliance queue)
├── Products (catalog management)
├── Compliance (review queue)
├── Regulatory (rules management)
└── Users (management)
```

### Component Hierarchy

```
components/
  frontend/
    # Existing (shared/reusable)
    AnalysisCard.tsx
    CashflowChart.tsx
    MetricCard.tsx
    ProfileBubble.tsx
    QuickScenariosCard.tsx
    ScenarioProjectionOverlay.tsx
    StatusBubble.tsx
    
    # Client views (existing)
    DashboardView.tsx
    PortfolioView.tsx
    ActivityView.tsx
    PlanningView.tsx
    ProfileSelectModal.tsx
    
    # Shared new components
    shared/
      ModeToggle.tsx                    # Client/Advisor/Admin switcher
      JurisdictionBadge.tsx             # US/CA indicator
      RiskBadge.tsx                     # Risk level display
      StatusIndicator.tsx               # Health status dot
      AILoadingState.tsx                # Consistent AI loading
      EmptyState.tsx                    # Empty list states
    
    # Advisor components
    advisor/
      AdvisorLayout.tsx                 # Advisor-specific layout wrapper
      AdvisorDashboard.tsx              # Main advisor home
      AdvisorNav.tsx                    # Advisor navigation
      
      # Client management
      ClientListView.tsx                # Sortable/filterable client list
      ClientDetailView.tsx              # Full client profile
      ClientSummaryCard.tsx             # AI-generated summary widget
      ClientRiskRadar.tsx               # Risk visualization
      ClientConversationsPanel.tsx      # View client's Sage chats
      ClientScenariosPanel.tsx          # View client's saved scenarios
      
      # Escalations
      EscalationQueue.tsx               # List of pending escalations
      EscalationCard.tsx                # Individual escalation
      EscalationDetailModal.tsx         # Full escalation view
      EscalationResolutionForm.tsx      # Resolve/respond form
      
      # Appointments
      AppointmentCalendar.tsx           # Weekly/monthly view
      AppointmentCard.tsx               # Individual appointment
      AppointmentDetailModal.tsx        # Full appointment view
      PreMeetingBriefView.tsx           # AI-generated brief display
      AvailabilityEditor.tsx            # Manage slots
      
      # Notes
      AdvisorNotesPanel.tsx             # Notes sidebar/panel
      NoteCard.tsx                      # Individual note
      NoteEditor.tsx                    # Create/edit note
      
      # AI Features
      AdvisorChatView.tsx               # Advisor-specific chat
      BriefMeButton.tsx                 # AI catch-up trigger
      BriefMeModal.tsx                  # Streaming brief display
      BulkScenarioAnalysis.tsx          # Multi-client scenarios
    
    # Admin components
    admin/
      AdminLayout.tsx                   # Admin-specific layout
      AdminDashboard.tsx                # System overview
      AdminNav.tsx                      # Admin navigation
      
      # Product management
      ProductCatalog.tsx                # Product list
      ProductForm.tsx                   # Create/edit product
      ProductCard.tsx                   # Product display
      
      # Compliance
      ComplianceQueue.tsx               # Review queue
      ComplianceReviewCard.tsx          # Individual item
      ComplianceReviewModal.tsx         # Full review interface
      
      # Regulatory
      RegulatoryRulesList.tsx           # Rules by jurisdiction
      RegulatoryRuleForm.tsx            # Create/edit rule
      
      # Users
      UserManagement.tsx                # User list
      UserForm.tsx                      # Create/edit user
      AdvisorAssignment.tsx             # Assign clients to advisors
```

---

## 🗺️ Implementation Phases

### Phase 1: Foundation & Mode Toggle (Week 1-2)
**Goal**: Establish multi-persona infrastructure

#### Backend Tasks
- [ ] Create new Pydantic models for Advisor, Admin, Escalation, etc.
- [ ] Create storage layer for new entities (advisors.json, etc.)
- [ ] Add advisor profile endpoints
- [ ] Add admin profile endpoints  
- [ ] Extend user_profiles.json with advisor_id, jurisdiction, status
- [ ] Create mock advisor and admin data

#### Frontend Tasks
- [ ] Create ModeToggle component
- [ ] Create AdvisorLayout wrapper
- [ ] Create AdminLayout wrapper
- [ ] Update page.tsx with persona routing
- [ ] Create AdvisorNav component
- [ ] Create AdminNav component
- [ ] Create stub views for each persona

#### Testing
- [ ] API tests for new profile endpoints
- [ ] Mode toggle state persistence
- [ ] Navigation routing tests
- [ ] Role-based access validation

---

### Phase 2: Advisor Dashboard & Client List (Week 2-3)
**Goal**: Core advisor experience for viewing clients

#### Backend Tasks
- [ ] Implement /advisor/{id}/dashboard endpoint (AUM, counts, alerts)
- [ ] Implement /advisor/{id}/clients endpoint
- [ ] Implement /advisor/{id}/clients/{id} endpoint
- [ ] Add client status calculation logic
- [ ] Create mock data for multiple clients per advisor

#### Frontend Tasks
- [ ] Create AdvisorDashboard with metrics cards
- [ ] Create AUMSummaryCard component
- [ ] Create ClientListView with sorting/filtering
- [ ] Create ClientCard component
- [ ] Create StatusIndicator component
- [ ] Create JurisdictionBadge (US/CA flag)

#### Testing
- [ ] Dashboard metrics calculation tests
- [ ] Client list filtering tests
- [ ] Client status logic tests

---

### Phase 3: Client Detail & AI Summary (Week 3-4)
**Goal**: Deep client insights with AI

#### Backend Tasks
- [ ] Implement /advisor/{id}/clients/{id}/summary (AI-generated)
- [ ] Implement /advisor/{id}/clients/{id}/risks
- [ ] Implement /advisor/{id}/clients/{id}/conversations
- [ ] Implement /advisor/{id}/clients/{id}/scenarios
- [ ] Create advisor-specific agent prompt for client summarization

#### Frontend Tasks
- [ ] Create ClientDetailView with tabs
- [ ] Create ClientSummaryCard (streaming AI summary)
- [ ] Create ClientRiskRadar visualization
- [ ] Create ClientConversationsPanel
- [ ] Create ClientScenariosPanel

#### Testing
- [ ] AI summary generation tests
- [ ] Risk calculation accuracy tests
- [ ] Conversation retrieval tests

---

### Phase 4: Advisor Notes & What-If (Week 4-5)
**Goal**: Advisor can annotate and analyze

#### Backend Tasks
- [ ] Implement advisor notes CRUD endpoints
- [ ] Implement /advisor/project-scenario (advisor context)
- [ ] Notes storage implementation

#### Frontend Tasks
- [ ] Create AdvisorNotesPanel
- [ ] Create NoteEditor with categories
- [ ] Integrate ScenarioProjectionOverlay for advisors
- [ ] Add "Run What-If for Client" button

#### Testing
- [ ] Notes CRUD tests
- [ ] Notes category filtering tests
- [ ] Advisor scenario projection tests

---

### Phase 5: Escalation System (Week 5-6)
**Goal**: Connect client and advisor

#### Backend Tasks
- [ ] Implement escalation creation (client-side)
- [ ] Implement escalation queue (advisor-side)
- [ ] Implement escalation resolution workflow
- [ ] Add AI escalation detection in chat
- [ ] Implement escalation-to-compliance flow

#### Frontend Tasks
- [ ] Add "Talk to Advisor" button in PlanningView
- [ ] Create EscalationRequestModal (client)
- [ ] Create EscalationQueue (advisor)
- [ ] Create EscalationCard component
- [ ] Create EscalationDetailModal
- [ ] Create EscalationResolutionForm

#### Testing
- [ ] Escalation creation flow tests
- [ ] Escalation status transition tests
- [ ] AI escalation detection tests
- [ ] Priority calculation tests

---

### Phase 6: Appointment System (Week 6-7)
**Goal**: Scheduling and meeting prep

#### Backend Tasks
- [ ] Implement appointment CRUD
- [ ] Implement availability management
- [ ] Implement /appointments/{id}/pre-brief (AI-generated)
- [ ] Link appointments to escalations

#### Frontend Tasks
- [ ] Create AppointmentCalendar
- [ ] Create AvailabilityEditor
- [ ] Create client booking flow
- [ ] Create PreMeetingBriefView
- [ ] Create AppointmentDetailModal

#### Testing
- [ ] Availability slot tests
- [ ] Booking conflict tests
- [ ] Pre-meeting brief generation tests

---

### Phase 7: Advisor Chat & Regulatory (Week 7-8)
**Goal**: AI assistant for advisors

#### Backend Tasks
- [ ] Create advisor-specific agent with tools
- [ ] Implement get_client_portfolio tool
- [ ] Implement get_regulatory_info tool (US + CA)
- [ ] Implement compare_clients tool
- [ ] Populate regulatory knowledge base

#### Frontend Tasks
- [ ] Create AdvisorChatView
- [ ] Create BriefMeButton
- [ ] Create BriefMeModal (streaming)
- [ ] Add regulatory quick-queries

#### Testing
- [ ] Advisor agent tool tests
- [ ] Regulatory accuracy tests (US limits, CA limits)
- [ ] Brief generation tests

---

### Phase 8: Admin - Product Catalog (Week 8-9)
**Goal**: Admin can manage products

#### Backend Tasks
- [ ] Migrate investment_products.json to database-style storage
- [ ] Implement product CRUD endpoints
- [ ] Add product validation (jurisdiction, account types)
- [ ] Add product audit trail

#### Frontend Tasks
- [ ] Create AdminDashboard
- [ ] Create ProductCatalog view
- [ ] Create ProductForm (create/edit)
- [ ] Create ProductCard
- [ ] Add jurisdiction and account type selectors

#### Testing
- [ ] Product CRUD tests
- [ ] Product validation tests
- [ ] Jurisdiction filtering tests

---

### Phase 9: Admin - Compliance Review (Week 9-10)
**Goal**: AI advice compliance monitoring

#### Backend Tasks
- [ ] Implement compliance flagging logic in chat responses
- [ ] Implement compliance queue endpoints
- [ ] Implement review workflow
- [ ] Add compliance statistics

#### Frontend Tasks
- [ ] Create ComplianceQueue view
- [ ] Create ComplianceReviewCard
- [ ] Create ComplianceReviewModal
- [ ] Add approve/reject/modify workflow

#### Testing
- [ ] Auto-flagging accuracy tests
- [ ] Review workflow tests
- [ ] Compliance statistics tests

---

### Phase 10: Admin - Regulatory & Users (Week 10-11)
**Goal**: Complete admin functionality

#### Backend Tasks
- [ ] Implement regulatory rules CRUD
- [ ] Implement user management endpoints
- [ ] Implement advisor assignment

#### Frontend Tasks
- [ ] Create RegulatoryRulesList
- [ ] Create RegulatoryRuleForm
- [ ] Create UserManagement view
- [ ] Create AdvisorAssignment UI

#### Testing
- [ ] Regulatory rule CRUD tests
- [ ] User management tests
- [ ] Assignment validation tests

---

### Phase 11: Integration & Polish (Week 11-12)
**Goal**: End-to-end flows and refinement

#### Tasks
- [ ] End-to-end escalation flow testing
- [ ] End-to-end appointment flow testing
- [ ] Performance optimization
- [ ] Mobile responsiveness for all views
- [ ] Error handling and edge cases
- [ ] Documentation updates

#### Testing
- [ ] Full regression test suite
- [ ] Cross-persona workflow tests
- [ ] Load testing
- [ ] Accessibility audit

---

## 🧪 Testing Strategy

### Test File Structure

```
tests/
  # Existing
  test_regression.py
  test_projection_api.py
  test_projection_live.py
  
  # New - Unit tests
  test_advisor_api.py               # Advisor endpoints
  test_admin_api.py                 # Admin endpoints
  test_escalation_flow.py           # Escalation lifecycle
  test_appointment_system.py        # Scheduling logic
  test_compliance_flagging.py       # Auto-flag detection
  
  # New - Integration tests
  test_e2e_escalation.py            # Client → Advisor flow
  test_e2e_appointment.py           # Book → Brief → Complete
  test_e2e_compliance.py            # Flag → Review → Resolve
  
  # New - AI quality tests
  test_advisor_agent.py             # Advisor chat quality
  test_regulatory_accuracy.py       # US/CA rule accuracy
  test_summary_quality.py           # Client summary coherence
```

### Test Categories

| Category | Description | Automation |
|----------|-------------|------------|
| Unit | Individual endpoint/function tests | pytest |
| Integration | Multi-step workflow tests | pytest + requests |
| AI Quality | Agent response evaluation | Azure AI Evaluation |
| Regression | Prevent breaking changes | pytest (CI) |
| E2E | Full user journey tests | Playwright (future) |

---

## 📁 File Structure Updates

```
sage-retirement-planning/
├── app/
│   ├── page.tsx                    # Updated with mode routing
│   └── layout.tsx
├── components/
│   └── frontend/
│       ├── shared/                 # NEW: Shared components
│       ├── advisor/                # NEW: Advisor components
│       ├── admin/                  # NEW: Admin components
│       └── [existing...]
├── lib/
│   ├── api.ts                      # Extended with new endpoints
│   ├── advisorApi.ts               # NEW: Advisor-specific API
│   ├── adminApi.ts                 # NEW: Admin-specific API
│   ├── types.ts                    # NEW: Centralized types
│   └── [existing...]
├── backend/
│   ├── main.py                     # Extended with new routes
│   ├── storage.py                  # Extended with new entities
│   ├── advisor_routes.py           # NEW: Advisor endpoints
│   ├── admin_routes.py             # NEW: Admin endpoints
│   ├── regulatory.py               # NEW: Regulatory service
│   ├── compliance.py               # NEW: Compliance service
│   └── data/
│       ├── user_profiles.json      # Updated schema
│       ├── investment_products.json
│       ├── advisors.json           # NEW
│       ├── admins.json             # NEW
│       ├── escalations.json        # NEW
│       ├── appointments.json       # NEW
│       ├── regulatory_rules.json   # NEW
│       └── user_data/
├── tests/
│   └── [new test files...]
└── docs/
    └── ADVISOR_VIEW_SPEC.md        # This file
```

---

## 🌍 Regulatory Knowledge Base (US + Canada)

### US Rules (2026)

| Rule | Account | Value |
|------|---------|-------|
| 401(k) Contribution Limit | 401k | $23,500 |
| 401(k) Catch-up (50+) | 401k | $7,500 |
| IRA Contribution Limit | IRA | $7,000 |
| IRA Catch-up (50+) | IRA | $1,000 |
| HSA Individual Limit | HSA | $4,300 |
| HSA Family Limit | HSA | $8,550 |
| Social Security FRA | - | 67 |
| RMD Start Age | 401k/IRA | 73 |

### Canadian Rules (2026)

| Rule | Account | Value |
|------|---------|-------|
| RRSP Contribution Limit | RRSP | 18% of income, max $32,490 |
| TFSA Contribution Limit | TFSA | $7,000 |
| RESP Lifetime Limit | RESP | $50,000 per beneficiary |
| OAS Eligibility Age | - | 65 |
| CPP Start Age (standard) | - | 65 |
| CPP Early (reduced) | - | 60 |
| CPP Deferred (increased) | - | 70 |

---

## ✅ Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mode toggle works | 100% | Manual + automated tests |
| Client list loads in <1s | 95th percentile | Performance monitoring |
| AI summary generates in <5s | 90th percentile | Streaming timing |
| Escalation resolution <24h | 80% of tickets | Ticket analytics |
| Pre-meeting brief accuracy | >90% satisfaction | Advisor feedback |
| Regulatory answers correct | 100% | Unit tests + spot checks |
| Zero client data leakage | 0 incidents | Security audit |

---

## 🚀 Ready to Implement

This specification is approved for implementation. Proceed with **Phase 1: Foundation & Mode Toggle**.
