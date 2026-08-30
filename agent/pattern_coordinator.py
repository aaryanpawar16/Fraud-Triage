"""
Tier 3: the Pattern Coordinator. Runs only on clusters the
deterministic detector (pattern_detector.py) already found — the LLM
never decides WHETHER a cluster exists (that's a fact, not a
judgment call); it only synthesizes WHAT the cluster means and what a
human investigator should do about it. Keeping the factual detection
deterministic and the interpretation LLM-based is deliberate: it
means a coordinator hallucination can produce a bad recommendation,
never a phantom cluster that was never really there.
"""

from __future__ import annotations
import json

from common.llm_client import parse_json_block
from agent.pattern_detector import DeviceReuseCluster

COORDINATOR_SYSTEM_PROMPT = """You are a senior fraud coordinator. You are
shown a device-reuse cluster: the SAME physical device transacting on
MULTIPLE DIFFERENT accounts, along with the individual per-account triage
result for each linked case. Each case may have looked clean on its own —
that is expected, since the pattern only exists in the comparison across
accounts, which per-case review never performs.

Assess whether this looks like a coordinated fraud ring or synthetic
identity scheme, versus an innocent explanation (e.g. a shared family
device, a shared work computer). State your reasoning plainly.

Respond with ONLY a fenced JSON block in this exact shape:
```json
{
  "assessment": "likely_ring" | "likely_coincidental" | "insufficient_evidence",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<two or three sentences>",
  "recommended_action": "<what a human investigator should do next>"
}
```"""


def run_pattern_coordinator(client, cluster: DeviceReuseCluster, linked_cases: list[dict]) -> dict:
    """linked_cases should be the full case records for cluster.case_ids,
    ideally already including their Tier-1 triage result if available."""
    user_content = (
        f"Device-reuse cluster: {cluster.device_id} used across "
        f"{len(cluster.linked_accounts)} accounts: {cluster.linked_accounts}\n\n"
        "Linked cases:\n```json\n"
        + json.dumps(linked_cases, indent=2)
        + "\n```"
    )

    resp = client.complete(
        system=COORDINATOR_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    try:
        parsed = parse_json_block(resp.text)
    except (ValueError, json.JSONDecodeError) as e:
        parsed = {
            "assessment": "insufficient_evidence",
            "confidence": 0.0,
            "reasoning": f"Coordinator response could not be parsed: {e}",
            "recommended_action": "Manual review required — automated assessment failed.",
        }

    return {
        "cluster": cluster.as_dict(),
        "assessment": parsed.get("assessment"),
        "confidence": parsed.get("confidence"),
        "reasoning": parsed.get("reasoning"),
        "recommended_action": parsed.get("recommended_action"),
    }
