"""
Baseline: one direct prompt with the full case data dumped in as text,
no tool calls, no verification pass. This is deliberately given the
SAME raw information as the agent (transaction + account history +
device info) — the comparison this project measures is not "who has
more data" but "does structured tool use plus verification produce a
more reliable judgment than a single-shot read of the same material."
That is the actual claim under test, and it's a stricter, more
honest baseline than starving it of context would be.
"""

from __future__ import annotations
import json
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.llm_client import parse_json_block

SYSTEM_PROMPT = """You are a fraud analyst reviewing one flagged transaction.
You are given the transaction plus the account's history in a single JSON
blob. Decide whether this transaction is fraud or legitimate.

Respond with ONLY a fenced JSON block in this exact shape, nothing else:
```json
{
  "verdict": "fraud" | "legit",
  "confidence": <float 0.0-1.0>,
  "rationale": "<one or two sentences citing the specific signals that drove this>"
}
```"""


def run_baseline_on_case(client, case: dict) -> dict:
    user_content = (
        "Here is the flagged transaction and full account context:\n\n"
        f"```json\n{json.dumps(case, indent=2, sort_keys=False)}\n```\n\n"
        "Note: 'ground_truth' and 'rationale_for_scoring_only' are present "
        "in this bundle for later scoring — ignore them when reasoning; "
        "decide based only on the transaction, account_history, and "
        "device_info fields."
    )

    start = time.time()
    resp = client.complete(
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    elapsed = time.time() - start

    try:
        parsed = parse_json_block(resp.text)
    except (ValueError, json.JSONDecodeError) as e:
        parsed = {"verdict": "unparseable", "confidence": 0.0, "rationale": str(e)}

    return {
        "case_id": case["case_id"],
        "verdict": parsed.get("verdict"),
        "confidence": parsed.get("confidence"),
        "rationale": parsed.get("rationale"),
        "raw_response": resp.text,
        "elapsed_seconds": round(elapsed, 3),
        "tool_calls_made": 0,
    }


def run_baseline_all(client, cases: list[dict]) -> list[dict]:
    return [run_baseline_on_case(client, c) for c in cases]


if __name__ == "__main__":
    from common.llm_client import get_client

    with open(
        os.path.join(os.path.dirname(__file__), "..", "data", "cases.json"),
        encoding="utf-8",
    ) as f:
        cases = json.load(f)

    client = get_client()
    results = run_baseline_all(client, cases)
    print(json.dumps(results, indent=2))
