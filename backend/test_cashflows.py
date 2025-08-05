from main import enforce_cashflow_horizon, EXPECTED_CASHFLOW_YEARS


def test_enforce_basic():
    raw = [
        {"year": 0, "end_assets": 100000},
        {"year": 7, "end_assets": 150000},  # ignored
        {"year": 5, "end_assets": 140000},
        {"year": 10, "end_assets": 160000},
        {"year": 30, "end_assets": 500000},  # ignored
        {"year": 15, "end_assets": 170000},
        {"year": 20, "end_assets": 190000},
        {"year": 25, "end_assets": 210000},
    ]
    out = enforce_cashflow_horizon(raw)
    assert [p['year'] for p in out] == EXPECTED_CASHFLOW_YEARS
    assert len(out) == 6


def test_missing_years_and_depletion():
    raw = [
        {"year": 0, "end_assets": 50000},
        {"year": 5, "end_assets": 20000},
        # missing 10, 15; should forward fill until depletion
        {"year": 20, "end_assets": 0},  # depletion by year 20
        # missing 25; should be 0
    ]
    out = enforce_cashflow_horizon(raw)
    assert [p['year'] for p in out] == EXPECTED_CASHFLOW_YEARS
    # After depletion at year 20, year 25 should be 0
    y20 = next(p for p in out if p['year'] == 20)
    y25 = next(p for p in out if p['year'] == 25)
    assert y20['end_assets'] == 0
    assert y25['end_assets'] == 0


if __name__ == '__main__':
    test_enforce_basic()
    test_missing_years_and_depletion()
    print('Cashflow enforcement tests passed.')
