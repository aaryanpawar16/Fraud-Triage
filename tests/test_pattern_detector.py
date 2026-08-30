import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.pattern_detector import find_device_reuse

with open(
    os.path.join(os.path.dirname(__file__), "..", "data", "cases.json"), encoding="utf-8"
) as f:
    MAIN_CASES = json.load(f)

with open(
    os.path.join(os.path.dirname(__file__), "..", "data", "ring_cases.json"), encoding="utf-8"
) as f:
    RING_CASES = json.load(f)


def test_no_false_positives_on_the_clean_12_case_dataset():
    # Every device_id in the main dataset belongs to exactly one
    # account — the detector must not invent clusters that aren't
    # there.
    clusters = find_device_reuse(MAIN_CASES)
    assert clusters == []


def test_finds_the_real_ring_across_two_unrelated_accounts():
    clusters = find_device_reuse(RING_CASES)
    assert len(clusters) == 1
    cluster = clusters[0]
    assert cluster.device_id == "dev_shared_x7"
    assert cluster.linked_accounts == ["acct_ring_alpha", "acct_ring_beta"]
    assert cluster.case_ids == ["ring_01_alpha", "ring_02_beta"]


def test_ring_undetectable_when_cases_examined_separately():
    # This is the actual point of the feature: neither case alone
    # contains enough information to detect the link. Confirmed by
    # running the detector on each case individually.
    only_alpha = [c for c in RING_CASES if c["case_id"] == "ring_01_alpha"]
    only_beta = [c for c in RING_CASES if c["case_id"] == "ring_02_beta"]

    assert find_device_reuse(only_alpha) == []
    assert find_device_reuse(only_beta) == []
    # Only when both are considered together does the pattern appear
    assert len(find_device_reuse(RING_CASES)) == 1


def test_combined_real_and_ring_dataset_finds_exactly_the_real_cluster():
    all_cases = MAIN_CASES + RING_CASES
    clusters = find_device_reuse(all_cases)
    assert len(clusters) == 1
    assert clusters[0].device_id == "dev_shared_x7"


def test_three_way_device_reuse_also_detected():
    synthetic = [
        {"case_id": "a", "transaction": {"device_id": "dev_x", "account_id": "acct_1"}},
        {"case_id": "b", "transaction": {"device_id": "dev_x", "account_id": "acct_2"}},
        {"case_id": "c", "transaction": {"device_id": "dev_x", "account_id": "acct_3"}},
        {"case_id": "d", "transaction": {"device_id": "dev_y", "account_id": "acct_4"}},
    ]
    clusters = find_device_reuse(synthetic)
    assert len(clusters) == 1
    assert clusters[0].linked_accounts == ["acct_1", "acct_2", "acct_3"]
    assert set(clusters[0].case_ids) == {"a", "b", "c"}


def test_same_account_repeat_device_use_is_not_a_cluster():
    # A device appearing multiple times on the SAME account is normal
    # repeat usage, not a ring signature — must not be flagged.
    synthetic = [
        {"case_id": "a", "transaction": {"device_id": "dev_x", "account_id": "acct_1"}},
        {"case_id": "b", "transaction": {"device_id": "dev_x", "account_id": "acct_1"}},
    ]
    assert find_device_reuse(synthetic) == []


if __name__ == "__main__":
    import traceback

    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed, failed = 0, 0
    for t in tests:
        try:
            t()
            print("PASS  " + t.__name__)
            passed += 1
        except AssertionError:
            print("FAIL  " + t.__name__)
            traceback.print_exc()
            failed += 1
    print("\n" + str(passed) + " passed, " + str(failed) + " failed")
    sys.exit(1 if failed else 0)
