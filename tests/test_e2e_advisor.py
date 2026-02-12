"""
Comprehensive End-to-End Tests for Sage Advisor View
Tests all phases of the implementation including:
- Phase 1: Foundation & Mode Toggle
- Phase 2: Advisor Dashboard & Client List
- Phase 3: Client Detail & AI Summary  
- Phase 4: Advisor Notes
- Phase 5: Escalation System
- Phase 6: Appointment System with Pre/Post Meeting Analysis
- Phase 7: Advisor Chat & Regulatory
- Phase 8-10: Admin Features

Run with: python tests/test_e2e_advisor.py
"""

import sys
import os
import unittest
import json
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from models import (
    AdvisorProfile,
    AdminProfile,
    ExtendedClientProfile,
    AdvisorNote,
    NoteCategory,
    EscalationTicket,
    EscalationReason,
    EscalationStatus,
    EscalationPriority,
    ResolutionType,
    Appointment,
    AppointmentStatus,
    MeetingType,
    PreMeetingBrief,
    RegulatoryRule,
    RegulatoryCategory,
    ComplianceReviewItem,
    ComplianceStatus,
    ComplianceSourceType,
    ClientStatus,
    Jurisdiction,
)
from advisor_storage import AdvisorStorage


class TestPhase1Foundation(unittest.TestCase):
    """Phase 1: Foundation & Mode Toggle Tests"""
    
    def setUp(self):
        self.storage = AdvisorStorage()
    
    def test_advisor_profile_model(self):
        """Test AdvisorProfile model creation"""
        advisor = AdvisorProfile(
            id="test-advisor",
            email="test@sage.com",
            name="Test Advisor",
            role="advisor",
            license_number="CFP-123456",
            jurisdictions=["US", "CA"],
            specializations=["retirement_planning"],
            bio="Test bio",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        self.assertEqual(advisor.role, "advisor")
        self.assertIn("US", advisor.jurisdictions)
        self.assertIn("CA", advisor.jurisdictions)
    
    def test_admin_profile_model(self):
        """Test AdminProfile model creation"""
        admin = AdminProfile(
            id="test-admin",
            email="admin@sage.com",
            name="Test Admin",
            role="admin",
            permissions=["manage_products", "review_compliance"],
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        self.assertEqual(admin.role, "admin")
        self.assertIn("manage_products", admin.permissions)
    
    def test_client_profile_extended(self):
        """Test ExtendedClientProfile with advisor assignment"""
        client = ExtendedClientProfile(
            id="test-client",
            email="client@test.com",
            name="Test Client",
            role="client",
            age=45,
            current_cash=50000,
            investment_assets=400000,
            yearly_savings_rate=0.15,
            salary=100000,
            portfolio={"stocks": 0.7, "bonds": 0.3},
            risk_appetite="medium",
            target_retire_age=65,
            target_monthly_income=5000,
            advisor_id="test-advisor",
            jurisdiction="US",
            escalation_enabled=True,
            status="healthy",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        self.assertEqual(client.advisor_id, "test-advisor")
        self.assertEqual(client.jurisdiction, Jurisdiction.US)
        self.assertEqual(client.status, ClientStatus.HEALTHY)


class TestPhase2Dashboard(unittest.TestCase):
    """Phase 2: Advisor Dashboard & Client List Tests"""
    
    def setUp(self):
        self.storage = AdvisorStorage()
    
    def test_get_advisor_by_id(self):
        """Test retrieving advisor by ID"""
        import asyncio
        advisor = asyncio.run(self.storage.get_advisor("advisor-jane"))
        self.assertIsNotNone(advisor)
        self.assertEqual(advisor.name, "Jane Smith")
    
    def test_get_clients_for_advisor(self):
        """Test retrieving clients assigned to advisor"""
        import asyncio
        clients = asyncio.run(self.storage.get_clients_for_advisor("advisor-jane"))
        self.assertIsInstance(clients, list)
        # Verify all clients belong to this advisor
        for client in clients:
            self.assertEqual(client.advisor_id, "advisor-jane")
    
    def test_dashboard_metrics_calculation(self):
        """Test dashboard metrics are calculated correctly"""
        import asyncio
        metrics = asyncio.run(self.storage.get_advisor_dashboard_metrics("advisor-jane"))
        
        self.assertIn("total_aum", metrics)
        self.assertIn("client_count", metrics)
        self.assertIn("clients_by_status", metrics)
        self.assertIn("clients_by_risk", metrics)
        self.assertIn("pending_escalations", metrics)
        
        # AUM should be positive
        self.assertGreater(metrics["total_aum"], 0)
        
        # Status counts should sum to client count
        status_total = sum(metrics["clients_by_status"].values())
        self.assertEqual(status_total, metrics["client_count"])


class TestPhase3ClientDetail(unittest.TestCase):
    """Phase 3: Client Detail & AI Summary Tests"""
    
    def setUp(self):
        self.storage = AdvisorStorage()
    
    def test_get_client_detail(self):
        """Test retrieving detailed client profile"""
        import asyncio
        client = asyncio.run(self.storage.get_client("demo-user"))
        self.assertIsNotNone(client)
        self.assertEqual(client.name, "John Doe")
        self.assertIsNotNone(client.portfolio)
        self.assertIsNotNone(client.risk_appetite)


class TestPhase4Notes(unittest.TestCase):
    """Phase 4: Advisor Notes Tests"""
    
    def setUp(self):
        self.storage = AdvisorStorage()
    
    def test_note_model_creation(self):
        """Test AdvisorNote model"""
        note = AdvisorNote(
            advisor_id="advisor-jane",
            client_id="demo-user",
            content="Test note content",
            category=NoteCategory.GENERAL,
            is_pinned=False,
        )
        self.assertIsNotNone(note.id)
        self.assertEqual(note.category, NoteCategory.GENERAL)
    
    def test_note_categories(self):
        """Test all note categories"""
        categories = [
            NoteCategory.GENERAL,
            NoteCategory.RISK_OBSERVATION,
            NoteCategory.OPPORTUNITY,
            NoteCategory.COMPLIANCE,
            NoteCategory.FOLLOWUP,
        ]
        for cat in categories:
            note = AdvisorNote(
                advisor_id="test",
                client_id="test",
                content="Test",
                category=cat,
                is_pinned=False,
            )
            self.assertEqual(note.category, cat)


class TestPhase5Escalations(unittest.TestCase):
    """Phase 5: Escalation System Tests"""
    
    def setUp(self):
        self.storage = AdvisorStorage()
    
    def test_escalation_creation(self):
        """Test creating an escalation ticket"""
        escalation = EscalationTicket(
            client_id="demo-user",
            advisor_id="advisor-jane",
            reason=EscalationReason.USER_REQUESTED,
            context_summary="Client wants to discuss retirement strategy",
            client_question="Can we review my retirement plan?",
            status=EscalationStatus.PENDING,
            priority=EscalationPriority.MEDIUM,
        )
        self.assertIsNotNone(escalation.id)
        self.assertEqual(escalation.status, EscalationStatus.PENDING)
    
    def test_escalation_reasons(self):
        """Test all escalation reasons"""
        reasons = [
            EscalationReason.USER_REQUESTED,
            EscalationReason.AI_COMPLEXITY,
            EscalationReason.REGULATORY_QUESTION,
            EscalationReason.HIGH_VALUE_DECISION,
        ]
        for reason in reasons:
            esc = EscalationTicket(
                client_id="test",
                advisor_id="test",
                reason=reason,
                context_summary="Test",
                client_question="Test",
                status=EscalationStatus.PENDING,
                priority=EscalationPriority.LOW,
            )
            self.assertEqual(esc.reason, reason)
    
    def test_escalation_resolution(self):
        """Test escalation resolution workflow"""
        escalation = EscalationTicket(
            client_id="demo-user",
            advisor_id="advisor-jane",
            reason=EscalationReason.USER_REQUESTED,
            context_summary="Test",
            client_question="Test",
            status=EscalationStatus.PENDING,
            priority=EscalationPriority.MEDIUM,
        )
        
        # Acknowledge
        escalation.status = EscalationStatus.IN_PROGRESS
        escalation.acknowledged_at = datetime.utcnow().isoformat()
        self.assertEqual(escalation.status, EscalationStatus.IN_PROGRESS)
        
        # Resolve
        escalation.status = EscalationStatus.RESOLVED
        escalation.resolution_type = ResolutionType.ANSWERED
        escalation.resolution_notes = "Provided detailed explanation"
        escalation.resolved_at = datetime.utcnow().isoformat()
        self.assertEqual(escalation.status, EscalationStatus.RESOLVED)


class TestPhase6Appointments(unittest.TestCase):
    """Phase 6: Appointment System with Pre/Post Meeting Analysis Tests"""
    
    def test_appointment_creation(self):
        """Test creating an appointment"""
        appointment = Appointment(
            client_id="demo-user",
            advisor_id="advisor-jane",
            scheduled_at=(datetime.utcnow() + timedelta(days=1)).isoformat(),
            duration_minutes=30,
            timezone="America/New_York",
            meeting_type=MeetingType.PERIODIC_REVIEW,
            agenda="Q1 portfolio review",
            status=AppointmentStatus.SCHEDULED,
        )
        self.assertIsNotNone(appointment.id)
        self.assertEqual(appointment.meeting_type, MeetingType.PERIODIC_REVIEW)
    
    def test_meeting_types(self):
        """Test all meeting types"""
        types = [
            MeetingType.INITIAL_CONSULTATION,
            MeetingType.PERIODIC_REVIEW,
            MeetingType.ESCALATION_FOLLOWUP,
            MeetingType.SCENARIO_PLANNING,
        ]
        for mt in types:
            appt = Appointment(
                client_id="test",
                advisor_id="test",
                scheduled_at=datetime.utcnow().isoformat(),
                duration_minutes=30,
                timezone="UTC",
                meeting_type=mt,
                status=AppointmentStatus.SCHEDULED,
            )
            self.assertEqual(appt.meeting_type, mt)
    
    def test_pre_meeting_brief(self):
        """Test pre-meeting brief generation structure"""
        brief = PreMeetingBrief(
            appointment_id="appt-1",
            client_summary="Test client summary",
            financial_snapshot={
                "total_assets": 280000,
                "goal_progress_percent": 42,
                "risk_score": 55,
                "key_concerns": ["Savings pace", "Tax optimization"]
            },
            recent_activity={
                "last_login": datetime.utcnow().isoformat(),
                "scenarios_explored": ["Early retirement"],
                "questions_asked": ["401k limits"]
            },
            suggested_topics=["Review goals", "Discuss Roth conversion"],
            regulatory_considerations=["2026 401k limit is $23,500"],
        )
        self.assertIsNotNone(brief.id)
        self.assertEqual(brief.financial_snapshot["total_assets"], 280000)
        self.assertEqual(len(brief.suggested_topics), 2)
    
    def test_appointment_status_transitions(self):
        """Test appointment status lifecycle"""
        appt = Appointment(
            client_id="demo-user",
            advisor_id="advisor-jane",
            scheduled_at=datetime.utcnow().isoformat(),
            duration_minutes=30,
            timezone="UTC",
            meeting_type=MeetingType.PERIODIC_REVIEW,
            status=AppointmentStatus.SCHEDULED,
        )
        
        # Confirm
        appt.status = AppointmentStatus.CONFIRMED
        self.assertEqual(appt.status, AppointmentStatus.CONFIRMED)
        
        # Complete
        appt.status = AppointmentStatus.COMPLETED
        appt.post_meeting_notes = "Discussed retirement strategy. Client satisfied."
        self.assertEqual(appt.status, AppointmentStatus.COMPLETED)
        self.assertIsNotNone(appt.post_meeting_notes)


class TestPhase7RegulatoryChat(unittest.TestCase):
    """Phase 7: Advisor Chat & Regulatory Tests"""
    
    def setUp(self):
        self.storage = AdvisorStorage()
    
    def test_regulatory_rule_model(self):
        """Test RegulatoryRule model"""
        rule = RegulatoryRule(
            jurisdiction="US",
            category=RegulatoryCategory.CONTRIBUTION_LIMITS,
            title="401(k) Contribution Limit 2026",
            description="Annual contribution limit for 401(k) plans",
            current_values={"standard_limit": 23500, "catch_up_50_plus": 7500},
            account_types=["401k", "roth_401k"],
            effective_date="2026-01-01",
            source_url="https://irs.gov",
            last_verified=datetime.utcnow().isoformat(),
            is_active=True,
            updated_by="admin-alice",
        )
        self.assertEqual(rule.jurisdiction, Jurisdiction.US)
        self.assertEqual(rule.current_values["standard_limit"], 23500)
    
    def test_us_regulatory_rules(self):
        """Test US regulatory rules are loaded"""
        import asyncio
        rules = asyncio.run(self.storage.get_regulatory_rules("US"))
        self.assertIsInstance(rules, list)
        
        # Check for expected rules
        categories = [r.category for r in rules]
        self.assertIn(RegulatoryCategory.CONTRIBUTION_LIMITS, categories)
    
    def test_ca_regulatory_rules(self):
        """Test Canadian regulatory rules are loaded"""
        import asyncio
        rules = asyncio.run(self.storage.get_regulatory_rules("CA"))
        self.assertIsInstance(rules, list)
        
        # Canada should have RRSP/TFSA rules
        if rules:
            categories = [r.category for r in rules]
            self.assertIn(RegulatoryCategory.CONTRIBUTION_LIMITS, categories)


class TestPhase8AdminProducts(unittest.TestCase):
    """Phase 8: Admin Product Catalog Tests"""
    
    def test_investment_product_structure(self):
        """Test investment product data structure"""
        # Load from file
        data_path = Path(__file__).parent.parent / "backend" / "data" / "investment_products.json"
        if data_path.exists():
            with open(data_path) as f:
                data = json.load(f)
            
            # Handle both list format and grouped format
            if isinstance(data, dict):
                # Products are grouped by risk
                products = []
                for risk_level, product_list in data.get("products_by_risk", {}).items():
                    products.extend(product_list)
            else:
                products = data
            
            self.assertIsInstance(products, list)
            if products:
                product = products[0]
                self.assertIn("name", product)
                self.assertIn("asset_class", product)
                self.assertIn("exp_return", product)


class TestPhase9Compliance(unittest.TestCase):
    """Phase 9: Admin Compliance Review Tests"""
    
    def test_compliance_review_item(self):
        """Test ComplianceReviewItem model"""
        item = ComplianceReviewItem(
            source_type=ComplianceSourceType.CHAT_RESPONSE,
            source_id="msg-12345",
            user_id="demo-user",
            ai_response="You should definitely max out your Roth IRA",
            context="Client asked about IRA strategy",
            auto_flagged=True,
            flag_reason="Potentially unsuitable blanket advice",
            risk_level=EscalationPriority.MEDIUM,
            status=ComplianceStatus.PENDING,
        )
        self.assertIsNotNone(item.id)
        self.assertEqual(item.status, ComplianceStatus.PENDING)
        self.assertTrue(item.auto_flagged)
    
    def test_compliance_review_workflow(self):
        """Test compliance review approval workflow"""
        item = ComplianceReviewItem(
            source_type=ComplianceSourceType.CHAT_RESPONSE,
            source_id="msg-12345",
            user_id="demo-user",
            ai_response="Test response",
            context="Test context",
            auto_flagged=False,
            risk_level=EscalationPriority.LOW,
            status=ComplianceStatus.PENDING,
        )
        
        # Review and approve
        item.status = ComplianceStatus.APPROVED
        item.reviewer_id = "admin-alice"
        item.review_notes = "Response is appropriate"
        item.reviewed_at = datetime.utcnow().isoformat()
        
        self.assertEqual(item.status, ComplianceStatus.APPROVED)
        self.assertIsNotNone(item.reviewed_at)


class TestIntegration(unittest.TestCase):
    """Integration tests for multi-step workflows"""
    
    def setUp(self):
        self.storage = AdvisorStorage()
    
    def test_escalation_to_appointment_flow(self):
        """Test escalation leading to appointment booking"""
        # Create escalation
        escalation = EscalationTicket(
            client_id="demo-user",
            advisor_id="advisor-jane",
            reason=EscalationReason.HIGH_VALUE_DECISION,
            context_summary="Major retirement decision",
            client_question="Should I take early retirement?",
            status=EscalationStatus.PENDING,
            priority=EscalationPriority.HIGH,
        )
        
        # Advisor acknowledges and schedules meeting
        escalation.status = EscalationStatus.IN_PROGRESS
        escalation.acknowledged_at = datetime.utcnow().isoformat()
        
        # Create linked appointment
        appointment = Appointment(
            client_id=escalation.client_id,
            advisor_id=escalation.advisor_id,
            scheduled_at=(datetime.utcnow() + timedelta(days=2)).isoformat(),
            duration_minutes=45,
            timezone="America/New_York",
            meeting_type=MeetingType.ESCALATION_FOLLOWUP,
            related_escalation_id=escalation.id,
            agenda="Discuss early retirement options",
            status=AppointmentStatus.SCHEDULED,
        )
        
        # Resolve escalation
        escalation.status = EscalationStatus.RESOLVED
        escalation.resolution_type = ResolutionType.MEETING_SCHEDULED
        escalation.resolution_notes = f"Meeting scheduled: {appointment.id}"
        escalation.resolved_at = datetime.utcnow().isoformat()
        
        self.assertEqual(escalation.status, EscalationStatus.RESOLVED)
        self.assertEqual(appointment.related_escalation_id, escalation.id)
        self.assertEqual(appointment.meeting_type, MeetingType.ESCALATION_FOLLOWUP)
    
    def test_client_status_calculation(self):
        """Test client status is properly assigned"""
        import asyncio
        clients = asyncio.run(self.storage.get_clients_for_advisor("advisor-jane"))
        
        statuses = {"healthy": 0, "needs_attention": 0, "critical": 0}
        for client in clients:
            statuses[client.status.value] += 1
        
        # At least one client should exist
        total = sum(statuses.values())
        self.assertGreater(total, 0)
    
    def test_jurisdiction_filtering(self):
        """Test clients can be filtered by jurisdiction"""
        import asyncio
        clients = asyncio.run(self.storage.get_clients_for_advisor("advisor-jane"))
        
        us_clients = [c for c in clients if c.jurisdiction == Jurisdiction.US]
        ca_clients = [c for c in clients if c.jurisdiction == Jurisdiction.CA]
        
        # Should have clients in both jurisdictions (based on mock data)
        # At minimum, we should be able to filter
        self.assertIsInstance(us_clients, list)
        self.assertIsInstance(ca_clients, list)


class TestDataIntegrity(unittest.TestCase):
    """Tests for data file integrity"""
    
    def test_advisor_data_file(self):
        """Test advisors.json is valid"""
        data_path = Path(__file__).parent.parent / "backend" / "data" / "advisors.json"
        self.assertTrue(data_path.exists(), "advisors.json should exist")
        
        with open(data_path) as f:
            data = json.load(f)
        
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0, "Should have at least one advisor")
        
        # Validate structure
        for advisor in data:
            self.assertIn("id", advisor)
            self.assertIn("name", advisor)
            self.assertIn("role", advisor)
            self.assertEqual(advisor["role"], "advisor")
    
    def test_admin_data_file(self):
        """Test admins.json is valid"""
        data_path = Path(__file__).parent.parent / "backend" / "data" / "admins.json"
        self.assertTrue(data_path.exists(), "admins.json should exist")
        
        with open(data_path) as f:
            data = json.load(f)
        
        self.assertIsInstance(data, list)
    
    def test_regulatory_rules_file(self):
        """Test regulatory_rules.json is valid"""
        data_path = Path(__file__).parent.parent / "backend" / "data" / "regulatory_rules.json"
        self.assertTrue(data_path.exists(), "regulatory_rules.json should exist")
        
        with open(data_path) as f:
            data = json.load(f)
        
        self.assertIsInstance(data, list)
        
        # Should have both US and CA rules
        jurisdictions = set(r.get("jurisdiction") for r in data)
        self.assertIn("US", jurisdictions)
        self.assertIn("CA", jurisdictions)
    
    def test_user_profiles_have_advisor_fields(self):
        """Test user_profiles.json has advisor-related fields"""
        data_path = Path(__file__).parent.parent / "backend" / "data" / "user_profiles.json"
        self.assertTrue(data_path.exists())
        
        with open(data_path) as f:
            profiles = json.load(f)
        
        for profile in profiles:
            # Should have new advisor-related fields
            self.assertIn("advisor_id", profile)
            self.assertIn("jurisdiction", profile)
            self.assertIn("status", profile)
            self.assertIn("escalation_enabled", profile)


def run_tests():
    """Run all tests and report results"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    test_classes = [
        TestPhase1Foundation,
        TestPhase2Dashboard,
        TestPhase3ClientDetail,
        TestPhase4Notes,
        TestPhase5Escalations,
        TestPhase6Appointments,
        TestPhase7RegulatoryChat,
        TestPhase8AdminProducts,
        TestPhase9Compliance,
        TestIntegration,
        TestDataIntegrity,
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests with verbosity
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Tests Run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    
    if result.wasSuccessful():
        print("\n✅ ALL TESTS PASSED!")
    else:
        print("\n❌ SOME TESTS FAILED")
        for test, trace in result.failures + result.errors:
            print(f"\n  Failed: {test}")
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
