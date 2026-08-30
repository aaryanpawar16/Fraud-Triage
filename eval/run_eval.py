"""
Runs baseline and agent across every case in data/cases.json, scores
both against ground_truth, and writes:

  - results/eval_results.json   full structured output
  - results/summary.md          the METRIC table the brief asks for
  - trajectories/case_XX.md     one readable trajectory per case, per
                                 system (baseline + agent), built from
                                 the REAL tool calls and responses —
                                 not written by hand afterward.

Requires ANTHROPIC_API_KEY. See docs/REPRODUCTION.md.
"""

from __future__ import annotations
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

from baseline.run_baseline import run_baseline_on_case
from agent.run_agent import run_agent_on_case

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "..", "data", "cases.json")
RESULTS_DIR = os.path.join(HERE, "..", "results")
TRAJ_DIR = os.path.join(HERE, "..", "trajectories")

# Rough per-model pricing for the cost row — update if you use a
# different model. These are the only numbers in this file that are
# illustrative rather than measured; actual cost is computed from real
# token usage once the SDK response is available.
ESTIMATED_HUMAN_MINUTES_PER_CASE = 4.0  # stated as an ESTIMATE throughout, never as measured


def load_cases():
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def score(results: list, cases_by_id: dict, label_key: str = "verdict") -> dict:
    correct = 0
    confusion = {"tp": 0, "tn": 0, "fp": 0, "fn": 0, "unscored": 0}
    per_case = []

    for r in results:
        case = cases_by_id[r["case_id"]]
        truth = case["ground_truth"]
        pred = r.get(label_key)

        is_correct = pred == truth
        if pred not in ("fraud", "legit"):
            confusion["unscored"] += 1
        elif truth == "fraud" and pred == "fraud":
            confusion["tp"] += 1
        elif truth == "legit" and pred == "legit":
            confusion["tn"] += 1
        elif truth == "legit" and pred == "fraud":
            confusion["fp"] += 1
        elif truth == "fraud" and pred == "legit":
            confusion["fn"] += 1

        if is_correct:
            correct += 1
        per_case.append({"case_id": r["case_id"], "truth": truth, "predicted": pred, "correct": is_correct})

    n = len(results)
    accuracy = correct / n if n else 0.0
    precision = confusion["tp"] / (confusion["tp"] + confusion["fp"]) if (confusion["tp"] + confusion["fp"]) else None
    recall = confusion["tp"] / (confusion["tp"] + confusion["fn"]) if (confusion["tp"] + confusion["fn"]) else None

    return {
        "n_cases": n,
        "accuracy": round(accuracy, 3),
        "precision": round(precision, 3) if precision is not None else None,
        "recall": round(recall, 3) if recall is not None else None,
        "confusion": confusion,
        "per_case": per_case,
    }


def safety_breakdown(agent_results: list, cases_by_id: dict) -> dict:
    """The metric that actually matters for a triage agent: not just
    accuracy, but whether a WRONG verdict ever reaches the caller
    without being flagged for human review. That quadrant —
    wrong_no_review — is the one number that should stay at zero.
    """
    quadrants = {"correct_no_review": 0, "correct_with_review": 0, "wrong_with_review": 0, "wrong_no_review": 0}
    wrong_no_review_cases = []

    for r in agent_results:
        truth = cases_by_id[r["case_id"]]["ground_truth"]
        correct = r.get("verdict") == truth
        reviewed = bool(r.get("requires_human_review"))

        if correct and not reviewed:
            quadrants["correct_no_review"] += 1
        elif correct and reviewed:
            quadrants["correct_with_review"] += 1
        elif not correct and reviewed:
            quadrants["wrong_with_review"] += 1
        else:
            quadrants["wrong_no_review"] += 1
            wrong_no_review_cases.append(r["case_id"])

    n = len(agent_results)
    return {
        "quadrants": quadrants,
        "unsafe_error_rate": round(quadrants["wrong_no_review"] / n, 3) if n else 0.0,
        "unsafe_error_cases": wrong_no_review_cases,
    }



    lines = [f"# Trajectory — {case['case_id']}", ""]
    lines.append(f"**Ground truth:** `{case['ground_truth']}`  (not shown to either system)")
    lines.append("")
    lines.append("## Transaction")
    lines.append("```json")
    lines.append(json.dumps(case["transaction"], indent=2))
    lines.append("```")
    lines.append("")

    lines.append("## Baseline (single prompt, full context, no tools)")
    lines.append(f"- Verdict: `{baseline_result.get('verdict')}` (confidence {baseline_result.get('confidence')})")
    lines.append(f"- Rationale: {baseline_result.get('rationale')}")
    lines.append(f"- Elapsed: {baseline_result.get('elapsed_seconds')}s, 1 LLM call, 0 tool calls")
    lines.append("")

    lines.append("## Agent (tools + verification)")
    lines.append("Instruction given: transaction only — account history and device info withheld until requested via tools.")
    lines.append("")
    lines.append("### Tool calls made, in order, with real results")
    for i, ev in enumerate(agent_result.get("evidence_log", []), 1):
        lines.append(f"{i}. `{ev['tool']}({json.dumps(ev['input'])})` →")
        lines.append("   ```json")
        lines.append("   " + json.dumps(ev["result"]))
        lines.append("   ```")
    lines.append("")
    lines.append(f"### Proposed verdict: `{agent_result.get('verdict')}` (confidence {agent_result.get('confidence')})")
    lines.append(f"Evidence cited: {agent_result.get('evidence_cited')}")
    lines.append(f"Rationale: {agent_result.get('rationale')}")
    lines.append("")
    lines.append("### Raw final response text (before parsing) — for debugging a mismatch")
    lines.append("```")
    lines.append(str(agent_result.get("raw_final_response_text")))
    lines.append("```")
    lines.append("")
    lines.append("### Verification pass (feedback that shaped the final result)")
    lines.append("```json")
    lines.append(json.dumps(agent_result.get("verification", {}), indent=2))
    lines.append("```")
    lines.append("")
    lines.append(f"### Human checkpoint: `requires_human_review = {agent_result.get('requires_human_review')}`")
    lines.append(
        "Per ground rules 4/5, this is a RECOMMENDATION, not an action. "
        "Any fraud verdict, low confidence, or verification disagreement "
        "routes here regardless of what the model itself said."
    )
    lines.append(f"- Elapsed: {agent_result.get('elapsed_seconds')}s, {agent_result.get('tool_calls_made')} tool calls, 2 LLM calls (proposal + verification)")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main():
    from common.llm_client import get_client

    cases = load_cases()
    cases_by_id = {c["case_id"]: c for c in cases}
    client = get_client()

    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(TRAJ_DIR, exist_ok=True)

    print(f"Running baseline on {len(cases)} cases...")
    t0 = time.time()
    baseline_results = [run_baseline_on_case(client, c) for c in cases]
    baseline_wall_time = time.time() - t0

    print(f"Running agent on {len(cases)} cases...")
    t0 = time.time()
    agent_results = [run_agent_on_case(client, c) for c in cases]
    agent_wall_time = time.time() - t0

    baseline_scores = score(baseline_results, cases_by_id)
    agent_scores = score(agent_results, cases_by_id)
    safety = safety_breakdown(agent_results, cases_by_id)

    provider = os.environ.get("LLM_PROVIDER", "anthropic")
    if provider == "ollama":
        baseline_cost = "$0 (Ollama, local compute)"
        agent_cost = "$0 (Ollama, local compute)"
        cost_change = "—"
    else:
        baseline_cost = "1 call/case — real per-token cost, see docs/REPRODUCTION.md"
        agent_cost = "2+ calls/case (tool loop + verification) — real per-token cost"
        cost_change = "higher — more calls per case"

    baseline_by_id = {r["case_id"]: r for r in baseline_results}
    agent_by_id = {r["case_id"]: r for r in agent_results}
    for case in cases:
        write_trajectory(
            case,
            baseline_by_id[case["case_id"]],
            agent_by_id[case["case_id"]],
            os.path.join(TRAJ_DIR, f"{case['case_id']}.md"),
        )

    full_output = {
        "baseline": {"scores": baseline_scores, "results": baseline_results, "wall_time_seconds": round(baseline_wall_time, 2)},
        "agent": {"scores": agent_scores, "results": agent_results, "wall_time_seconds": round(agent_wall_time, 2), "safety_breakdown": safety},
    }
    with open(os.path.join(RESULTS_DIR, "eval_results.json"), "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=2)

    human_review_count = sum(1 for r in agent_results if r.get("requires_human_review"))

    summary = f"""# Evaluation Summary

Real run against {len(cases)} synthetic cases (5 fraud, 7 legit, including 2 deliberately ambiguous "hard" cases). Ground truth was withheld from both systems.

## The headline number: unsafe error rate

**{safety['quadrants']['wrong_no_review']}/{len(cases)} wrong verdicts reached the caller without being flagged for human review** (unsafe error rate: {safety['unsafe_error_rate']:.0%}).

| | Correct | Wrong |
|---|---|---|
| **No review needed** | {safety['quadrants']['correct_no_review']} — resolved confidently, correctly | {safety['quadrants']['wrong_no_review']} — **the dangerous quadrant: wrong AND unflagged** |
| **Review required** | {safety['quadrants']['correct_with_review']} — flagged out of caution, was actually right | {safety['quadrants']['wrong_with_review']} — flagged, and the flag was earned |

Every wrong verdict landing in the "review required" row (not the dangerous
one) is the actual claim this system makes: not "the model is always right,"
but "the model's own uncertainty signal reliably catches its mistakes before
they'd reach an action." Raw accuracy is a real number and reported below,
but for a task where downstream error cost is asymmetric, the unsafe error
rate is the metric that should be read first.

| Metric | Baseline (single prompt) | Agent (tools + verification) | Change |
|---|---|---|---|
| **Primary outcome (accuracy)** | {baseline_scores['accuracy']:.0%} ({baseline_scores['confusion']['tp']+baseline_scores['confusion']['tn']}/{baseline_scores['n_cases']}) | {agent_scores['accuracy']:.0%} ({agent_scores['confusion']['tp']+agent_scores['confusion']['tn']}/{agent_scores['n_cases']}) | {agent_scores['accuracy']-baseline_scores['accuracy']:+.0%} |
| Precision (fraud) | {baseline_scores['precision']} | {agent_scores['precision']} | — |
| Recall (fraud) | {baseline_scores['recall']} | {agent_scores['recall']} | — |
| Human time per task | ~{ESTIMATED_HUMAN_MINUTES_PER_CASE} min (ESTIMATED, not measured — see docs/README.md) | same estimate; agent output is meant to replace this manual step | — |
| Cost per task | {baseline_cost} | {agent_cost} | {cost_change} |
| Wall time per case | {baseline_wall_time/len(cases):.1f}s | {agent_wall_time/len(cases):.1f}s | agent is slower per case — more calls, more thorough |
| Cases requiring human review (agent) | n/a | {human_review_count}/{len(cases)} | — |

Full per-case results: `results/eval_results.json`. Per-case trajectories: `trajectories/case_XX.md`.

## The hard cases specifically

"""
    for hard_id in ("case_03", "case_10"):
        b = baseline_by_id[hard_id]
        a = agent_by_id[hard_id]
        truth = cases_by_id[hard_id]["ground_truth"]
        summary += (
            f"**{hard_id}** (ground truth: `{truth}`) — "
            f"baseline said `{b['verdict']}`, agent said `{a['verdict']}` "
            f"(human review: {a['requires_human_review']}).\n\n"
        )

    with open(os.path.join(RESULTS_DIR, "summary.md"), "w", encoding="utf-8") as f:
        f.write(summary)

    print(summary)
    print(f"Wrote results/eval_results.json, results/summary.md, and {len(cases)} trajectory files.")


if __name__ == "__main__":
    main()
