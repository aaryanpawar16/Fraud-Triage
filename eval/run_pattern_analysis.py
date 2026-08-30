"""
Tier 3, end to end. Loads the main 12-case dataset plus the ring test
cases, runs the deterministic device-reuse detector across ALL of
them together (proving zero false positives on the clean data and a
real detection on the planted ring), then runs the LLM coordinator on
whatever clusters were actually found.

Run with:
    python eval/run_pattern_analysis.py
Requires the same LLM_PROVIDER / ANTHROPIC_API_KEY / OLLAMA_* env vars
as eval/run_eval.py — only used for the coordinator's written
assessment; the detection itself needs no model at all.
"""

from __future__ import annotations
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

from common.llm_client import get_client
from agent.pattern_detector import find_device_reuse
from agent.pattern_coordinator import run_pattern_coordinator

HERE = os.path.dirname(os.path.abspath(__file__))
TRAJ_PATH = os.path.join(HERE, "..", "trajectories", "tier3_pattern_coordinator.md")


def write_trajectory(clusters, results_by_device, path):
    """Readable trajectory for Tier 3 — a distinct agent from Tier 1/2,
    so it needs its own trajectory, not just a mention inside the
    12-case ones."""
    lines = [
        "# Trajectory: Tier 3 — Pattern Coordinator (Ring Detection)",
        "",
        "Real output from `eval/run_pattern_analysis.py`.",
        "",
        "## Detection (deterministic, zero LLM calls)",
        "",
        f"{len(clusters)} cluster(s) found by `agent/pattern_detector.py`.",
        "",
    ]
    for cluster in clusters:
        result = results_by_device[cluster.device_id]
        lines += [
            f"## Cluster: `{cluster.device_id}`",
            "",
            f"- **Linked accounts:** {cluster.linked_accounts}",
            f"- **Case IDs:** {cluster.case_ids}",
            "",
            "### Coordinator output",
            "",
            f"- **Assessment:** `{result['assessment']}`",
            f"- **Confidence:** `{result['confidence']}`",
            f"- **Reasoning:** {result['reasoning']}",
            f"- **Recommended action:** {result['recommended_action']}",
            "",
        ]
    lines.append("Reproduce with: `python eval/run_pattern_analysis.py`.")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main():
    with open(os.path.join(HERE, "..", "data", "cases.json"), encoding="utf-8") as f:
        main_cases = json.load(f)
    with open(os.path.join(HERE, "..", "data", "ring_cases.json"), encoding="utf-8") as f:
        ring_cases = json.load(f)

    all_cases = main_cases + ring_cases
    by_id = {c["case_id"]: c for c in all_cases}

    print(f"Checking {len(all_cases)} cases for cross-case device reuse...")
    clusters = find_device_reuse(all_cases)
    print(f"Clusters found: {len(clusters)}\n")

    if not clusters:
        print("No device-reuse clusters detected — nothing for the coordinator to assess.")
        return

    client = get_client()
    all_results = []
    results_by_device = {}

    for cluster in clusters:
        print(f"=== Cluster: {cluster.device_id} ===")
        print(f"Linked accounts: {cluster.linked_accounts}")
        print(f"Case IDs: {cluster.case_ids}")

        linked_cases = [by_id[cid] for cid in cluster.case_ids]
        result = run_pattern_coordinator(client, cluster, linked_cases)

        print(f"\nAssessment:         {result['assessment']}")
        print(f"Confidence:          {result['confidence']}")
        print(f"Reasoning:           {result['reasoning']}")
        print(f"Recommended action:  {result['recommended_action']}")
        print()

        all_results.append(result)
        results_by_device[cluster.device_id] = result

    write_trajectory(clusters, results_by_device, TRAJ_PATH)
    print(f"Wrote {TRAJ_PATH}")

    out_path = os.path.join(HERE, "..", "results", "pattern_analysis_result.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
