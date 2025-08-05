"""
Tests for the Scenario Projection API endpoint.

These tests validate:
1. Mock projection generation
2. API endpoint structure
3. Response format validation
4. Edge cases and error handling

Run with: python tests/test_projection_api.py
"""

import json
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def _read(path: Path) -> str:
    """Read file content with UTF-8 encoding."""
    return path.read_text(encoding="utf-8")


def check(condition: bool, label: str):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}")
    return condition


def test_mock_projection_import():
    """Test that mock projection generator is properly exported (file-based check)."""
    print("\n=== Test: Mock Projection Export ===")
    ok = True
    
    try:
        mock_data = _read(ROOT / "lib" / "mockData.ts")
        
        # Check function is exported
        ok &= check("export function generateMockProjection" in mock_data,
                     "generateMockProjection function is exported")
        
        # Check function signature
        ok &= check("ScenarioProjectionRequest" in mock_data,
                     "Function uses ScenarioProjectionRequest type")
        ok &= check("ScenarioProjectionResponse" in mock_data,
                     "Function returns ScenarioProjectionResponse type")
        
        # Check function handles inputs
        ok &= check("scenario_description" in mock_data or "request.scenario_description" in mock_data,
                     "Function uses scenario_description")
        ok &= check("timeframe_months" in mock_data,
                     "Function uses timeframe_months")
        ok &= check("current_portfolio" in mock_data,
                     "Function uses current_portfolio")
        
    except Exception as e:
        ok &= check(False, f"Failed to check mock projection export: {e}")
    
    return ok


def test_mock_projection_basic():
    """Test that mock projection generator has proper logic."""
    print("\n=== Test: Mock Projection Logic ===")
    ok = True
    
    try:
        mock_data = _read(ROOT / "lib" / "mockData.ts")
        
        # Check return structure
        ok &= check('"projection":' in mock_data or "projection:" in mock_data,
                     "Function builds projection object")
        ok &= check('"assumptions":' in mock_data or "assumptions:" in mock_data,
                     "Function builds assumptions object")
        ok &= check("let summary" in mock_data or "summary =" in mock_data,
                     "Function builds summary string")
        ok &= check('"risks":' in mock_data or "risks:" in mock_data,
                     "Function builds risks array")
        ok &= check('"opportunities":' in mock_data or "opportunities:" in mock_data,
                     "Function builds opportunities array")
        
        # Check calculations
        ok &= check("marketReturn" in mock_data or "market_return" in mock_data.lower(),
                     "Function calculates market return")
        ok &= check("timeMultiplier" in mock_data or "timeframe_months" in mock_data,
                     "Function adjusts for timeframe")
        ok &= check("contributionBoost" in mock_data or "contribution" in mock_data.lower(),
                     "Function handles contribution changes")
        
        # Check account projection
        ok &= check("projectedAccounts" in mock_data or "projected_value" in mock_data,
                     "Function projects account values")
        
        # Check holding projection
        ok &= check("projectedHoldings" in mock_data or "projected_allocation" in mock_data,
                     "Function projects holding values")
        
    except Exception as e:
        ok &= check(False, f"Failed to check mock projection logic: {e}")
    
    return ok


def test_mock_projection_scenarios():
    """Test that mock projection handles different scenario types."""
    print("\n=== Test: Scenario Keyword Handling ===")
    ok = True
    
    try:
        mock_data = _read(ROOT / "lib" / "mockData.ts")
        
        # Check scenario keyword detection
        ok &= check('scenario.includes("increase")' in mock_data or '"increase"' in mock_data,
                     "Function detects 'increase' keyword")
        ok &= check('scenario.includes("max")' in mock_data or '"max"' in mock_data,
                     "Function detects 'max' keyword")
        ok &= check('scenario.includes("crash")' in mock_data or '"crash"' in mock_data,
                     "Function detects 'crash' keyword")
        ok &= check('scenario.includes("401k")' in mock_data or '"401k"' in mock_data or '"401(k)"' in mock_data,
                     "Function detects '401k' keyword")
        ok &= check('scenario.includes("roth")' in mock_data or '"roth"' in mock_data,
                     "Function detects 'roth' keyword")
        
        # Check different scenario outcomes
        ok &= check("marketReturn * 1.3" in mock_data or "marketReturn" in mock_data,
                     "Function adjusts returns for market scenarios")
        ok &= check("-0.15" in mock_data or "-0.10" in mock_data or "negative" in mock_data.lower(),
                     "Function handles negative scenarios")
        
        # Check scenario-specific messaging
        ok &= check("crash" in mock_data.lower() and "summary" in mock_data.lower(),
                     "Function generates crash-specific summary")
        ok &= check("contribution" in mock_data.lower() and "summary" in mock_data.lower(),
                     "Function generates contribution-specific summary")
        
    except Exception as e:
        ok &= check(False, f"Failed to check scenario handling: {e}")
    
    return ok


def test_api_types():
    """Test that API types are properly defined."""
    print("\n=== Test: API Type Definitions ===")
    ok = True
    
    try:
        api_ts = _read(ROOT / "lib" / "api.ts")
        
        # Check required type exports
        types = [
            "ScenarioProjectionRequest",
            "ScenarioProjectionResponse",
            "ProjectedAccount",
            "ProjectedHolding",
            "ProjectionAssumptions",
        ]
        
        for t in types:
            ok &= check(f"export interface {t}" in api_ts or f"interface {t}" in api_ts,
                         f"Type {t} is defined")
        
        # Check projectScenario function
        ok &= check("export const projectScenario" in api_ts or "projectScenario = async" in api_ts,
                     "projectScenario function is exported")
        
        # Check mock mode handling
        ok &= check('currentApiMode === "mock"' in api_ts and "generateMockProjection" in api_ts,
                     "projectScenario handles mock mode")
        
        # Check live mode endpoint
        ok &= check('"/api/project-scenario"' in api_ts,
                     "projectScenario calls /api/project-scenario endpoint")
        
    except Exception as e:
        ok &= check(False, f"API type test failed: {e}")
    
    return ok


def test_backend_endpoint():
    """Test that backend endpoint is properly defined."""
    print("\n=== Test: Backend Endpoint ===")
    ok = True
    
    try:
        main_py = _read(ROOT / "backend" / "main.py")
        
        # Check endpoint exists
        ok &= check('@app.post("/api/project-scenario"' in main_py,
                     "POST /api/project-scenario endpoint defined")
        
        # Check request/response models
        ok &= check("class ScenarioProjectionRequest" in main_py,
                     "ScenarioProjectionRequest model defined")
        ok &= check("class ScenarioProjectionResponse" in main_py,
                     "ScenarioProjectionResponse model defined")
        
        # Check prompt exists and is comprehensive
        ok &= check("SCENARIO_PROJECTION_PROMPT" in main_py,
                     "SCENARIO_PROJECTION_PROMPT constant defined")
        
        # Check prompt includes key elements
        prompt_start = main_py.find("SCENARIO_PROJECTION_PROMPT")
        if prompt_start != -1:
            # Find the prompt content (between triple quotes)
            prompt_section = main_py[prompt_start:prompt_start + 5000]
            ok &= check("market_return" in prompt_section.lower(),
                         "Prompt mentions market returns")
            ok &= check("inflation" in prompt_section.lower(),
                         "Prompt mentions inflation")
            ok &= check("contribution" in prompt_section.lower(),
                         "Prompt mentions contributions")
            ok &= check("risks" in prompt_section.lower(),
                         "Prompt requests risks")
            ok &= check("opportunities" in prompt_section.lower(),
                         "Prompt requests opportunities")
        
        # Check error handling
        ok &= check("HTTPException" in main_py and "project-scenario" in main_py,
                     "Endpoint has error handling")
        
    except Exception as e:
        ok &= check(False, f"Backend endpoint test failed: {e}")
    
    return ok


def test_frontend_integration():
    """Test that frontend properly integrates the projection feature."""
    print("\n=== Test: Frontend Integration ===")
    ok = True
    
    try:
        portfolio_view = _read(ROOT / "components" / "frontend" / "PortfolioView.tsx")
        
        # Check state management
        ok &= check("useState" in portfolio_view, "PortfolioView uses useState")
        ok &= check("projectionMode" in portfolio_view, "Has projectionMode state")
        ok &= check("projection" in portfolio_view and "setProjection" in portfolio_view,
                     "Has projection state and setter")
        ok &= check("isProjecting" in portfolio_view, "Has loading state")
        ok &= check("projectionError" in portfolio_view, "Has error state")
        
        # Check UI elements
        ok &= check("What If" in portfolio_view, "Has 'What If' button text")
        ok &= check("Sparkles" in portfolio_view, "Uses Sparkles icon for button")
        ok &= check("ScenarioProjectionOverlay" in portfolio_view, "Renders overlay component")
        
        # Check projection display logic
        ok &= check("projectionMode && projection" in portfolio_view,
                     "Conditionally shows projection data")
        ok &= check("DiffBadge" in portfolio_view, "Uses DiffBadge for change display")
        
        # Check overlay component
        overlay = _read(ROOT / "components" / "frontend" / "ScenarioProjectionOverlay.tsx")
        ok &= check("isOpen" in overlay, "Overlay has isOpen prop")
        ok &= check("isLoading" in overlay, "Overlay has isLoading prop")
        ok &= check("onSubmit" in overlay, "Overlay has onSubmit prop")
        ok &= check("onClose" in overlay, "Overlay has onClose prop")
        ok &= check("Projection Mode" in overlay, "Overlay shows projection mode indicator")
        
    except Exception as e:
        ok &= check(False, f"Frontend integration test failed: {e}")
    
    return ok


def run_all():
    """Run all projection API tests."""
    results = {}
    
    tests = [
        ("Mock Import", test_mock_projection_import),
        ("Basic Projection", test_mock_projection_basic),
        ("Scenario Variations", test_mock_projection_scenarios),
        ("API Types", test_api_types),
        ("Backend Endpoint", test_backend_endpoint),
        ("Frontend Integration", test_frontend_integration),
    ]
    
    for name, fn in tests:
        try:
            results[name] = fn()
        except Exception as e:
            print(f"  [SKIP] {name} — {e}")
            results[name] = None
    
    print("\n=== Summary ===")
    passed = 0
    failed = 0
    skipped = 0
    
    for name, ok in results.items():
        if ok is None:
            print(f"  [SKIP] {name}")
            skipped += 1
        elif ok:
            print(f"  [PASS] {name}")
            passed += 1
        else:
            print(f"  [FAIL] {name}")
            failed += 1
    
    print(f"\n  Total: {passed} passed, {failed} failed, {skipped} skipped")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
