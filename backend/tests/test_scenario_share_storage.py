import asyncio
from pathlib import Path

from storage import LocalStorage, ScenarioShareRecord


def test_save_and_filter_scenario_shares(tmp_path: Path):
    storage = LocalStorage(data_dir=str(tmp_path / "user_data"))

    accepted = ScenarioShareRecord(
        user_id="demo-user",
        advisor_id="advisor-jane",
        scenario_description="Retire at 62 with same contributions",
        analysis_payload={"predictions": {"metrics": {"success_rate_pct": 78}}},
        consent_status="accepted",
    )
    rejected = ScenarioShareRecord(
        user_id="demo-user",
        advisor_id="advisor-jane",
        scenario_description="Market crash simulation",
        analysis_payload={"predictions": {"metrics": {"success_rate_pct": 61}}},
        consent_status="rejected",
    )

    asyncio.run(storage.save_scenario_share(accepted))
    asyncio.run(storage.save_scenario_share(rejected))

    accepted_only = asyncio.run(
        storage.list_scenario_shares(
            user_id="demo-user",
            advisor_id="advisor-jane",
            consent_status="accepted",
        )
    )
    assert len(accepted_only) == 1
    assert accepted_only[0].scenario_description == "Retire at 62 with same contributions"

    all_for_user = asyncio.run(storage.list_scenario_shares(user_id="demo-user"))
    assert len(all_for_user) == 2
    assert {record.consent_status for record in all_for_user} == {"accepted", "rejected"}
