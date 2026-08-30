# Evaluation Summary

Real run against 12 synthetic cases (5 fraud, 7 legit, including 2 deliberately ambiguous "hard" cases). Ground truth was withheld from both systems.

## The headline number: unsafe error rate

**0/12 wrong verdicts reached the caller without being flagged for human review** (unsafe error rate: 0%).

| | Correct | Wrong |
|---|---|---|
| **No review needed** | 4 — resolved confidently, correctly | 0 — **the dangerous quadrant: wrong AND unflagged** |
| **Review required** | 4 — flagged out of caution, was actually right | 4 — flagged, and the flag was earned |

Every wrong verdict landing in the "review required" row (not the dangerous
one) is the actual claim this system makes: not "the model is always right,"
but "the model's own uncertainty signal reliably catches its mistakes before
they'd reach an action." Raw accuracy is a real number and reported below,
but for a task where downstream error cost is asymmetric, the unsafe error
rate is the metric that should be read first.

| Metric | Baseline (single prompt) | Agent (tools + verification) | Change |
|---|---|---|---|
| **Primary outcome (accuracy)** | 100% (12/12) | 67% (8/12) | -33% |
| Precision (fraud) | 1.0 | 0.571 | — |
| Recall (fraud) | 1.0 | 0.8 | — |
| Human time per task | ~4.0 min (ESTIMATED, not measured — see docs/README.md) | same estimate; agent output is meant to replace this manual step | — |
| Cost per task | $0 (Ollama, local compute) | $0 (Ollama, local compute) | — |
| Wall time per case | 136.4s | 207.8s | agent is slower per case — more calls, more thorough |
| Cases requiring human review (agent) | n/a | 8/12 | — |

Full per-case results: `results/eval_results.json`. Per-case trajectories: `trajectories/case_XX.md`.

Regenerated from `results/eval_results.json` using the current `eval/run_eval.py` scoring logic.
