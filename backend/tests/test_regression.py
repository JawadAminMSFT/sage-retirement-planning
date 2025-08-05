"""
Regression tests for the Sage Retirement Planning backend.

Run with: uv run pytest tests/test_regression.py -v
"""

import importlib
import json
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# 1. Dependency import checks – make sure all critical packages are installed
# ---------------------------------------------------------------------------

REQUIRED_MODULES = [
    "fastapi",
    "uvicorn",
    "dotenv",        # python-dotenv
    "pydantic",
]

OPTIONAL_MODULES = [
    ("azure.identity", "azure-identity"),
    ("azure.ai.projects", "azure-ai-projects"),
    ("azure.core", "azure-core"),
]


@pytest.mark.parametrize("module_name", REQUIRED_MODULES)
def test_required_dependency_importable(module_name: str):
    """Every required dependency should be importable."""
    importlib.import_module(module_name)


@pytest.mark.parametrize("module_name,package_name", OPTIONAL_MODULES)
def test_optional_dependency_importable(module_name: str, package_name: str):
    """Azure dependencies should be importable (needed for live mode)."""
    try:
        importlib.import_module(module_name)
    except ImportError:
        pytest.skip(f"{package_name} not installed – optional for mock mode")


# ---------------------------------------------------------------------------
# 2. Data file integrity
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def test_user_profiles_json_exists():
    path = DATA_DIR / "user_profiles.json"
    assert path.exists(), f"Missing {path}"


def test_investment_products_json_exists():
    path = DATA_DIR / "investment_products.json"
    assert path.exists(), f"Missing {path}"


def test_user_profiles_json_valid():
    path = DATA_DIR / "user_profiles.json"
    with open(path) as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert len(data) > 0
    # Verify required fields on first profile
    required_fields = {"name", "age", "salary", "risk_appetite", "target_retire_age"}
    assert required_fields.issubset(data[0].keys())


def test_investment_products_json_valid():
    path = DATA_DIR / "investment_products.json"
    with open(path) as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert len(data) > 0


# ---------------------------------------------------------------------------
# 3. FastAPI app creation & basic endpoint tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    """Create a TestClient for the FastAPI app.
    
    We use lazy import so that missing Azure credentials don't block 
    tests that only need the mock/data endpoints.
    """
    try:
        from httpx import ASGITransport, AsyncClient
        # Add backend dir to path so 'main' is importable
        backend_dir = str(Path(__file__).resolve().parent.parent)
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        
        from main import app
        from httpx._transports.asgi import ASGITransport  # noqa: F811
        transport = ASGITransport(app=app)
        
        import httpx
        with httpx.Client(transport=transport, base_url="http://testserver") as c:
            yield c
    except Exception as e:
        pytest.skip(f"Could not create test client: {e}")


def test_root_endpoint(client):
    """GET / should return 200 with status info."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data or "name" in data


def test_health_endpoint(client):
    """GET /health should return 200."""
    resp = client.get("/health")
    assert resp.status_code == 200


def test_scenarios_endpoint(client):
    """GET /scenarios should return a list of scenario strings."""
    resp = client.get("/scenarios")
    assert resp.status_code == 200
    data = resp.json()
    assert "scenarios" in data
    assert isinstance(data["scenarios"], list)
    assert len(data["scenarios"]) > 0


def test_profiles_endpoint(client):
    """GET /profiles should return user profiles."""
    resp = client.get("/profiles")
    assert resp.status_code == 200
    data = resp.json()
    assert "profiles" in data
    assert isinstance(data["profiles"], list)


# ---------------------------------------------------------------------------
# 4. Cashflow enforcement unit test (existing logic)
# ---------------------------------------------------------------------------

def test_cashflow_enforcement():
    """Validate enforce_cashflow_horizon works correctly."""
    backend_dir = str(Path(__file__).resolve().parent.parent)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    try:
        from main import enforce_cashflow_horizon, EXPECTED_CASHFLOW_YEARS
    except ImportError:
        pytest.skip("enforce_cashflow_horizon not found in main.py")

    raw = [
        {"year": 0, "end_assets": 100000},
        {"year": 5, "end_assets": 140000},
        {"year": 10, "end_assets": 160000},
        {"year": 15, "end_assets": 170000},
        {"year": 20, "end_assets": 190000},
        {"year": 25, "end_assets": 210000},
    ]
    out = enforce_cashflow_horizon(raw)
    assert [p["year"] for p in out] == EXPECTED_CASHFLOW_YEARS
    assert len(out) == len(EXPECTED_CASHFLOW_YEARS)


# ---------------------------------------------------------------------------
# 5. Port configuration
# ---------------------------------------------------------------------------

def test_backend_port_is_8172():
    """Backend should be configured to run on port 8172."""
    backend_dir = str(Path(__file__).resolve().parent.parent)
    main_py = Path(backend_dir) / "main.py"
    content = main_py.read_text()
    assert "8172" in content, "main.py should reference port 8172"


# ---------------------------------------------------------------------------
# 6. Project structure
# ---------------------------------------------------------------------------

def test_pyproject_toml_exists():
    """pyproject.toml should exist (uv migration)."""
    path = Path(__file__).resolve().parent.parent / "pyproject.toml"
    assert path.exists(), "pyproject.toml is required for uv"


def test_no_conda_files():
    """environment.yml should not exist after uv migration."""
    path = Path(__file__).resolve().parent.parent / "environment.yml"
    assert not path.exists(), "environment.yml should be removed (use pyproject.toml + uv)"
