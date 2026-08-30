# Evaluation Summary

Real run against 12 synthetic cases (5 fraud, 7 legit, including 2 deliberately ambiguous "hard" cases). Ground truth was withheld from both systems.

## The headline number: unsafe error rate

**0/12 wrong verdicts reached the caller without being flagged for human review** (unsafe error rate: 0%).

| | Correct | Wrong |
|---|---|---|
| **No review needed** | 4 | 0 — dangerous quadrant |
| **Review required** | 4 | 4 |

| Metric | Baseline | Agent | Change |
|---|---|---|---|
| **Accuracy** | 100% (12/12) | 67% (8/12) | -33% |
| Precision (fraud) | 1.0 | 0.571 | — |
| Recall (fraud) | 1.0 | 0.8 | — |
| Wall time / case | 136.4s | 207.8s | — |
| Requires human review | n/a | 8/12 | — |

Regenerated from `results/eval_results.json` using the current `eval/run_eval.py` scoring logic.
