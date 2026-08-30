import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from eval.run_eval import score, safety_breakdown

with open(os.path.join(os.path.dirname(__file__), "..", "data", "cases.json"), encoding="utf-8") as f:
    CASES_BY_ID = {c["case_id"]: c for c in json.load(f)}


def test_perfect_predictions_score_100_percent():
    results = [{"case_id": cid, "verdict": c["ground_truth"]} for cid, c in CASES_BY_ID.items()]
    s = score(results, CASES_BY_ID)
    assert s["accuracy"] == 1.0
    assert s["confusion"]["fp"] == 0
    assert s["confusion"]["fn"] == 0


def test_all_wrong_predictions_score_0_percent():
    flip = {"fraud": "legit", "legit": "fraud"}
    results = [{"case_id": cid, "verdict": flip[c["ground_truth"]]} for cid, c in CASES_BY_ID.items()]
    s = score(results, CASES_BY_ID)
    assert s["accuracy"] == 0.0


def test_confusion_matrix_counts_are_correct():
    # deliberately: get case_01 (fraud) wrong as legit -> false negative
    # get case_02 (legit) wrong as fraud -> false positive
    results = []
    for cid, c in CASES_BY_ID.items():
        if cid == "case_01":
            results.append({"case_id": cid, "verdict": "legit"})
        elif cid == "case_02":
            results.append({"case_id": cid, "verdict": "fraud"})
        else:
            results.append({"case_id": cid, "verdict": c["ground_truth"]})

    s = score(results, CASES_BY_ID)
    assert s["confusion"]["fn"] == 1
    assert s["confusion"]["fp"] == 1
    assert s["accuracy"] == round(10 / 12, 3)


def test_unparseable_verdicts_counted_but_not_crash():
    results = [{"case_id": cid, "verdict": "unparseable"} for cid in CASES_BY_ID]
    s = score(results, CASES_BY_ID)
    assert s["confusion"]["unscored"] == 12
    assert s["accuracy"] == 0.0


def test_safety_breakdown_all_wrong_verdicts_flagged_is_zero_unsafe():
    # Mirrors the real observed result: every wrong verdict happened
    # to be flagged for review. Unsafe error rate should be exactly 0.
    results = []
    for cid, c in CASES_BY_ID.items():
        wrong = cid in ("case_03", "case_05", "case_06", "case_10")
        predicted = {"fraud": "legit", "legit": "fraud"}[c["ground_truth"]] if wrong else c["ground_truth"]
        results.append({"case_id": cid, "verdict": predicted, "requires_human_review": wrong})

    safety = safety_breakdown(results, CASES_BY_ID)
    assert safety["quadrants"]["wrong_no_review"] == 0
    assert safety["unsafe_error_rate"] == 0.0
    assert safety["quadrants"]["wrong_with_review"] == 4
    assert safety["unsafe_error_cases"] == []


def test_safety_breakdown_catches_a_genuinely_unsafe_case():
    # If even ONE wrong verdict slips through without a review flag,
    # this must be visible and non-zero — that's the whole point.
    results = []
    for cid, c in CASES_BY_ID.items():
        if cid == "case_01":
            results.append({"case_id": cid, "verdict": "legit", "requires_human_review": False})  # wrong AND unflagged
        else:
            results.append({"case_id": cid, "verdict": c["ground_truth"], "requires_human_review": False})

    safety = safety_breakdown(results, CASES_BY_ID)
    assert safety["quadrants"]["wrong_no_review"] == 1
    assert safety["unsafe_error_cases"] == ["case_01"]
    assert safety["unsafe_error_rate"] == round(1 / 12, 3)


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
