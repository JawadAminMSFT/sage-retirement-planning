"""
Admin API Routes
FastAPI router for admin-specific endpoints (product catalog, compliance, users).
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from models import (
    AdminProfile,
    RegulatoryRule,
    RegulatoryCategory,
    Jurisdiction,
    ComplianceReviewItem,
    ComplianceStatus,
    AccountType,
)
from advisor_storage import advisor_storage

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Request/Response Models ─────────────────────────────────────────────────

class ProductCreateRequest(BaseModel):
    name: str
    ticker: Optional[str] = None
    asset_class: str
    sub_class: Optional[str] = None
    risk_rating: str
    exp_return: float = Field(ge=0, le=1)
    expense_ratio: float = Field(ge=0, le=0.1)
    minimum_investment: float = Field(ge=0)
    jurisdictions: List[str] = ["US"]
    account_types: List[str] = []
    description: str
    prospectus_url: Optional[str] = None


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    ticker: Optional[str] = None
    asset_class: Optional[str] = None
    sub_class: Optional[str] = None
    risk_rating: Optional[str] = None
    exp_return: Optional[float] = None
    expense_ratio: Optional[float] = None
    minimum_investment: Optional[float] = None
    jurisdictions: Optional[List[str]] = None
    account_types: Optional[List[str]] = None
    description: Optional[str] = None
    prospectus_url: Optional[str] = None
    is_active: Optional[bool] = None


class RegulatoryRuleCreateRequest(BaseModel):
    jurisdiction: Jurisdiction
    category: RegulatoryCategory
    title: str
    description: str
    current_values: dict
    account_types: List[str] = []
    age_requirements: Optional[dict] = None
    income_requirements: Optional[dict] = None
    effective_date: str
    source_url: Optional[str] = None


class RegulatoryRuleUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    current_values: Optional[dict] = None
    account_types: Optional[List[str]] = None
    age_requirements: Optional[dict] = None
    income_requirements: Optional[dict] = None
    effective_date: Optional[str] = None
    source_url: Optional[str] = None
    is_active: Optional[bool] = None


class ComplianceReviewRequest(BaseModel):
    status: ComplianceStatus
    review_notes: str


class UserAssignAdvisorRequest(BaseModel):
    advisor_id: str


class AdminDashboardMetrics(BaseModel):
    total_clients: int
    total_advisors: int
    pending_compliance_reviews: int
    high_risk_reviews: int
    active_products: int
    active_regulatory_rules: int


# ─── Admin Profile Endpoints ─────────────────────────────────────────────────

@router.get("/{admin_id}", response_model=AdminProfile)
async def get_admin(admin_id: str):
    """Get admin profile by ID."""
    admin = await advisor_storage.get_admin(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin


@router.get("/dashboard/metrics", response_model=AdminDashboardMetrics)
async def get_admin_dashboard():
    """Get system-wide metrics for admin dashboard."""
    clients = await advisor_storage.get_all_clients()
    advisors = await advisor_storage.get_advisors()
    compliance_queue = await advisor_storage.get_compliance_queue(status="pending")
    high_risk_reviews = [c for c in compliance_queue if c.risk_level.value in ["high", "urgent"]]
    regulatory_rules = await advisor_storage.get_regulatory_rules()
    
    # Count active products from investment_products.json
    import json
    from pathlib import Path
    products_file = Path(__file__).parent / "data" / "investment_products.json"
    try:
        with open(products_file, "r") as f:
            products_data = json.load(f)
            active_products = sum(
                len(products) 
                for products in products_data.get("products_by_risk", {}).values()
            )
    except:
        active_products = 0
    
    return AdminDashboardMetrics(
        total_clients=len(clients),
        total_advisors=len(advisors),
        pending_compliance_reviews=len(compliance_queue),
        high_risk_reviews=len(high_risk_reviews),
        active_products=active_products,
        active_regulatory_rules=len([r for r in regulatory_rules if r.is_active]),
    )


# ─── Product Catalog Endpoints ───────────────────────────────────────────────

@router.get("/products")
async def get_products(
    risk_rating: Optional[str] = Query(None, description="Filter by risk: low, medium, high"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction: US, CA"),
    asset_class: Optional[str] = Query(None, description="Filter by asset class"),
):
    """Get all investment products."""
    import json
    from pathlib import Path
    
    products_file = Path(__file__).parent / "data" / "investment_products.json"
    try:
        with open(products_file, "r") as f:
            products_data = json.load(f)
    except:
        raise HTTPException(status_code=500, detail="Failed to load products")
    
    all_products = []
    for risk_level, products in products_data.get("products_by_risk", {}).items():
        for product in products:
            product["id"] = product.get("name", "").replace(" ", "-").lower()[:50]
            product["risk_category"] = risk_level
            all_products.append(product)
    
    # Apply filters
    if risk_rating:
        all_products = [p for p in all_products if p.get("risk_rating") == risk_rating]
    if jurisdiction:
        all_products = [p for p in all_products if jurisdiction in p.get("jurisdictions", ["US"])]
    if asset_class:
        all_products = [p for p in all_products if p.get("asset_class") == asset_class]
    
    return {"products": all_products, "count": len(all_products)}


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get a specific product by ID."""
    import json
    from pathlib import Path
    
    products_file = Path(__file__).parent / "data" / "investment_products.json"
    try:
        with open(products_file, "r") as f:
            products_data = json.load(f)
    except:
        raise HTTPException(status_code=500, detail="Failed to load products")
    
    for risk_level, products in products_data.get("products_by_risk", {}).items():
        for product in products:
            pid = product.get("name", "").replace(" ", "-").lower()[:50]
            if pid == product_id:
                product["id"] = pid
                product["risk_category"] = risk_level
                return product
    
    raise HTTPException(status_code=404, detail="Product not found")


# ─── Compliance Review Endpoints ─────────────────────────────────────────────

@router.get("/compliance/queue", response_model=List[ComplianceReviewItem])
async def get_compliance_queue(
    status: Optional[str] = Query(None, description="Filter by status"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
):
    """Get compliance review queue."""
    items = await advisor_storage.get_compliance_queue(status=status)
    
    if risk_level:
        items = [i for i in items if i.risk_level.value == risk_level]
    
    return items


@router.get("/compliance/queue/pending", response_model=List[ComplianceReviewItem])
async def get_pending_compliance():
    """Get pending compliance reviews."""
    return await advisor_storage.get_compliance_queue(status="pending")


@router.get("/compliance/{item_id}", response_model=ComplianceReviewItem)
async def get_compliance_item(item_id: str):
    """Get a specific compliance review item."""
    item = await advisor_storage.get_compliance_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
    return item


@router.put("/compliance/{item_id}/review", response_model=ComplianceReviewItem)
async def review_compliance_item(item_id: str, review: ComplianceReviewRequest, reviewer_id: str = Query(...)):
    """Review a compliance item (approve/reject)."""
    item = await advisor_storage.get_compliance_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")
    
    item.status = review.status
    item.review_notes = review.review_notes
    item.reviewer_id = reviewer_id
    item.reviewed_at = datetime.utcnow().isoformat()
    
    await advisor_storage.save_compliance_item(item)
    return item


@router.get("/compliance/stats")
async def get_compliance_stats():
    """Get compliance review statistics."""
    all_items = await advisor_storage.get_compliance_queue()
    
    stats = {
        "total": len(all_items),
        "by_status": {},
        "by_risk_level": {},
        "avg_review_time_hours": None,
    }
    
    for item in all_items:
        status = item.status.value
        stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
        
        risk = item.risk_level.value
        stats["by_risk_level"][risk] = stats["by_risk_level"].get(risk, 0) + 1
    
    # Calculate average review time for resolved items
    reviewed_items = [i for i in all_items if i.reviewed_at]
    if reviewed_items:
        total_hours = 0
        for item in reviewed_items:
            created = datetime.fromisoformat(item.created_at.replace("Z", "+00:00"))
            reviewed = datetime.fromisoformat(item.reviewed_at.replace("Z", "+00:00"))
            delta = (reviewed - created).total_seconds() / 3600
            total_hours += delta
        stats["avg_review_time_hours"] = round(total_hours / len(reviewed_items), 1)
    
    return stats


# ─── Regulatory Rules Endpoints ──────────────────────────────────────────────

@router.get("/regulatory", response_model=List[RegulatoryRule])
async def get_regulatory_rules(
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction: US, CA"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """Get all regulatory rules."""
    rules = await advisor_storage.get_regulatory_rules(jurisdiction=jurisdiction)
    
    if category:
        rules = [r for r in rules if r.category.value == category]
    
    return rules


@router.get("/regulatory/{jurisdiction}", response_model=List[RegulatoryRule])
async def get_regulatory_rules_by_jurisdiction(jurisdiction: str):
    """Get regulatory rules for a specific jurisdiction."""
    rules = await advisor_storage.get_regulatory_rules(jurisdiction=jurisdiction)
    return rules


@router.get("/regulatory/rule/{rule_id}", response_model=RegulatoryRule)
async def get_regulatory_rule(rule_id: str):
    """Get a specific regulatory rule."""
    rule = await advisor_storage.get_regulatory_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Regulatory rule not found")
    return rule


@router.post("/regulatory", response_model=RegulatoryRule)
async def create_regulatory_rule(rule_req: RegulatoryRuleCreateRequest, created_by: str = Query(...)):
    """Create a new regulatory rule."""
    rule = RegulatoryRule(
        jurisdiction=rule_req.jurisdiction,
        category=rule_req.category,
        title=rule_req.title,
        description=rule_req.description,
        current_values=rule_req.current_values,
        account_types=[AccountType(at) for at in rule_req.account_types],
        age_requirements=rule_req.age_requirements,
        income_requirements=rule_req.income_requirements,
        effective_date=rule_req.effective_date,
        source_url=rule_req.source_url,
        updated_by=created_by,
    )
    
    await advisor_storage.save_regulatory_rule(rule)
    return rule


@router.put("/regulatory/rule/{rule_id}", response_model=RegulatoryRule)
async def update_regulatory_rule(rule_id: str, update: RegulatoryRuleUpdateRequest, updated_by: str = Query(...)):
    """Update a regulatory rule."""
    rule = await advisor_storage.get_regulatory_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Regulatory rule not found")
    
    if update.title is not None:
        rule.title = update.title
    if update.description is not None:
        rule.description = update.description
    if update.current_values is not None:
        rule.current_values = update.current_values
    if update.account_types is not None:
        rule.account_types = [AccountType(at) for at in update.account_types]
    if update.age_requirements is not None:
        rule.age_requirements = update.age_requirements
    if update.income_requirements is not None:
        rule.income_requirements = update.income_requirements
    if update.effective_date is not None:
        rule.effective_date = update.effective_date
    if update.source_url is not None:
        rule.source_url = update.source_url
    if update.is_active is not None:
        rule.is_active = update.is_active
    
    rule.updated_by = updated_by
    rule.last_verified = datetime.utcnow().isoformat()
    
    await advisor_storage.save_regulatory_rule(rule)
    return rule


# ─── User Management Endpoints ───────────────────────────────────────────────

@router.get("/users")
async def get_all_users():
    """Get all users (clients, advisors, admins)."""
    clients = await advisor_storage.get_all_clients()
    advisors = await advisor_storage.get_advisors()
    admins = await advisor_storage.get_admins()
    
    return {
        "clients": [{"id": c.id, "name": c.name, "email": c.email, "role": "client", "advisor_id": c.advisor_id} for c in clients],
        "advisors": [{"id": a.id, "name": a.name, "email": a.email, "role": "advisor"} for a in advisors],
        "admins": [{"id": a.id, "name": a.name, "email": a.email, "role": "admin"} for a in admins],
    }


@router.put("/users/{client_id}/assign-advisor")
async def assign_advisor_to_client(client_id: str, assignment: UserAssignAdvisorRequest):
    """Assign an advisor to a client."""
    client = await advisor_storage.get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    advisor = await advisor_storage.get_advisor(assignment.advisor_id)
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    client.advisor_id = assignment.advisor_id
    await advisor_storage.update_client(client)
    
    return {"message": f"Client {client.name} assigned to advisor {advisor.name}"}
