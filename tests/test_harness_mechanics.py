"""
These tests prove the ORCHESTRATION is correct — the tool-calling
loop, message formatting, verification wiring, and the human-review
gate — using a deterministic MockClient. They say nothing about
whether a real model reasons well; that's what running with a real
ANTHROPIC_API_KEY against eval/run_eval.py measures. Mixing the two
up would be dishonest, so they're kept in separate files.
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.llm_client import LLMResponse, MockClient
from agent.run_agent import run_agent_on_case, HUMAN_REVIEW_CONFIDENCE_THRESHOLD, VERIFICATION_SYSTEM_PROMPT
from baseline.run_baseline import run_baseline_on_case

with open(os.path.join(os.path.dirname(__file__), "..", "data", "cases.json"), encoding="utf-8") as f:
    CASES = {c["case_id"]: c for c in json.load(f)}


def _final_json(obj):
    return "```json\n" + json.dumps(obj) + "\n```"


def test_baseline_parses_a_single_response():
    def responder(system, messages):
        return LLMResponse(text=_final_json({"verdict": "legit", "confidence": 0.9, "rationale": "looks fine"}))

    client = MockClient(responder)
    result = run_baseline_on_case(client, CASES["case_02"])

    assert result["verdict"] == "legit"
    assert result["confidence"] == 0.9
    assert result["tool_calls_made"] == 0
    assert len(client.call_log) == 1


def test_agent_tool_loop_executes_real_tools_and_logs_evidence():
    call_count = {"n": 0}

    def responder(system, messages):
        call_count["n"] += 1
        if call_count["n"] == 1:
            return LLMResponse(
                text="",
                tool_calls=[
                    {"id": "t1", "name": "check_geo_mismatch", "input": {}},
                    {"id": "t2", "name": "check_device_reputation", "input": {}},
                ],
            )
        elif call_count["n"] == 2:
            return LLMResponse(
                text=_final_json(
                    {
                        "verdict": "legit",
                        "confidence": 0.85,
                        "evidence_cited": ["geo matches recent trail", "device reputation high"],
                        "rationale": "Travel pattern matches recent transactions on a trusted device.",
                    }
                )
            )
        else:
            return LLMResponse(
                text=_final_json({"evidence_supports_verdict": True, "concerns": "", "adjusted_confidence": 0.88})
            )

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_03"])

    assert result["tool_calls_made"] == 2
    assert {e["tool"] for e in result["evidence_log"]} == {"check_geo_mismatch", "check_device_reputation"}
    geo_evidence = next(e for e in result["evidence_log"] if e["tool"] == "check_geo_mismatch")
    assert geo_evidence["result"]["matches_recent_transaction_trail"] is True
    assert result["verdict"] == "legit"
    assert result["confidence"] == 0.88


def test_fraud_verdict_always_requires_human_review_even_at_high_confidence():
    def responder(system, messages):
        if len(messages) == 1:
            return LLMResponse(
                text=_final_json({"verdict": "fraud", "confidence": 0.99, "evidence_cited": [], "rationale": "x"})
            )
        return LLMResponse(text=_final_json({"evidence_supports_verdict": True, "concerns": "", "adjusted_confidence": 0.99}))

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_01"])

    assert result["verdict"] == "fraud"
    assert result["confidence"] == 0.99
    assert result["requires_human_review"] is True


def test_low_confidence_legit_verdict_also_requires_human_review():
    def responder(system, messages):
        if system == VERIFICATION_SYSTEM_PROMPT:
            return LLMResponse(text=_final_json({"evidence_supports_verdict": True, "concerns": "", "adjusted_confidence": 0.5}))
        return LLMResponse(
            text=_final_json({"verdict": "legit", "confidence": 0.5, "evidence_cited": [], "rationale": "unsure"})
        )

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_09"])

    assert result["confidence"] == 0.5
    assert result["confidence"] < HUMAN_REVIEW_CONFIDENCE_THRESHOLD
    assert result["requires_human_review"] is True


def test_confident_verified_legit_verdict_does_not_require_review():
    def responder(system, messages):
        if system == VERIFICATION_SYSTEM_PROMPT:
            return LLMResponse(text=_final_json({"evidence_supports_verdict": True, "concerns": "", "adjusted_confidence": 0.95}))
        return LLMResponse(
            text=_final_json({"verdict": "legit", "confidence": 0.95, "evidence_cited": [], "rationale": "clean"})
        )

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_02"])

    assert result["verdict"] == "legit"
    assert result["requires_human_review"] is False


def test_verification_disagreement_forces_human_review_despite_high_stated_confidence():
    def responder(system, messages):
        if system == VERIFICATION_SYSTEM_PROMPT:
            return LLMResponse(
                text=_final_json(
                    {"evidence_supports_verdict": False, "concerns": "cited evidence contradicts verdict", "adjusted_confidence": 0.9}
                )
            )
        return LLMResponse(
            text=_final_json({"verdict": "legit", "confidence": 0.95, "evidence_cited": [], "rationale": "clean"})
        )

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_02"])

    assert result["requires_human_review"] is True


def test_tool_loop_hits_iteration_cap_gracefully():
    def responder(system, messages):
        return LLMResponse(text="", tool_calls=[{"id": "t", "name": "check_prior_flags", "input": {}}])

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_01"])

    assert result["verdict"] == "unresolved"
    assert result["requires_human_review"] is True


def test_syntactically_valid_json_missing_verdict_is_treated_as_a_failure():
    # This is the EXACT real failure found on a live Ollama run:
    # {"confidence": 0.6, ...} with no "verdict" key at all — valid
    # JSON, invalid schema. Must not silently become Python None.
    def responder(system, messages):
        if system == VERIFICATION_SYSTEM_PROMPT:
            return LLMResponse(text=_final_json({"evidence_supports_verdict": False, "concerns": "no verdict given", "adjusted_confidence": 0.6}))
        return LLMResponse(text=_final_json({"confidence": 0.6, "note": "need more evidence"}))

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_02"])

    assert result["verdict"] == "unparseable"
    assert result["requires_human_review"] is True


def test_explicit_null_verdict_is_also_treated_as_a_failure():
    # A model could also emit "verdict": null explicitly rather than
    # omitting the key — same failure class, must be caught the same way.
    def responder(system, messages):
        if system == VERIFICATION_SYSTEM_PROMPT:
            return LLMResponse(text=_final_json({"evidence_supports_verdict": False, "concerns": "", "adjusted_confidence": 0.0}))
        return LLMResponse(text=_final_json({"verdict": None, "confidence": 0.6, "evidence_cited": [], "rationale": None}))

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_02"])

    assert result["verdict"] == "unparseable"


def test_action_field_never_appears_in_agent_output():
    def responder(system, messages):
        if system == VERIFICATION_SYSTEM_PROMPT:
            return LLMResponse(text=_final_json({"evidence_supports_verdict": True, "concerns": "", "adjusted_confidence": 0.95}))
        return LLMResponse(
            text=_final_json({"verdict": "legit", "confidence": 0.95, "evidence_cited": [], "rationale": "x"})
        )

    client = MockClient(responder)
    result = run_agent_on_case(client, CASES["case_02"])
    assert "action" not in result
    assert "action_taken" not in result


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
