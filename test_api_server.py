"""
Verifies api_server.py end-to-end WITHOUT a live model: patches
get_client() to return a MockClient with canned responses, then hits
the real FastAPI app through TestClient. Proves request parsing, case
construction, the real tool functions, and response serialization all
work correctly — the only untested part is what a real model says.
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from common.llm_client import LLMResponse, MockClient
from agent.run_agent import VERIFICATION_SYSTEM_PROMPT
import api_server


def _final_json(obj):
    return "```json\n" + json.dumps(obj) + "\n```"


def fake_get_client():
    call_count = {"n": 0}

    def responder(system, messages):
        call_count["n"] += 1
        if system == VERIFICATION_SYSTEM_PROMPT:
            return LLMResponse(text=_final_json({"evidence_supports_verdict": True, "concerns": "", "adjusted_confidence": 0.9}))
        if len(messages) == 1 and call_count["n"] > 0:
            # Baseline call (no tools involved) OR agent's first turn.
            # Simplest: always answer immediately with a verdict, no tool calls,
            # to exercise the full request/response path without needing to
            # simulate a real multi-turn tool loop.
            return LLMResponse(
                text=_final_json(
                    {
                        "verdict": "legit",
                        "confidence": 0.9,
                        "rationale": "test rationale",
                        "evidence_cited": ["test evidence"],
                    }
                )
            )
        return LLMResponse(text=_final_json({"verdict": "legit", "confidence": 0.9, "rationale": "test"}))

    return MockClient(responder)


def test_health_endpoint():
    client = TestClient(api_server.app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
    print("PASS  test_health_endpoint")


def test_triage_endpoint_full_round_trip():
    api_server.get_client = fake_get_client  # patch the module-level import

    client = TestClient(api_server.app)
    payload = {
        "amount_usd": 420.0,
        "merchant": "Barcelona Tapas Bar",
        "merchant_category": "restaurant",
        "country": "ES",
        "typical_country": "US",
        "typical_amount_min": 20.0,
        "typical_amount_max": 300.0,
        "account_age_days": 1500,
        "prior_flags_count": 0,
        "recent_transactions": [
            {"amount_usd": 90.0, "country": "ES", "minutes_ago": 800},
        ],
        "device_reputation_score": 0.85,
        "is_new_device": False,
    }
    resp = client.post("/api/triage", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert "baseline" in data and "agent" in data
    assert data["baseline"]["verdict"] == "legit"
    assert data["agent"]["verdict"] == "legit"
    # requires_human_review is enforced in code — confidence 0.9, legit,
    # verification agreed, so it should NOT require review here.
    assert data["agent"]["requires_human_review"] is False
    print("PASS  test_triage_endpoint_full_round_trip")


def test_triage_rejects_malformed_request():
    client = TestClient(api_server.app)
    resp = client.post("/api/triage", json={"amount_usd": "not a number"})
    assert resp.status_code == 422  # FastAPI/Pydantic validation error
    print("PASS  test_triage_rejects_malformed_request")


if __name__ == "__main__":
    test_health_endpoint()
    test_triage_endpoint_full_round_trip()
    test_triage_rejects_malformed_request()
    print("\nAll API server tests passed.")
