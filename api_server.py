"""
Local HTTP API wrapping the real agent and baseline for the website's
live demo. Requires ANTHROPIC_API_KEY or a running Ollama instance,
exactly like eval/run_eval.py.

CORS is wide open (allow_origins=["*"]) on purpose: this is meant to
run locally, on your own machine, alongside `npm run dev` — the same
local-demo-only posture as advanced/internal/corsmw in the earlier
Turnstile project. Don't put this behind a public URL as-is.

Run with:
    uvicorn api_server:app --reload --port 8000
from this directory (project root), with LLM_PROVIDER / OLLAMA_MODEL
or ANTHROPIC_API_KEY set the same way as for eval/run_eval.py.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from common.llm_client import get_client
from agent.run_agent import run_agent_on_case
from baseline.run_baseline import run_baseline_on_case
from agent.pattern_detector import find_device_reuse
from agent.pattern_coordinator import run_pattern_coordinator

app = FastAPI(title="Fraud Triage Live Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecentTransaction(BaseModel):
    amount_usd: float
    country: str
    minutes_ago: int


class TriageRequest(BaseModel):
    amount_usd: float
    merchant: str
    merchant_category: str
    country: str
    device_id: str = "dev_web_demo"

    typical_country: str
    typical_amount_min: float
    typical_amount_max: float
    account_age_days: int
    prior_flags_count: int = 0
    recent_transactions: list[RecentTransaction] = Field(default_factory=list)

    device_reputation_score: float
    is_new_device: bool


def build_case(req: TriageRequest) -> dict:
    """Translates the web form into the same case shape the CLI tools
    and agent already expect — no special-casing needed downstream."""
    return {
        "case_id": "web_demo",
        "transaction": {
            "transaction_id": "txn_web_demo",
            "account_id": "acct_web_demo",
            "amount_usd": req.amount_usd,
            "merchant": req.merchant,
            "merchant_category": req.merchant_category,
            "country": req.country,
            "device_id": req.device_id,
            "timestamp": "2026-01-01T00:00:00Z",
        },
        "account_history": {
            "account_age_days": req.account_age_days,
            "typical_country": req.typical_country,
            "typical_amount_range_usd": [req.typical_amount_min, req.typical_amount_max],
            "recent_transactions": [
                {"amount_usd": t.amount_usd, "country": t.country, "minutes_ago": t.minutes_ago}
                for t in req.recent_transactions
            ],
            "prior_flags_count": req.prior_flags_count,
        },
        "device_info": {
            "device_id": req.device_id,
            "reputation_score": req.device_reputation_score,
            "is_new_device": req.is_new_device,
        },
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/triage")
def triage(req: TriageRequest):
    case = build_case(req)
    client = get_client()

    baseline_result = run_baseline_on_case(client, case)
    agent_result = run_agent_on_case(client, case)

    return {"baseline": baseline_result, "agent": agent_result}


class MiniTransaction(BaseModel):
    """Deliberately lighter than TriageRequest — pattern detection only
    needs account_id and device_id to find a link; the rest is for
    display only. Keeping this separate from Tier 1's full case shape
    keeps this endpoint scoped to what it actually tests."""

    account_id: str
    device_id: str
    merchant: str = "Unnamed merchant"
    amount_usd: float = 0
    country: str = "US"


class PatternCheckRequest(BaseModel):
    transactions: list[MiniTransaction] = Field(min_length=2)


@app.post("/api/pattern-check")
def pattern_check(req: PatternCheckRequest):
    cases = [
        {
            "case_id": f"live_ring_{i}",
            "transaction": {
                "account_id": t.account_id,
                "device_id": t.device_id,
                "merchant": t.merchant,
                "amount_usd": t.amount_usd,
                "country": t.country,
            },
        }
        for i, t in enumerate(req.transactions)
    ]

    clusters = find_device_reuse(cases)
    if not clusters:
        return {"clusters": [], "assessments": []}

    client = get_client()
    assessments = []
    for cluster in clusters:
        linked_cases = [c for c in cases if c["case_id"] in cluster.case_ids]
        assessments.append(run_pattern_coordinator(client, cluster, linked_cases))

    return {
        "clusters": [c.as_dict() for c in clusters],
        "assessments": assessments,
    }
