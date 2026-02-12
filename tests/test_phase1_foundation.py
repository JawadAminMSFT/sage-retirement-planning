"""
Phase 1 Tests: Foundation & Mode Toggle
Tests for advisor and admin API endpoints and data models.
"""

import unittest
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from models import (
    AdvisorProfile,
    AdminProfile,
    AdvisorNote,
    EscalationTicket,
    Appointment,
    ExtendedClientProfile,
    RegulatoryRule,
    UserRole,
    Jurisdiction,
    ClientStatus,
    EscalationStatus,
    EscalationPriority,
    NoteCategory,
    RegulatoryCategory,
)
from advisor_storage import AdvisorStorage


class TestDataModels(unittest.TestCase):
    """Test Pydantic data models."""
    
    def test_advisor_profile_creation(self):
        """Test creating an advisor profile."""
        advisor = AdvisorProfile(
            id="test-advisor",
            email="test@example.com",
            name="Test Advisor",
            license_number="CFP-123",
            jurisdictions=[Jurisdiction.US, Jurisdiction.CA],
            specializations=["retirement", "tax"],
            bio="Test bio",
        )
        self.assertEqual(advisor.id, "test-advisor")
        self.assertEqual(advisor.role, UserRole.ADVISOR)
        self.assertEqual(len(advisor.jurisdictions), 2)
    
    def test_admin_profile_creation(self):
        """Test creating an admin profile."""
        admin = AdminProfile(
            id="test-admin",
            email="admin@example.com",
            name="Test Admin",
        )
        self.assertEqual(admin.id, "test-admin")
        self.assertEqual(admin.role, UserRole.ADMIN)
        self.assertEqual(len(admin.permissions), 4)  # All permissions by default
    
    def test_extended_client_profile(self):
        """Test extended client profile with new fields."""
        client = ExtendedClientProfile(
            id="test-client",
            name="Test Client",
            age=40,
            current_cash=50000,
            investment_assets=250000,
            yearly_savings_rate=0.15,
            salary=100000,
            portfolio={"stocks": 0.7, "bonds": 0.3},
            risk_appetite="medium",
            target_retire_age=65,
            target_monthly_income=5000,
            advisor_id="advisor-jane",
            jurisdiction=Jurisdiction.US,
            status=ClientStatus.HEALTHY,
        )
        self.assertEqual(client.advisor_id, "advisor-jane")
        self.assertEqual(client.jurisdiction, Jurisdiction.US)
        self.assertEqual(client.status, ClientStatus.HEALTHY)
        self.assertTrue(client.escalation_enabled)
    
    def test_escalation_ticket(self):
        """Test escalation ticket creation."""
        ticket = EscalationTicket(
            client_id="client-1",
            advisor_id="advisor-1",
            reason="user_requested",
            context_summary="Client needs help with Roth conversion",
            client_question="Should I convert my Traditional IRA to Roth?",
        )
        self.assertEqual(ticket.status, EscalationStatus.PENDING)
        self.assertEqual(ticket.priority, EscalationPriority.MEDIUM)
        self.assertIsNotNone(ticket.id)
        self.assertIsNotNone(ticket.created_at)
    
    def test_advisor_note(self):
        """Test advisor note creation."""
        note = AdvisorNote(
            advisor_id="advisor-1",
            client_id="client-1",
            content="Client expressed concern about market volatility.",
            category=NoteCategory.RISK_OBSERVATION,
            is_pinned=True,
        )
        self.assertEqual(note.category, NoteCategory.RISK_OBSERVATION)
        self.assertTrue(note.is_pinned)
    
    def test_regulatory_rule(self):
        """Test regulatory rule creation."""
        rule = RegulatoryRule(
            jurisdiction=Jurisdiction.US,
            category=RegulatoryCategory.CONTRIBUTION_LIMITS,
            title="401(k) Limit 2026",
            description="Maximum 401k contribution for 2026",
            current_values={"limit": 23500, "year": 2026},
            effective_date="2026-01-01",
        )
        self.assertEqual(rule.jurisdiction, Jurisdiction.US)
        self.assertEqual(rule.current_values["limit"], 23500)
        self.assertTrue(rule.is_active)


class TestAdvisorStorage(unittest.TestCase):
    """Test advisor storage operations."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test storage with test data directory."""
        cls.storage = AdvisorStorage(
            data_dir=Path(__file__).parent.parent / "backend" / "data"
        )
    
    def test_load_advisors(self):
        """Test loading advisors from JSON."""
        advisors = asyncio.run(self.storage.get_advisors())
        self.assertGreater(len(advisors), 0)
        
        # Check first advisor has expected fields
        advisor = advisors[0]
        self.assertIsInstance(advisor, AdvisorProfile)
        self.assertIsNotNone(advisor.id)
        self.assertIsNotNone(advisor.name)
    
    def test_get_advisor_by_id(self):
        """Test getting specific advisor."""
        advisor = asyncio.run(self.storage.get_advisor("advisor-jane"))
        self.assertIsNotNone(advisor)
        self.assertEqual(advisor.name, "Jane Smith")
        self.assertIn(Jurisdiction.US, advisor.jurisdictions)
        self.assertIn(Jurisdiction.CA, advisor.jurisdictions)
    
    def test_load_admins(self):
        """Test loading admins from JSON."""
        admins = asyncio.run(self.storage.get_admins())
        self.assertGreater(len(admins), 0)
    
    def test_get_clients_for_advisor(self):
        """Test getting clients for an advisor."""
        clients = asyncio.run(self.storage.get_clients_for_advisor("advisor-jane"))
        self.assertGreater(len(clients), 0)
        
        # All clients should be assigned to advisor-jane
        for client in clients:
            self.assertEqual(client.advisor_id, "advisor-jane")
    
    def test_client_jurisdictions(self):
        """Test that clients have proper jurisdiction assignments."""
        clients = asyncio.run(self.storage.get_all_clients())
        
        us_clients = [c for c in clients if c.jurisdiction == Jurisdiction.US]
        ca_clients = [c for c in clients if c.jurisdiction == Jurisdiction.CA]
        
        self.assertGreater(len(us_clients), 0, "Should have US clients")
        self.assertGreater(len(ca_clients), 0, "Should have Canadian clients")
    
    def test_client_statuses(self):
        """Test that clients have various statuses."""
        clients = asyncio.run(self.storage.get_all_clients())
        
        statuses = set(c.status for c in clients)
        self.assertIn(ClientStatus.HEALTHY, statuses)
        self.assertIn(ClientStatus.NEEDS_ATTENTION, statuses)
        self.assertIn(ClientStatus.CRITICAL, statuses)
    
    def test_advisor_dashboard_metrics(self):
        """Test dashboard metrics calculation."""
        metrics = asyncio.run(self.storage.get_advisor_dashboard_metrics("advisor-jane"))
        
        self.assertIn("total_aum", metrics)
        self.assertIn("client_count", metrics)
        self.assertIn("clients_by_status", metrics)
        self.assertIn("clients_by_risk", metrics)
        self.assertIn("pending_escalations", metrics)
        
        self.assertGreater(metrics["total_aum"], 0)
        self.assertGreater(metrics["client_count"], 0)
    
    def test_regulatory_rules_us(self):
        """Test loading US regulatory rules."""
        rules = asyncio.run(self.storage.get_regulatory_rules(jurisdiction="US"))
        
        self.assertGreater(len(rules), 0)
        
        # Check for key US rules
        rule_titles = [r.title for r in rules]
        self.assertTrue(any("401(k)" in t for t in rule_titles))
        self.assertTrue(any("IRA" in t for t in rule_titles))
    
    def test_regulatory_rules_canada(self):
        """Test loading Canadian regulatory rules."""
        rules = asyncio.run(self.storage.get_regulatory_rules(jurisdiction="CA"))
        
        self.assertGreater(len(rules), 0)
        
        # Check for key Canadian rules
        rule_titles = [r.title for r in rules]
        self.assertTrue(any("RRSP" in t for t in rule_titles))
        self.assertTrue(any("TFSA" in t for t in rule_titles))


class TestDataIntegrity(unittest.TestCase):
    """Test data file integrity."""
    
    def setUp(self):
        self.data_dir = Path(__file__).parent.parent / "backend" / "data"
    
    def test_advisors_json_valid(self):
        """Test advisors.json is valid."""
        with open(self.data_dir / "advisors.json") as f:
            data = json.load(f)
        
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        
        for advisor in data:
            self.assertIn("id", advisor)
            self.assertIn("name", advisor)
            self.assertIn("email", advisor)
    
    def test_admins_json_valid(self):
        """Test admins.json is valid."""
        with open(self.data_dir / "admins.json") as f:
            data = json.load(f)
        
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
    
    def test_regulatory_rules_json_valid(self):
        """Test regulatory_rules.json is valid."""
        with open(self.data_dir / "regulatory_rules.json") as f:
            data = json.load(f)
        
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        
        # Check for both US and CA rules
        jurisdictions = set(r["jurisdiction"] for r in data)
        self.assertIn("US", jurisdictions)
        self.assertIn("CA", jurisdictions)
    
    def test_user_profiles_extended(self):
        """Test user_profiles.json has extended fields."""
        with open(self.data_dir / "user_profiles.json") as f:
            data = json.load(f)
        
        self.assertIsInstance(data, list)
        
        # Check that profiles have new fields
        for profile in data:
            self.assertIn("advisor_id", profile, f"Profile {profile.get('id')} missing advisor_id")
            self.assertIn("jurisdiction", profile, f"Profile {profile.get('id')} missing jurisdiction")
            self.assertIn("status", profile, f"Profile {profile.get('id')} missing status")


class TestRegulatoryValues(unittest.TestCase):
    """Test regulatory rule values are accurate for 2026."""
    
    def setUp(self):
        self.storage = AdvisorStorage(
            data_dir=Path(__file__).parent.parent / "backend" / "data"
        )
    
    def test_us_401k_limit_2026(self):
        """Test 401(k) limit is correct for 2026."""
        rules = asyncio.run(self.storage.get_regulatory_rules(jurisdiction="US"))
        
        limit_rule = next(
            (r for r in rules if "401(k) Contribution Limit" in r.title and "2026" in r.title),
            None
        )
        self.assertIsNotNone(limit_rule, "Should have 401(k) 2026 limit rule")
        self.assertEqual(limit_rule.current_values.get("limit"), 23500)
    
    def test_us_ira_limit_2026(self):
        """Test IRA limit is correct for 2026."""
        rules = asyncio.run(self.storage.get_regulatory_rules(jurisdiction="US"))
        
        limit_rule = next(
            (r for r in rules if "IRA Contribution Limit" in r.title and "2026" in r.title),
            None
        )
        self.assertIsNotNone(limit_rule, "Should have IRA 2026 limit rule")
        self.assertEqual(limit_rule.current_values.get("limit"), 7000)
    
    def test_ca_rrsp_limit_2026(self):
        """Test RRSP limit is correct for 2026."""
        rules = asyncio.run(self.storage.get_regulatory_rules(jurisdiction="CA"))
        
        limit_rule = next(
            (r for r in rules if "RRSP" in r.title and "2026" in r.title),
            None
        )
        self.assertIsNotNone(limit_rule, "Should have RRSP 2026 limit rule")
        self.assertEqual(limit_rule.current_values.get("dollar_limit"), 32490)
    
    def test_ca_tfsa_limit_2026(self):
        """Test TFSA limit is correct for 2026."""
        rules = asyncio.run(self.storage.get_regulatory_rules(jurisdiction="CA"))
        
        limit_rule = next(
            (r for r in rules if "TFSA" in r.title and "2026" in r.title),
            None
        )
        self.assertIsNotNone(limit_rule, "Should have TFSA 2026 limit rule")
        self.assertEqual(limit_rule.current_values.get("annual_limit"), 7000)


if __name__ == "__main__":
    print("=" * 60)
    print("Phase 1 Tests: Foundation & Mode Toggle")
    print("=" * 60)
    
    # Run tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestDataModels))
    suite.addTests(loader.loadTestsFromTestCase(TestAdvisorStorage))
    suite.addTests(loader.loadTestsFromTestCase(TestDataIntegrity))
    suite.addTests(loader.loadTestsFromTestCase(TestRegulatoryValues))
    
    # Run with verbosity
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print("\n" + "=" * 60)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("=" * 60)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)
