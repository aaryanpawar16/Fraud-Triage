import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.tools import (
    check_velocity,
    check_geo_mismatch,
    check_device_reputation,
    check_amount_anomaly,
    check_prior_flags,
    check_account_tenure,
)

with open(os.path.join(os.path.dirname(__file__), "..", "data", "cases.json"), encoding="utf-8") as f:
    CASES = {c["case_id"]: c for c in json.load(f)}


def test_velocity_catches_card_testing_burst():
    # case_06: five $1 charges within 15 minutes
    r = check_velocity(CASES["case_06"], window_minutes=30)
    assert r.result["transactions_in_window"] == 5
    assert r.result["high_velocity"] is True


def test_velocity_quiet_account_not_flagged():
    r = check_velocity(CASES["case_02"])
    assert r.result["high_velocity"] is False


def test_geo_mismatch_distinguishes_travel_from_isolated_mismatch():
    # case_03: mismatch vs typical, BUT matches recent trail (travel)
    r = check_geo_mismatch(CASES["case_03"])
    assert r.result["mismatch_vs_typical"] is True
    assert r.result["matches_recent_transaction_trail"] is True

    # case_01: mismatch vs typical, and does NOT match recent trail
    r2 = check_geo_mismatch(CASES["case_01"])
    assert r2.result["mismatch_vs_typical"] is True
    assert r2.result["matches_recent_transaction_trail"] is False


def test_device_reputation_independent_of_new_device_flag():
    # case_11: known device (not new) but low reputation
    r = check_device_reputation(CASES["case_11"])
    assert r.result["is_new_device"] is False
    assert r.result["low_reputation"] is True

    # case_07: new device but decent reputation
    r2 = check_device_reputation(CASES["case_07"])
    assert r2.result["is_new_device"] is True
    assert r2.result["low_reputation"] is False


def test_amount_anomaly_uses_account_specific_range_not_global_threshold():
    # case_12: $18,500 is huge in absolute terms, but within THIS
    # account's own typical range
    r = check_amount_anomaly(CASES["case_12"])
    assert r.result["above_typical_range"] is False

    # case_01: $4,200 is well outside a $15-$300 typical range
    r2 = check_amount_anomaly(CASES["case_01"])
    assert r2.result["above_typical_range"] is True
    assert r2.result["ratio_to_typical_max"] > 10


def test_prior_flags_and_tenure():
    r = check_prior_flags(CASES["case_11"])
    assert r.result["prior_flags_count"] == 2

    r2 = check_account_tenure(CASES["case_04"])
    assert r2.result["is_new_account"] is True  # 45 days old


if __name__ == "__main__":
    import traceback

    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    passed, failed = 0, 0
    for t in tests:
        try:
            t()
            print(f"PASS  {t.__name__}")
            passed += 1
        except AssertionError:
            print(f"FAIL  {t.__name__}")
            traceback.print_exc()
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
