#!/usr/bin/env python3
"""
Generate Fabric Lakehouse Seed Data
═══════════════════════════════════════════════════════════════════════════════
Reads user_profiles.json + investment_products.json from backend/data/ and
generates CSV files (clients.csv, accounts.csv, holdings.csv, transactions.csv,
investment_products.csv) that can be uploaded to a Fabric Lakehouse.

The portfolio generation logic mirrors lib/mockPortfolio.ts so that the Fabric
lakehouse contains the same data structure the frontend expects.

Usage:
    python scripts/generate_fabric_seed_data.py [--output-dir scripts/seed_data]

Output:
    scripts/seed_data/
        clients.csv          – One row per client profile
        accounts.csv         – Retirement accounts (401k, Roth IRA, Brokerage)
        holdings.csv         – Stock/bond/ETF positions per account
        transactions.csv     – Recent transaction history
        investment_products.csv – Product catalogue by risk level
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# ── Paths ────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "backend" / "data"
DEFAULT_OUTPUT = ROOT / "scripts" / "seed_data"


# ── Load source data ─────────────────────────────────────────────────────────

def load_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Holdings by risk appetite (mirrors lib/mockPortfolio.ts) ─────────────────

CONSERVATIVE_HOLDINGS = [
    {"symbol": "BND",  "name": "Vanguard Total Bond Market ETF", "allocation": 40, "asset_class": "bonds"},
    {"symbol": "VTIP", "name": "Vanguard Short-Term Inflation-Protected", "allocation": 20, "asset_class": "bonds"},
    {"symbol": "VTI",  "name": "Vanguard Total Stock Market ETF", "allocation": 20, "asset_class": "stocks"},
    {"symbol": "VIG",  "name": "Vanguard Dividend Appreciation ETF", "allocation": 10, "asset_class": "stocks"},
    {"symbol": "VXUS", "name": "Vanguard Total Intl Stock ETF", "allocation": 10, "asset_class": "international"},
]

MEDIUM_HOLDINGS = [
    {"symbol": "VTI",  "name": "Vanguard Total Stock Market ETF", "allocation": 35, "asset_class": "stocks"},
    {"symbol": "VXUS", "name": "Vanguard Total Intl Stock ETF", "allocation": 15, "asset_class": "international"},
    {"symbol": "BND",  "name": "Vanguard Total Bond Market ETF", "allocation": 25, "asset_class": "bonds"},
    {"symbol": "VGT",  "name": "Vanguard Information Technology ETF", "allocation": 15, "asset_class": "stocks"},
    {"symbol": "VNQ",  "name": "Vanguard Real Estate ETF", "allocation": 10, "asset_class": "real_estate"},
]

AGGRESSIVE_HOLDINGS = [
    {"symbol": "VTI",  "name": "Vanguard Total Stock Market ETF", "allocation": 30, "asset_class": "stocks"},
    {"symbol": "VGT",  "name": "Vanguard Information Technology ETF", "allocation": 25, "asset_class": "stocks"},
    {"symbol": "VXUS", "name": "Vanguard Total Intl Stock ETF", "allocation": 15, "asset_class": "international"},
    {"symbol": "ARKK", "name": "ARK Innovation ETF", "allocation": 10, "asset_class": "stocks"},
    {"symbol": "VNQ",  "name": "Vanguard Real Estate ETF", "allocation": 10, "asset_class": "real_estate"},
    {"symbol": "BND",  "name": "Vanguard Total Bond Market ETF", "allocation": 10, "asset_class": "bonds"},
]

HOLDINGS_MAP = {
    "low": CONSERVATIVE_HOLDINGS,
    "medium": MEDIUM_HOLDINGS,
    "high": AGGRESSIVE_HOLDINGS,
}


# ── Account generation ───────────────────────────────────────────────────────

def generate_accounts(profile: dict) -> list[dict]:
    """Generate 401k, Roth IRA, and Brokerage accounts for a profile."""
    total_assets = profile.get("investment_assets", 0)
    accounts = []

    # 401k — ~50% of assets
    accounts.append({
        "client_id": profile["id"],
        "account_id": f"{profile['id']}-401k",
        "name": "Traditional 401(k)",
        "type": "401k",
        "balance": round(total_assets * 0.50, 2),
    })

    # Roth IRA — ~20%
    accounts.append({
        "client_id": profile["id"],
        "account_id": f"{profile['id']}-roth",
        "name": "Roth IRA",
        "type": "roth_ira",
        "balance": round(total_assets * 0.20, 2),
    })

    # Brokerage — ~30%
    accounts.append({
        "client_id": profile["id"],
        "account_id": f"{profile['id']}-brokerage",
        "name": "Individual Brokerage",
        "type": "brokerage",
        "balance": round(total_assets * 0.30, 2),
    })

    return accounts


# ── Holdings generation ──────────────────────────────────────────────────────

def generate_holdings(profile: dict, accounts: list[dict]) -> list[dict]:
    """Generate holdings across all accounts based on risk appetite."""
    risk = profile.get("risk_appetite", "medium")
    template = HOLDINGS_MAP.get(risk, MEDIUM_HOLDINGS)
    total_assets = sum(a["balance"] for a in accounts)
    holdings = []

    for acct in accounts:
        acct_share = acct["balance"] / total_assets if total_assets > 0 else 0
        for h in template:
            value = round(total_assets * (h["allocation"] / 100) * acct_share, 2)
            if value < 1:
                continue
            holdings.append({
                "client_id": profile["id"],
                "account_id": acct["account_id"],
                "symbol": h["symbol"],
                "name": h["name"],
                "allocation_pct": h["allocation"],
                "value": value,
                "asset_class": h["asset_class"],
            })

    return holdings


# ── Transaction generation ───────────────────────────────────────────────────

TRANSACTION_TYPES = ["contribution", "dividend", "buy", "sell", "rebalance"]

def generate_transactions(profile: dict, accounts: list[dict], count: int = 12) -> list[dict]:
    """Generate recent transaction history."""
    transactions = []
    random.seed(hash(profile["id"]))  # deterministic per profile
    now = datetime.now(timezone.utc)

    for i in range(count):
        acct = random.choice(accounts)
        tx_type = random.choice(TRANSACTION_TYPES)
        amount = round(random.uniform(100, 5000), 2)
        if tx_type == "sell":
            amount = -amount

        transactions.append({
            "client_id": profile["id"],
            "account_id": acct["account_id"],
            "transaction_id": f"tx-{profile['id']}-{i:04d}",
            "type": tx_type,
            "amount": amount,
            "date": (now - timedelta(days=random.randint(1, 180))).strftime("%Y-%m-%d"),
            "description": f"{tx_type.capitalize()} — {acct['name']}",
        })

    return sorted(transactions, key=lambda t: t["date"], reverse=True)


# ── Write CSV ─────────────────────────────────────────────────────────────────

def write_csv(rows: list[dict], path: Path) -> None:
    if not rows:
        print(f"  ⚠ No data for {path.name} — skipped")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✓ {path.name} ({len(rows)} rows)")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate Fabric Lakehouse seed data")
    parser.add_argument(
        "--output-dir", "-o",
        type=str,
        default=str(DEFAULT_OUTPUT),
        help="Directory to write CSV files (default: scripts/seed_data)",
    )
    args = parser.parse_args()
    out = Path(args.output_dir)

    print(f"Loading source data from {DATA_DIR}...")
    profiles = load_json(DATA_DIR / "user_profiles.json")
    products_raw = load_json(DATA_DIR / "investment_products.json")

    # ── Clients CSV ──────────────────────────────────────────────────────
    clients = []
    for p in profiles:
        clients.append({
            "id": p["id"],
            "name": p["name"],
            "email": p.get("email", ""),
            "age": p["age"],
            "salary": p["salary"],
            "current_cash": p["current_cash"],
            "investment_assets": p["investment_assets"],
            "yearly_savings_rate": p["yearly_savings_rate"],
            "risk_appetite": p["risk_appetite"],
            "target_retire_age": p["target_retire_age"],
            "target_monthly_income": p["target_monthly_income"],
            "advisor_id": p.get("advisor_id", ""),
            "jurisdiction": p.get("jurisdiction", "US"),
            "status": p.get("status", "healthy"),
            "description": p.get("description", ""),
            "portfolio_stocks": p.get("portfolio", {}).get("stocks", 0),
            "portfolio_bonds": p.get("portfolio", {}).get("bonds", 0),
            "portfolio_cash": p.get("portfolio", {}).get("cash", 0),
            "portfolio_real_estate": p.get("portfolio", {}).get("real_estate", 0),
            "portfolio_international": p.get("portfolio", {}).get("international", 0),
            "portfolio_crypto": p.get("portfolio", {}).get("crypto", 0),
            "created_at": p.get("created_at", datetime.now(timezone.utc).isoformat()),
            "updated_at": p.get("updated_at", datetime.now(timezone.utc).isoformat()),
        })

    # ── Accounts, Holdings, Transactions ─────────────────────────────────
    all_accounts = []
    all_holdings = []
    all_transactions = []

    for p in profiles:
        accounts = generate_accounts(p)
        holdings = generate_holdings(p, accounts)
        transactions = generate_transactions(p, accounts)
        all_accounts.extend(accounts)
        all_holdings.extend(holdings)
        all_transactions.extend(transactions)

    # ── Investment Products CSV ──────────────────────────────────────────
    products = []
    for risk_level, prods in products_raw.get("products_by_risk", {}).items():
        for prod in prods:
            products.append({
                "name": prod["name"],
                "risk_level": risk_level,
                "exp_return": prod.get("exp_return", 0),
                "risk_rating": prod.get("risk_rating", ""),
                "asset_class": prod.get("asset_class", ""),
                "description": prod.get("description", ""),
                "expense_ratio": prod.get("expense_ratio", 0),
                "minimum_investment": prod.get("minimum_investment", 0),
            })

    # ── Write all CSVs ───────────────────────────────────────────────────
    print(f"\nWriting seed data to {out}/...")
    write_csv(clients, out / "clients.csv")
    write_csv(all_accounts, out / "accounts.csv")
    write_csv(all_holdings, out / "holdings.csv")
    write_csv(all_transactions, out / "transactions.csv")
    write_csv(products, out / "investment_products.csv")

    print(f"\n✅ Done! {len(clients)} clients, {len(all_accounts)} accounts, "
          f"{len(all_holdings)} holdings, {len(all_transactions)} transactions, "
          f"{len(products)} products.")
    print(f"\nUpload these CSVs to your Fabric Lakehouse (jawad-demo-01) via the setup script.")


if __name__ == "__main__":
    main()
