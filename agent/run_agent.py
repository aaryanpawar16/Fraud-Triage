"""
The agent. Given only the raw transaction (NOT the account history or
device info up front — that has to be actively gathered), it:

  1. Calls tools to derive evidence (velocity, geo-mismatch-vs-trail,
     device reputation, amount anomaly vs THIS account's own range,
     prior flags, tenure).
  2. Proposes a verdict grounded in that evidence.
  3. Runs a separate verification pass that checks whether the
     evidence actually supports the verdict, before the verdict is
     finalized.
  4. Never outputs an action. Only a recommendation. Ground rules 4/5
     require a human in the loop for anything consequential — this is
     enforced in code below (checked *in Python*, not left to the
     model to remember), not just requested in the prompt.
"""

from __future__ import annotations
import json
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.tools import TOOLS
from common.llm_client import parse_json_block

MAX_TOOL_ITERATIONS = 8
HUMAN_REVIEW_CONFIDENCE_THRESHOLD = 0.75

TOOL_DEFINITIONS = [
    {
        "name": "check_velocity",
        "description": (
            "Counts how many of this account's recent transactions landed "
            "within the last N minutes. Use this to detect rapid bursts of "
            "activity (e.g. card-testing) that a single transaction viewed "
            "in isolation would not reveal. Returns transactions_in_window "
            "and a high_velocity boolean (true at 3+ in the window)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "window_minutes": {
                    "type": "integer",
                    "description": "Lookback window in minutes. Defaults to 30 if omitted.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "check_geo_mismatch",
        "description": (
            "Compares the transaction's country to the account's typical "
            "country AND to the countries of recent transactions. A "
            "mismatch against typical country that ALSO matches a recent "
            "transaction trail usually indicates genuine travel, not "
            "takeover — always call this before concluding a country "
            "mismatch is suspicious on its own."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "check_device_reputation",
        "description": (
            "Returns the device's reputation score (0-1, lower is worse) "
            "and whether it's new to this account. These are independent "
            "signals — a long-known device can still have a low reputation "
            "score, and a brand-new device isn't automatically high risk. "
            "Check both, don't infer one from the other."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "check_amount_anomaly",
        "description": (
            "Compares the transaction amount to THIS SPECIFIC account's "
            "own historical typical range — not a population-wide "
            "threshold. A large absolute amount can be entirely normal "
            "for a high-transaction-volume account."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "check_prior_flags",
        "description": "Returns how many times this account has been flagged before.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "check_account_tenure",
        "description": "Returns the account's age in days and whether it counts as new (<90 days).",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]

AGENT_SYSTEM_PROMPT = """You are a fraud triage agent. You are given a flagged
transaction with only its basic fields — you do NOT have the account's history
or device information yet. You must call tools to gather that evidence before
forming a judgment. Do not guess at information a tool could give you.

A single signal is rarely sufficient evidence on its own. Before forming a
verdict, you should typically call SEVERAL of the available tools —
check_velocity, check_geo_mismatch, check_device_reputation,
check_amount_anomaly, check_prior_flags, check_account_tenure — not just one.
An amount that looks unremarkable can still sit on a brand-new, low-reputation
device; a geo mismatch can be explained by a recent travel trail or not.
Gather enough evidence to actually cross-check signals against each other,
not just enough for a single data point.

Call whichever tools are relevant. You may call more than one, and you may
call them in any order. When you have enough evidence, stop calling tools and
respond with ONLY a fenced JSON block in this exact shape:
```json
{
  "verdict": "fraud" | "legit",
  "confidence": <float 0.0-1.0>,
  "evidence_cited": ["<short phrase citing a specific tool result that drove this>", "..."],
  "rationale": "<two or three sentences connecting the evidence to the verdict>"
}
```
The "verdict" field is REQUIRED and must be exactly "fraud" or "legit" — never
omit it, and never use this JSON block to ask a question or request more
information. If you are uncertain, still commit to your best verdict and
reflect the uncertainty honestly in a lower "confidence" value instead.
Do not include any text outside the tool calls and this final JSON block."""

VERIFICATION_SYSTEM_PROMPT = """You are a second reviewer checking another
analyst's fraud triage conclusion before it goes to a human for final sign-off.
You will be shown the transaction, all the evidence that was gathered, and the
proposed verdict. Your job is NOT to re-decide from scratch — it's to check
whether the stated evidence actually supports the stated verdict and
confidence, and to flag it if not.

Respond with ONLY a fenced JSON block:
```json
{
  "evidence_supports_verdict": true | false,
  "concerns": "<specific gaps or contradictions, or empty string if none>",
  "adjusted_confidence": <float 0.0-1.0, your own calibrated confidence after review>
}
```"""


def _execute_tool(name: str, case: dict, tool_input: dict) -> dict:
    fn = TOOLS.get(name)
    if fn is None:
        return {"error": f"unknown tool: {name}"}
    try:
        if name == "check_velocity" and "window_minutes" in tool_input:
            result = fn(case, window_minutes=tool_input["window_minutes"])
        else:
            result = fn(case)
        return result.result
    except Exception as e:  # tool errors are reported to the model, not raised
        return {"error": str(e)}


def _run_tool_loop(client, case: dict):
    """Returns (final_parsed_verdict, evidence_log)."""
    transaction_only = {"transaction": case["transaction"]}
    messages = [
        {
            "role": "user",
            "content": (
                "A transaction has been flagged for review. Here is the "
                "transaction (account history and device info are NOT "
                "included — call tools to gather them):\n\n"
                f"```json\n{json.dumps(transaction_only, indent=2)}\n```"
            ),
        }
    ]
    evidence_log = []

    for _ in range(MAX_TOOL_ITERATIONS):
        resp = client.complete(
            system=AGENT_SYSTEM_PROMPT,
            messages=messages,
            tools=TOOL_DEFINITIONS,
        )

        if not resp.tool_calls:
            try:
                parsed = parse_json_block(resp.text)
                if parsed.get("verdict") not in ("fraud", "legit"):
                    # This is the exact failure mode found on a real run
                    # with a local 8B model: it produced syntactically
                    # valid JSON (e.g. {"confidence": 0.6, ...}) that
                    # simply didn't include a valid verdict — often
                    # because the model tried to express "I want more
                    # evidence" instead of following the schema. That
                    # must not be allowed to silently become Python
                    # None; it's a real failure and needs to look like one.
                    raise ValueError(
                        f"parsed JSON has no valid 'verdict' field (got {parsed.get('verdict')!r}): {resp.text!r}"
                    )
                parsed["_raw_response_text"] = resp.text
            except (ValueError, json.JSONDecodeError) as e:
                parsed = {
                    "verdict": "unparseable",
                    "confidence": 0.0,
                    "evidence_cited": [],
                    "rationale": str(e),
                    "_raw_response_text": resp.text,
                }
            return parsed, evidence_log

        assistant_msg = {"role": "assistant", "content": resp.text}
        if resp.tool_calls:
            assistant_msg["tool_calls"] = [
                {"id": c["id"], "name": c["name"], "input": c["input"]} for c in resp.tool_calls
            ]
        messages.append(assistant_msg)

        for call in resp.tool_calls:
            result = _execute_tool(call["name"], case, call["input"])
            evidence_log.append({"tool": call["name"], "input": call["input"], "result": result})
            messages.append(
                {
                    "role": "tool_result",
                    "tool_use_id": call["id"],
                    "name": call["name"],
                    "content": json.dumps(result),
                }
            )

    return (
        {
            "verdict": "unresolved",
            "confidence": 0.0,
            "evidence_cited": [],
            "rationale": "Exceeded " + str(MAX_TOOL_ITERATIONS) + " tool-call iterations without a final verdict.",
        },
        evidence_log,
    )


def _verify(client, case: dict, verdict: dict, evidence_log: list) -> dict:
    user_content = (
        "Transaction:\n```json\n" + json.dumps(case["transaction"], indent=2) + "\n```\n\n"
        "Evidence gathered:\n```json\n" + json.dumps(evidence_log, indent=2) + "\n```\n\n"
        "Proposed verdict:\n```json\n" + json.dumps(verdict, indent=2) + "\n```"
    )
    resp = client.complete(system=VERIFICATION_SYSTEM_PROMPT, messages=[{"role": "user", "content": user_content}])
    try:
        return parse_json_block(resp.text)
    except (ValueError, json.JSONDecodeError):
        return {
            "evidence_supports_verdict": False,
            "concerns": "verification step failed to parse",
            "adjusted_confidence": 0.0,
        }


def run_agent_on_case(client, case: dict) -> dict:
    start = time.time()
    verdict, evidence_log = _run_tool_loop(client, case)
    verification = _verify(client, case, verdict, evidence_log)
    elapsed = time.time() - start

    final_confidence = verification.get("adjusted_confidence", verdict.get("confidence", 0.0))

    requires_human_review = (
        verdict.get("verdict") == "fraud"
        or verdict.get("verdict") in ("unparseable", "unresolved")
        or not verification.get("evidence_supports_verdict", False)
        or final_confidence < HUMAN_REVIEW_CONFIDENCE_THRESHOLD
    )

    return {
        "case_id": case["case_id"],
        "verdict": verdict.get("verdict"),
        "confidence": round(final_confidence, 3),
        "evidence_cited": verdict.get("evidence_cited", []),
        "rationale": verdict.get("rationale"),
        "verification": verification,
        "requires_human_review": requires_human_review,
        "evidence_log": evidence_log,
        "tool_calls_made": len(evidence_log),
        "elapsed_seconds": round(elapsed, 3),
        "raw_final_response_text": verdict.get("_raw_response_text"),
    }


def run_agent_all(client, cases: list) -> list:
    return [run_agent_on_case(client, c) for c in cases]


if __name__ == "__main__":
    from common.llm_client import get_client

    with open(os.path.join(os.path.dirname(__file__), "..", "data", "cases.json"), encoding="utf-8") as f:
        cases = json.load(f)

    client = get_client()
    results = run_agent_all(client, cases)
    print(json.dumps(results, indent=2))
