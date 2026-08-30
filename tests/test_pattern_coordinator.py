import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.llm_client import LLMResponse, MockClient
from agent.pattern_detector import find_device_reuse
from agent.pattern_coordinator import run_pattern_coordinator

with open(
    os.path.join(os.path.dirname(__file__), "..", "data", "ring_cases.json"), encoding="utf-8"
) as f:
    RING_CASES = json.load(f)


def _final_json(obj):
    return "```json\n" + json.dumps(obj) + "\n```"


def test_coordinator_receives_the_real_detected_cluster():
    clusters = find_device_reuse(RING_CASES)
    assert len(clusters) == 1
    cluster = clusters[0]

    def responder(system, messages):
        # The cluster's real accounts must actually be in the prompt
        # sent to the model — not just in the harness's own bookkeeping.
        content = messages[0]["content"]
        assert "acct_ring_alpha" in content
        assert "acct_ring_beta" in content
        assert "dev_shared_x7" in content
        return LLMResponse(
            text=_final_json(
                {
                    "assessment": "likely_ring",
                    "confidence": 0.85,
                    "reasoning": "Same device across two unrelated new accounts.",
                    "recommended_action": "Freeze both accounts pending manual review.",
                }
            )
        )

    client = MockClient(responder)
    result = run_pattern_coordinator(client, cluster, RING_CASES)

    assert result["assessment"] == "likely_ring"
    assert result["confidence"] == 0.85
    assert result["cluster"]["device_id"] == "dev_shared_x7"


def test_coordinator_malformed_response_degrades_safely():
    clusters = find_device_reuse(RING_CASES)
    cluster = clusters[0]

    def responder(system, messages):
        return LLMResponse(text="not valid json at all")

    client = MockClient(responder)
    result = run_pattern_coordinator(client, cluster, RING_CASES)

    assert result["assessment"] == "insufficient_evidence"
    assert "could not be parsed" in result["reasoning"]
    # a parse failure must still recommend a safe default, not silently drop
    assert "Manual review" in result["recommended_action"]


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
