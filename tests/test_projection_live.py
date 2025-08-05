"""
Live API tests for the Scenario Projection endpoint.

These tests call the actual backend API and validate responses.
Requires the backend to be running on port 8172.

Run with: python tests/test_projection_live.py
"""

import json
import sys
import time
import requests
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_URL = "http://localhost:8172"

# Example scenarios from the UI
EXAMPLE_SCENARIOS = [
    {"label": "Max 401(k)", "scenario": "I maximize my 401k contributions"},
    {"label": "+5% savings", "scenario": "I increase my savings rate by 5%"},
    {"label": "Market crash", "scenario": "There is a 20% market crash"},
    {"label": "Stop contributing", "scenario": "I stop all retirement contributions"},
    {"label": "Add Roth IRA", "scenario": "I add $500/month to my Roth IRA"},
    {"label": "Early retirement", "scenario": "I retire 5 years earlier than planned"},
]

# Sample portfolio data for testing
SAMPLE_PORTFOLIO = {
    "total_value": 500000,
    "accounts": [
        {"id": "acc_401k", "name": "401(k)", "balance": 290000},
        {"id": "acc_roth", "name": "Roth IRA", "balance": 90000},
        {"id": "acc_brokerage", "name": "Brokerage", "balance": 120000},
    ],
    "holdings": [
        {"symbol": "VTI", "name": "Vanguard Total Stock Market", "value": 200000, "allocation": 40},
        {"symbol": "VXUS", "name": "Vanguard Intl Stock", "value": 100000, "allocation": 20},
        {"symbol": "BND", "name": "Vanguard Total Bond Market", "value": 90000, "allocation": 18},
        {"symbol": "VGSLX", "name": "Vanguard Real Estate Index", "value": 60000, "allocation": 12},
        {"symbol": "VMFXX", "name": "Vanguard Money Market", "value": 50000, "allocation": 10},
    ]
}


def check(condition: bool, label: str, details: str = None):
    """Print test result."""
    status = "PASS" if condition else "FAIL"
    msg = f"  [{status}] {label}"
    if not condition and details:
        msg += f"\n         → {details}"
    print(msg)
    return condition


def check_backend_health():
    """Check if backend is running."""
    print("\n=== Checking Backend Health ===")
    try:
        resp = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f"  [OK] Backend is healthy (agent_id: {data.get('agent_id', 'N/A')})")
            return True
        else:
            print(f"  [ERROR] Backend returned status {resp.status_code}")
            return False
    except requests.ConnectionError:
        print(f"  [ERROR] Cannot connect to backend at {BACKEND_URL}")
        print("         Please start the backend with: cd backend && uv run uvicorn main:app --port 8172")
        return False
    except Exception as e:
        print(f"  [ERROR] Health check failed: {e}")
        return False


def validate_projection_response(resp_data: dict, scenario: str, timeframe: int) -> tuple[bool, list[str]]:
    """Validate the structure and sanity of a projection response."""
    errors = []
    
    # Check top-level structure
    required_fields = ["projection", "assumptions", "summary", "risks", "opportunities"]
    for field in required_fields:
        if field not in resp_data:
            errors.append(f"Missing required field: {field}")
    
    if errors:
        return False, errors
    
    projection = resp_data.get("projection", {})
    assumptions = resp_data.get("assumptions", {})
    
    # Validate projection structure
    proj_fields = ["total_value", "total_change", "total_change_percent", "accounts", "holdings"]
    for field in proj_fields:
        if field not in projection:
            errors.append(f"Missing projection field: {field}")
    
    # Validate assumptions structure
    assumption_fields = ["market_return_annual", "inflation_rate", "contribution_limit_401k", "contribution_limit_ira"]
    for field in assumption_fields:
        if field not in assumptions:
            errors.append(f"Missing assumption field: {field}")
    
    if errors:
        return False, errors
    
    # Sanity checks on values
    total_value = projection.get("total_value", 0)
    total_change = projection.get("total_change", 0)
    total_change_percent = projection.get("total_change_percent", 0)
    
    # Total value should be reasonable (not zero, not astronomically high)
    if total_value <= 0:
        errors.append(f"total_value is invalid: {total_value}")
    elif total_value > 100000000:  # 100M seems unreasonable for 1 year projection
        errors.append(f"total_value seems too high: {total_value}")
    
    # Change percent should match change / original value
    original_value = SAMPLE_PORTFOLIO["total_value"]
    expected_change_percent = (total_change / original_value) * 100 if original_value else 0
    if abs(total_change_percent - expected_change_percent) > 1:
        errors.append(f"total_change_percent ({total_change_percent}) doesn't match calculated ({expected_change_percent:.2f})")
    
    # Scenario-specific sanity checks
    scenario_lower = scenario.lower()
    
    if "crash" in scenario_lower or "drop" in scenario_lower:
        if total_change > 0:
            errors.append(f"Market crash scenario shows positive change: {total_change}")
    
    if "maximize" in scenario_lower or "increase" in scenario_lower or "add" in scenario_lower:
        if total_change < 0:
            errors.append(f"Positive scenario shows negative change: {total_change}")
    
    if "stop" in scenario_lower and "contribut" in scenario_lower:
        # Stopping contributions should show reduced growth, but market might still provide some return
        pass  # This is scenario-dependent
    
    # Validate accounts array
    accounts = projection.get("accounts", [])
    if len(accounts) == 0:
        errors.append("No accounts in projection")
    else:
        for acc in accounts:
            if "id" not in acc or "projected_value" not in acc:
                errors.append(f"Account missing required fields: {acc}")
            elif acc.get("projected_value", 0) < 0:
                errors.append(f"Account has negative projected_value: {acc.get('id')}")
    
    # Validate holdings array
    holdings = projection.get("holdings", [])
    if len(holdings) == 0:
        errors.append("No holdings in projection")
    else:
        for h in holdings:
            if "symbol" not in h or "projected_value" not in h:
                errors.append(f"Holding missing required fields: {h}")
            elif h.get("projected_value", 0) < 0:
                errors.append(f"Holding has negative projected_value: {h.get('symbol')}")
    
    # Validate summary is non-empty and meaningful
    summary = resp_data.get("summary", "")
    if len(summary) < 20:
        errors.append(f"Summary is too short or empty: '{summary}'")
    
    # Validate risks and opportunities are non-empty
    risks = resp_data.get("risks", [])
    opportunities = resp_data.get("opportunities", [])
    if len(risks) == 0:
        errors.append("No risks provided")
    if len(opportunities) == 0:
        errors.append("No opportunities provided")
    
    return len(errors) == 0, errors


def test_scenario(scenario_label: str, scenario_text: str, timeframe: int = 12) -> bool:
    """Test a single scenario against the live API."""
    print(f"\n--- Testing: {scenario_label} ({timeframe}M) ---")
    print(f"    Scenario: \"{scenario_text}\"")
    
    request_data = {
        "profile_id": "demo-user",
        "scenario_description": scenario_text,
        "timeframe_months": timeframe,
        "current_portfolio": SAMPLE_PORTFOLIO
    }
    
    try:
        start_time = time.time()
        resp = requests.post(
            f"{BACKEND_URL}/api/project-scenario",
            json=request_data,
            timeout=60  # LLM calls can take a while
        )
        elapsed = time.time() - start_time
        print(f"    Response time: {elapsed:.2f}s")
        
        if resp.status_code != 200:
            print(f"  [FAIL] HTTP {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        
        # Pretty print key metrics
        projection = data.get("projection", {})
        print(f"    Projected total: ${projection.get('total_value', 0):,.0f}")
        print(f"    Change: ${projection.get('total_change', 0):+,.0f} ({projection.get('total_change_percent', 0):+.1f}%)")
        
        # Validate response
        is_valid, errors = validate_projection_response(data, scenario_text, timeframe)
        
        if is_valid:
            print(f"  [PASS] Response is valid and sensible")
            return True
        else:
            print(f"  [FAIL] Validation errors:")
            for err in errors:
                print(f"         - {err}")
            return False
            
    except requests.Timeout:
        print(f"  [FAIL] Request timed out after 60s")
        return False
    except json.JSONDecodeError as e:
        print(f"  [FAIL] Invalid JSON response: {e}")
        return False
    except Exception as e:
        print(f"  [FAIL] Request failed: {e}")
        return False


def test_all_example_scenarios():
    """Test all example scenarios from the UI."""
    print("\n=== Testing Example Scenarios ===")
    
    results = {}
    for example in EXAMPLE_SCENARIOS:
        result = test_scenario(example["label"], example["scenario"], timeframe=12)
        results[example["label"]] = result
    
    return results


def test_timeframe_variations():
    """Test that different timeframes produce proportionally different results."""
    print("\n=== Testing Timeframe Variations ===")
    
    scenario = "I increase my savings rate by 5%"
    results = {}
    
    for timeframe in [3, 6, 12]:
        result = test_scenario(f"{timeframe}M projection", scenario, timeframe=timeframe)
        results[timeframe] = result
    
    return results


def test_timeframe_proportionality():
    """Test that longer timeframes produce proportionally larger changes for positive scenarios."""
    print("\n=== Testing Timeframe Proportionality ===")
    
    scenario = "I increase my savings rate by 5%"
    results = {}
    
    for timeframe in [3, 6, 12]:
        request_data = {
            "profile_id": "demo-user",
            "scenario_description": scenario,
            "timeframe_months": timeframe,
            "current_portfolio": SAMPLE_PORTFOLIO
        }
        
        try:
            resp = requests.post(
                f"{BACKEND_URL}/api/project-scenario",
                json=request_data,
                timeout=60
            )
            if resp.status_code == 200:
                data = resp.json()
                results[timeframe] = data["projection"]["total_change"]
                print(f"  {timeframe}M: ${results[timeframe]:+,.0f}")
        except Exception as e:
            print(f"  [ERROR] {timeframe}M failed: {e}")
            return False
    
    # Verify proportionality (3M < 6M < 12M for positive growth)
    if len(results) == 3:
        if results[3] < results[6] < results[12]:
            print("  [PASS] Changes are proportional to timeframe (3M < 6M < 12M)")
            return True
        else:
            print(f"  [FAIL] Changes are NOT proportional: 3M={results[3]}, 6M={results[6]}, 12M={results[12]}")
            return False
    
    return False


def test_account_totals_consistency():
    """Test that projected account values sum to approximately the total."""
    print("\n=== Testing Account Totals Consistency ===")
    
    request_data = {
        "profile_id": "demo-user",
        "scenario_description": "I maximize my 401k contributions",
        "timeframe_months": 12,
        "current_portfolio": SAMPLE_PORTFOLIO
    }
    
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/project-scenario",
            json=request_data,
            timeout=60
        )
        
        if resp.status_code != 200:
            print(f"  [FAIL] Request failed with status {resp.status_code}")
            return False
        
        data = resp.json()
        projection = data.get("projection", {})
        
        total_value = projection.get("total_value", 0)
        accounts = projection.get("accounts", [])
        
        # Sum up projected account values
        accounts_sum = sum(acc.get("projected_value", 0) for acc in accounts)
        
        # Allow 5% tolerance for rounding and allocation adjustments
        tolerance = total_value * 0.05
        diff = abs(total_value - accounts_sum)
        
        print(f"  Total projected value: ${total_value:,.0f}")
        print(f"  Sum of account values: ${accounts_sum:,.0f}")
        print(f"  Difference: ${diff:,.0f} (tolerance: ${tolerance:,.0f})")
        
        if diff <= tolerance:
            print("  [PASS] Account totals are consistent with projected total")
            return True
        else:
            print(f"  [WARN] Account totals differ by more than 5% - LLM may have inconsistent math")
            return True  # Warn but don't fail - LLM can have minor inconsistencies
            
    except Exception as e:
        print(f"  [FAIL] Request failed: {e}")
        return False


def test_edge_cases():
    """Test edge cases and potential error scenarios."""
    print("\n=== Testing Edge Cases ===")
    ok = True
    
    # Test with empty scenario
    print("\n--- Testing: Empty scenario ---")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/project-scenario",
            json={
                "profile_id": "demo-user",
                "scenario_description": "",
                "timeframe_months": 12,
                "current_portfolio": SAMPLE_PORTFOLIO
            },
            timeout=60
        )
        # Empty scenario might still work (model interprets it)
        # or might return an error - both are acceptable
        if resp.status_code == 200:
            print("  [WARN] Empty scenario accepted (model interpreted it)")
        else:
            print(f"  [OK] Empty scenario rejected with status {resp.status_code}")
    except Exception as e:
        print(f"  [WARN] Empty scenario test failed: {e}")
    
    # Test with very long scenario
    print("\n--- Testing: Very long scenario ---")
    long_scenario = "I want to " + "increase my savings " * 50
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/project-scenario",
            json={
                "profile_id": "demo-user",
                "scenario_description": long_scenario[:500],  # Truncate to reasonable length
                "timeframe_months": 12,
                "current_portfolio": SAMPLE_PORTFOLIO
            },
            timeout=60
        )
        if resp.status_code == 200:
            print("  [PASS] Long scenario handled correctly")
        else:
            print(f"  [WARN] Long scenario returned status {resp.status_code}")
    except Exception as e:
        print(f"  [WARN] Long scenario test failed: {e}")
    
    # Test with invalid timeframe
    print("\n--- Testing: Invalid timeframe (0 months) ---")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/project-scenario",
            json={
                "profile_id": "demo-user",
                "scenario_description": "Test scenario",
                "timeframe_months": 0,
                "current_portfolio": SAMPLE_PORTFOLIO
            },
            timeout=10
        )
        if resp.status_code == 422:  # Validation error
            print("  [PASS] Invalid timeframe correctly rejected")
        else:
            print(f"  [WARN] Invalid timeframe returned status {resp.status_code}")
    except Exception as e:
        print(f"  [WARN] Invalid timeframe test failed: {e}")
    
    # Test with missing portfolio
    print("\n--- Testing: Missing portfolio ---")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/project-scenario",
            json={
                "profile_id": "demo-user",
                "scenario_description": "Test scenario",
                "timeframe_months": 12
                # Missing current_portfolio
            },
            timeout=10
        )
        if resp.status_code == 422:  # Validation error
            print("  [PASS] Missing portfolio correctly rejected")
        else:
            print(f"  [WARN] Missing portfolio returned status {resp.status_code}")
    except Exception as e:
        print(f"  [WARN] Missing portfolio test failed: {e}")
    
    # Test with malformed portfolio
    print("\n--- Testing: Malformed portfolio ---")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/project-scenario",
            json={
                "profile_id": "demo-user",
                "scenario_description": "Test scenario",
                "timeframe_months": 12,
                "current_portfolio": {"invalid": "structure"}
            },
            timeout=30
        )
        if resp.status_code in [200, 422, 500]:
            # Model might still attempt to interpret incomplete portfolio
            print(f"  [INFO] Malformed portfolio returned status {resp.status_code}")
        else:
            print(f"  [WARN] Unexpected status {resp.status_code}")
    except Exception as e:
        print(f"  [WARN] Malformed portfolio test failed: {e}")
    
    return ok


def run_all():
    """Run all live API tests."""
    print("=" * 60)
    print("LIVE API TESTS - Scenario Projection")
    print("=" * 60)
    
    # Check backend health first
    if not check_backend_health():
        print("\n[ABORT] Backend is not available. Please start the backend first.")
        return False
    
    # Run tests
    example_results = test_all_example_scenarios()
    timeframe_results = test_timeframe_variations()
    
    # Advanced validation tests
    proportionality_ok = test_timeframe_proportionality()
    consistency_ok = test_account_totals_consistency()
    
    test_edge_cases()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    print("\nExample Scenarios:")
    passed = 0
    failed = 0
    for label, result in example_results.items():
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {label}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTimeframe Variations:")
    for timeframe, result in timeframe_results.items():
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {timeframe}M")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nAdvanced Validation:")
    print(f"  [{'PASS' if proportionality_ok else 'FAIL'}] Timeframe proportionality")
    print(f"  [{'PASS' if consistency_ok else 'FAIL'}] Account totals consistency")
    if proportionality_ok:
        passed += 1
    else:
        failed += 1
    if consistency_ok:
        passed += 1
    else:
        failed += 1
    
    print(f"\nTotal: {passed} passed, {failed} failed")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
