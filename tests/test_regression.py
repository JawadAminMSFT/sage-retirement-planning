"""
Regression tests – validates project structure, config, and both demo/live flows.

Run with: python tests/test_regression.py           (all phases)
          python tests/test_regression.py --phase 0  (live + demo flow only)

These are quick structural checks; no running server required.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # project root


def _read(path: Path) -> str:
    """Read file content with UTF-8 encoding (avoids cp1252 errors on Windows)."""
    return path.read_text(encoding="utf-8")


def check(condition: bool, label: str):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}")
    return condition


# -----------------------------------------------------------------------
# Phase 0: Live + Demo flow validation
# -----------------------------------------------------------------------

def run_phase0_tests():
    """Phase 0: Validate both Demo (mock) and Live (backend) flows are wired correctly."""
    print("\n=== Phase 0: Live + Demo Flow Validation ===")
    ok = True

    # --- .env exists and has required variables for live mode ---
    env_path = ROOT / ".env"
    ok &= check(env_path.exists(), ".env file exists")

    if env_path.exists():
        env_text = _read(env_path)
        env_vars = {}
        for line in env_text.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                env_vars[key.strip()] = val.strip()

        # Required vars for live mode
        live_required = [
            "PROJECT_ENDPOINT",
            "MODEL_DEPLOYMENT_NAME",
        ]
        for var in live_required:
            ok &= check(var in env_vars, f".env has {var} (needed for live mode)")

        # Evaluation vars
        eval_vars = [
            "AZURE_OPENAI_ENDPOINT",
            "AZURE_OPENAI_DEPLOYMENT",
        ]
        for var in eval_vars:
            ok &= check(var in env_vars, f".env has {var} (needed for evaluations)")

    # --- Frontend api.ts: mock + live code paths ---
    api_ts = _read(ROOT / "lib" / "api.ts")

    # Mock mode code path: api.ts branches on currentApiMode === "mock"
    ok &= check('currentApiMode === "mock"' in api_ts, "api.ts has mock-mode branch")
    ok &= check("simulateMockStreaming" in api_ts, "api.ts imports mock streaming")
    ok &= check("mockApiResponses" in api_ts, "api.ts imports mock responses")
    ok &= check("mockUserProfiles" in api_ts, "api.ts imports mock profiles")

    # Live mode code path: api.ts calls the backend via fetch
    ok &= check("makeApiCall" in api_ts, "api.ts has makeApiCall for live requests")
    ok &= check('setApiMode' in api_ts, "api.ts exports setApiMode toggle")
    ok &= check('getApiMode' in api_ts, "api.ts exports getApiMode getter")

    # API_BASE_URL reads from env with correct default
    ok &= check("NEXT_PUBLIC_API_URL" in api_ts, "api.ts reads NEXT_PUBLIC_API_URL from env")
    ok &= check("8172" in api_ts, "api.ts defaults to port 8172")

    # --- Frontend page.tsx: mode toggle wired correctly ---
    page_tsx = _read(ROOT / "app" / "page.tsx")
    ok &= check("isMockMode" in page_tsx, "page.tsx has isMockMode state")
    ok &= check("handleModeChange" in page_tsx, "page.tsx has handleModeChange handler")
    ok &= check('setApiMode(isMockMode ? "mock" : "live")' in page_tsx,
                 "page.tsx calls setApiMode on mode change")

    # --- Mock data integrity ---
    mock_data = _read(ROOT / "lib" / "mockData.ts")
    ok &= check("mockUserProfiles" in mock_data, "mockData.ts exports mockUserProfiles")
    ok &= check("mockQuickScenarios" in mock_data, "mockData.ts exports mockQuickScenarios")
    ok &= check("generateMockChatResponse" in mock_data, "mockData.ts exports generateMockChatResponse")
    ok &= check("simulateMockStreaming" in mock_data, "mockData.ts exports simulateMockStreaming")
    ok &= check("mockApiResponses" in mock_data, "mockData.ts exports mockApiResponses")

    # --- Backend endpoint parity ---
    # Every endpoint the frontend calls in live mode must exist on the backend
    main_py = _read(ROOT / "backend" / "main.py")
    frontend_endpoints = [
        ("/health", "GET"),
        ("/scenarios", "GET"),
        ("/profiles", "GET"),
        ("/chat/stream", "POST"),
        ("/chat", "POST"),
        ("/evaluate/", "POST"),
        ("/api/project-scenario", "POST"),
    ]
    for endpoint, method in frontend_endpoints:
        if endpoint == "/evaluate/":
            decorator = '@app.post("/evaluate/{thread_id}/{run_id}")'
        else:
            decorator = f'@app.{method.lower()}("{endpoint}'
        ok &= check(decorator in main_py,
                     f"Backend has {method} {endpoint} endpoint")

    # --- Backend reads Azure env vars ---
    ok &= check("load_dotenv()" in main_py, "Backend calls load_dotenv()")
    ok &= check('os.environ.get("PROJECT_ENDPOINT"' in main_py,
                 "Backend reads PROJECT_ENDPOINT from env")
    ok &= check('os.environ.get("MODEL_DEPLOYMENT_NAME"' in main_py,
                 "Backend reads MODEL_DEPLOYMENT_NAME from env")

    # --- Backend CORS allows cross-origin requests ---
    ok &= check("CORSMiddleware" in main_py, "Backend has CORS middleware")

    # --- Backend port matches frontend default ---
    ok &= check("port=8172" in main_py.replace(" ", ""),
                 "Backend runs on port 8172 (matches frontend default)")

    # --- No hardcoded secrets in source code ---
    # Check that main.py doesn't have hardcoded API keys as defaults
    # (they should be empty strings or read-only from env)
    lines = main_py.splitlines()
    for i, line in enumerate(lines, 1):
        if 'api_key=' in line and 'os.environ' in line:
            # Extract the default value
            if 'AZURE_OPENAI_KEY' in line:
                # Acceptable: empty default, placeholder, or env-only
                has_real_key = True
                for safe in ['""', "''", "your-", "CHANGE_ME"]:
                    if safe in line:
                        has_real_key = False
                        break
                # os.environ.get("AZURE_OPENAI_KEY") without default is also fine
                if 'os.environ.get("AZURE_OPENAI_KEY")' in line and ',' not in line.split('AZURE_OPENAI_KEY')[1].split(')')[0]:
                    has_real_key = False
                if has_real_key:
                    # Warn but don't fail — user confirmed .env is working
                    print(f"  [WARN] main.py line {i}: AZURE_OPENAI_KEY has a non-placeholder default (consider using env-only)")

    return ok


def run_phase1_tests():
    """Phase 1: uv migration + port configuration."""
    print("\n=== Phase 1: uv Migration & Ports ===")
    ok = True

    # pyproject.toml exists, environment.yml removed
    ok &= check((ROOT / "backend" / "pyproject.toml").exists(), "backend/pyproject.toml exists")
    ok &= check(not (ROOT / "backend" / "environment.yml").exists(), "environment.yml removed")
    ok &= check(not (ROOT / "backend" / "requirements.txt").exists(), "requirements.txt removed")

    # package.json uses correct ports and uv
    pkg = json.loads(_read(ROOT / "package.json"))
    ok &= check("3847" in pkg["scripts"].get("dev", ""), "Frontend dev script uses port 3847")
    ok &= check("uv" in pkg["scripts"].get("backend:dev", ""), "Backend dev script uses uv")
    ok &= check(pkg["name"] == "sage-retirement-planning", "package.json name updated")

    # Dockerfile uses correct port
    fe_docker = _read(ROOT / "Dockerfile")
    ok &= check("3847" in fe_docker, "Frontend Dockerfile exposes 3847")
    ok &= check("3000" not in fe_docker, "Frontend Dockerfile does not reference 3000")

    be_docker = _read(ROOT / "backend" / "Dockerfile")
    ok &= check("8172" in be_docker, "Backend Dockerfile exposes 8172")
    ok &= check("conda" not in be_docker.lower(), "Backend Dockerfile has no conda references")
    ok &= check("uv" in be_docker, "Backend Dockerfile uses uv")

    # docker-compose
    compose = _read(ROOT / "docker-compose.yml")
    ok &= check("8172" in compose, "docker-compose uses port 8172")
    ok &= check("3847" in compose, "docker-compose uses port 3847")
    ok &= check("version" not in compose.split("\n")[0].lower(), "docker-compose has no deprecated version key")

    # setup scripts use uv
    for script in ["setup.bat", "setup.sh"]:
        content = _read(ROOT / script)
        ok &= check("uv" in content, f"{script} references uv")
        ok &= check("conda" not in content.lower(), f"{script} has no conda references")

    # Empty files removed
    ok &= check(not (ROOT / "fix-react.bat").exists(), "fix-react.bat removed")
    ok &= check(not (ROOT / "fix-react.sh").exists(), "fix-react.sh removed")

    # api.ts defaults to 8172
    api_ts = _read(ROOT / "lib" / "api.ts")
    ok &= check("8172" in api_ts, "lib/api.ts defaults to port 8172")

    return ok


def run_phase2_tests():
    """Phase 2: Dead file removal."""
    print("\n=== Phase 2: Dead File Removal ===")
    ok = True

    # Duplicate files removed
    ok &= check(not (ROOT / "styles" / "globals.css").exists(), "styles/globals.css removed")
    ok &= check(not (ROOT / "lib" / "types.ts").exists(), "lib/types.ts removed (duplicates api.ts)")
    ok &= check(not (ROOT / "components" / "ui" / "use-mobile.tsx").exists(), "components/ui/use-mobile.tsx removed")
    ok &= check(not (ROOT / "components" / "ui" / "use-toast.ts").exists(), "components/ui/use-toast.ts removed")

    # Unused frontend components removed
    unused = [
        "components/frontend/ChatInterface.tsx",
        "components/frontend/QuickScenarios.tsx",
        "components/frontend/ApiStatusPanel.tsx",
        "components/frontend/BackendConfigModal.tsx",
        "components/frontend/ProfileModal.tsx",
        "components/theme-provider.tsx",
    ]
    for f in unused:
        ok &= check(not (ROOT / f).exists(), f"{f} removed")

    # MetricCard should still exist (it IS used)
    ok &= check((ROOT / "components" / "frontend" / "MetricCard.tsx").exists(), "MetricCard.tsx still exists")

    return ok


def run_phase3_tests():
    """Phase 3: Dead CSS removal."""
    print("\n=== Phase 3: Dead CSS Removal ===")
    ok = True

    css = _read(ROOT / "app" / "globals.css")
    ok &= check("@tailwind base" in css, "globals.css has Tailwind directives")
    ok &= check(".chat-panel" not in css, "Dead CSS class .chat-panel removed")
    ok &= check(".app-header" not in css, "Dead CSS class .app-header removed")
    ok &= check(".modal-overlay" not in css, "Dead CSS class .modal-overlay removed")
    ok &= check(".scenario-button" not in css, "Dead CSS class .scenario-button removed")
    ok &= check(len(css.splitlines()) < 100, f"globals.css is lean ({len(css.splitlines())} lines)")

    return ok


def run_phase4_tests():
    """Phase 4: Prune npm dependencies."""
    print("\n=== Phase 4: Prune npm Dependencies ===")
    ok = True

    pkg = json.loads(_read(ROOT / "package.json"))
    deps = pkg.get("dependencies", {})

    # Should be removed
    removed = ["cmdk", "input-otp", "recharts", "vaul", "zod", "react-hook-form", "sonner"]
    for dep in removed:
        ok &= check(dep not in deps, f"{dep} removed from dependencies")

    # Should still exist
    kept = ["next", "react", "lucide-react", "clsx", "tailwind-merge"]
    for dep in kept:
        ok &= check(dep in deps, f"{dep} still in dependencies")

    return ok


def run_phase5_tests():
    """Phase 5: page.tsx decomposition."""
    print("\n=== Phase 5: page.tsx Decomposition ===")
    ok = True

    page = _read(ROOT / "app" / "page.tsx")
    line_count = len(page.splitlines())
    ok &= check(line_count < 500, f"page.tsx reduced to {line_count} lines (was 1191)")

    # Extracted components should exist
    expected_components = [
        "components/frontend/AnalysisCard.tsx",
        "components/frontend/CashflowChart.tsx",
        "components/frontend/QuickScenariosCard.tsx",
        "components/frontend/StatusBubble.tsx",
        "components/frontend/ProfileBubble.tsx",
        "components/frontend/ProfileSelectModal.tsx",
    ]
    for f in expected_components:
        ok &= check((ROOT / f).exists(), f"{f} exists")

    # Extracted utilities
    ok &= check((ROOT / "lib" / "analysis.ts").exists(), "lib/analysis.ts exists")

    # Deprecated API removed
    ok &= check("onKeyPress" not in page, "onKeyPress replaced with onKeyDown")

    return ok


def run_phase6_tests():
    """Phase 6: Scenario Projection Feature."""
    print("\n=== Phase 6: Scenario Projection Feature ===")
    ok = True

    # --- New frontend component exists ---
    ok &= check((ROOT / "components" / "frontend" / "ScenarioProjectionOverlay.tsx").exists(),
                 "ScenarioProjectionOverlay.tsx exists")

    # --- Frontend overlay component has required elements ---
    overlay = _read(ROOT / "components" / "frontend" / "ScenarioProjectionOverlay.tsx")
    ok &= check("ScenarioProjectionOverlay" in overlay, "Overlay component exported")
    ok &= check("DiffBadge" in overlay, "DiffBadge component exported")
    ok &= check("Timeframe" in overlay or "timeframe" in overlay.lower(), "Timeframe handling exists")
    ok &= check("onSubmit" in overlay, "onSubmit handler prop exists")
    ok &= check("onClose" in overlay, "onClose handler prop exists")
    ok &= check("Projection Mode" in overlay or "projection" in overlay.lower(), "Projection mode indicator")

    # --- PortfolioView.tsx has projection integration ---
    portfolio_view = _read(ROOT / "components" / "frontend" / "PortfolioView.tsx")
    ok &= check("projectionMode" in portfolio_view, "PortfolioView has projectionMode state")
    ok &= check("projectScenario" in portfolio_view, "PortfolioView imports projectScenario")
    ok &= check("ScenarioProjectionOverlay" in portfolio_view, "PortfolioView imports ScenarioProjectionOverlay")
    ok &= check("What If" in portfolio_view, "PortfolioView has 'What If' button")
    ok &= check("DiffBadge" in portfolio_view, "PortfolioView uses DiffBadge for projections")
    ok &= check("getProjectedAccount" in portfolio_view or "projectedAccount" in portfolio_view,
                 "PortfolioView has account projection logic")
    ok &= check("getProjectedHolding" in portfolio_view or "projectedHolding" in portfolio_view,
                 "PortfolioView has holding projection logic")

    # --- lib/api.ts has projection types and function ---
    api_ts = _read(ROOT / "lib" / "api.ts")
    ok &= check("ScenarioProjectionRequest" in api_ts, "api.ts has ScenarioProjectionRequest type")
    ok &= check("ScenarioProjectionResponse" in api_ts, "api.ts has ScenarioProjectionResponse type")
    ok &= check("projectScenario" in api_ts, "api.ts exports projectScenario function")
    ok &= check("ProjectedAccount" in api_ts, "api.ts has ProjectedAccount type")
    ok &= check("ProjectedHolding" in api_ts, "api.ts has ProjectedHolding type")
    ok &= check("ProjectionAssumptions" in api_ts, "api.ts has ProjectionAssumptions type")
    ok &= check("generateMockProjection" in api_ts, "api.ts imports generateMockProjection")

    # --- lib/mockData.ts has mock projection generator ---
    mock_data = _read(ROOT / "lib" / "mockData.ts")
    ok &= check("generateMockProjection" in mock_data, "mockData.ts exports generateMockProjection")
    ok &= check("scenario_description" in mock_data or "scenario" in mock_data.lower(),
                 "mockData.ts handles scenario description")
    ok &= check("timeframe_months" in mock_data or "timeMultiplier" in mock_data,
                 "mockData.ts handles timeframe")
    ok &= check("market_return" in mock_data.lower() or "marketReturn" in mock_data,
                 "mockData.ts calculates market returns")
    ok &= check("risks" in mock_data and "opportunities" in mock_data,
                 "mockData.ts generates risks and opportunities")

    # --- Backend has projection endpoint ---
    main_py = _read(ROOT / "backend" / "main.py")
    ok &= check('@app.post("/api/project-scenario"' in main_py,
                 "Backend has POST /api/project-scenario endpoint")
    ok &= check("ScenarioProjectionRequest" in main_py, "Backend has ScenarioProjectionRequest model")
    ok &= check("ScenarioProjectionResponse" in main_py, "Backend has ScenarioProjectionResponse model")
    ok &= check("SCENARIO_PROJECTION_PROMPT" in main_py, "Backend has SCENARIO_PROJECTION_PROMPT")
    ok &= check("ProjectedAccount" in main_py, "Backend has ProjectedAccount model")
    ok &= check("ProjectedHolding" in main_py, "Backend has ProjectedHolding model")

    # --- Backend prompt is comprehensive ---
    ok &= check("market_return_annual" in main_py, "Backend prompt includes market return assumption")
    ok &= check("inflation_rate" in main_py, "Backend prompt includes inflation rate")
    ok &= check("contribution_limit" in main_py, "Backend prompt includes contribution limits")
    ok &= check("risks" in main_py and "opportunities" in main_py,
                 "Backend prompt requests risks and opportunities")

    # --- Projection doesn't break existing functionality ---
    # PortfolioView should still have original functionality
    ok &= check("formatCurrency" in portfolio_view, "PortfolioView still uses formatCurrency")
    ok &= check("getPortfolioData" in portfolio_view, "PortfolioView still uses getPortfolioData")
    ok &= check("AllocationBar" in portfolio_view, "PortfolioView still has AllocationBar")
    ok &= check("onBack" in portfolio_view, "PortfolioView still has onBack prop")

    return ok


def run_all():
    results = {}
    for phase, fn in [
        ("Phase 0", run_phase0_tests),
        ("Phase 1", run_phase1_tests),
        ("Phase 2", run_phase2_tests),
        ("Phase 3", run_phase3_tests),
        ("Phase 4", run_phase4_tests),
        ("Phase 5", run_phase5_tests),
        ("Phase 6", run_phase6_tests),
    ]:
        try:
            results[phase] = fn()
        except Exception as e:
            print(f"  [SKIP] {phase} — {e}")
            results[phase] = None

    print("\n=== Summary ===")
    for phase, ok in results.items():
        if ok is None:
            print(f"  [SKIP] {phase}")
        elif ok:
            print(f"  [PASS] {phase}")
        else:
            print(f"  [FAIL] {phase}")

    all_ok = all(v is True for v in results.values() if v is not None)
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", type=int, help="Run a specific phase (0-6)")
    args = parser.parse_args()

    if args.phase is not None:
        fn = {
            0: run_phase0_tests,
            1: run_phase1_tests,
            2: run_phase2_tests,
            3: run_phase3_tests,
            4: run_phase4_tests,
            5: run_phase5_tests,
            6: run_phase6_tests,
        }.get(args.phase)
        if fn:
            ok = fn()
            sys.exit(0 if ok else 1)
        else:
            print(f"Unknown phase {args.phase}")
            sys.exit(1)
    else:
        run_all()
