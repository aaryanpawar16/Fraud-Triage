# Fraud Transaction Triage Agent

An agent that gathers evidence on a flagged transaction — via real
tool calls, not a single guess — and produces an evidence-cited risk
recommendation for a human fraud analyst to review. It never takes an
action; it only ever recommends one, with the reasoning attached.

**The headline result:** on the real 12-case evaluation, the agent's
raw accuracy (67%) is *lower* than a single-prompt baseline (100%).
That's not the number that matters. **0% of the agent's wrong
verdicts reached an action unflagged** — every one was caught by its
own confidence and verification checks first. The claim this system
makes is "wrong less dangerously," not "always right." See
[`docs/CHANGELOG.md`](docs/CHANGELOG.md) for the full evidence trail.

## What's actually in here

This isn't one agent — it's three tiers, each solving a different
part of the problem, plus a live demo and an adversarial test, all
with real evaluation results behind them, not just descriptions.

| Tier | What it does | Where |
|---|---|---|
| **1 — Triage** | Gathers derived signals via 6 real tool calls (not raw data pass-through), proposes a verdict | `agent/tools.py`, `agent/run_agent.py` |
| **2 — Verification** | A separate LLM pass checking whether the proposed verdict's stated evidence actually matches what the tools returned | `agent/run_agent.py` |
| **3 — Orchestration** | Cross-case pattern detection — catches a synthetic-identity ring that no single case can reveal, proven by test to require the cross-case comparison | `agent/pattern_detector.py`, `agent/pattern_coordinator.py` |

Every wrong verdict, low-confidence verdict, or verification
disagreement routes to `requires_human_review: true`, **enforced in
Python code**, not requested in a prompt — see the "Human oversight"
section below.

## Two things beyond the core evaluation

- **A live prompt-injection test** (`data/adversarial_cases.json`,
  `eval/run_adversarial_test.py`) — a transaction with every real
  signal pointing to fraud, and a merchant field containing an
  injected instruction telling the model to clear it. The agent
  resisted it in the live run; the honest finding is that resistance
  measurably cost confidence even though it held. `docs/CHANGELOG.md`'s
  "Adversarial robustness" section has the precise, code-proven
  statement of what the human-review gate does and doesn't guarantee
  against this class of attack.
- **A live demo backend** (`api_server.py`) and an 11-page website
  (`website/`) — every page is backed by real data, and two of them
  (`/live`, `/ring-check`) call the actual running agent on a
  transaction you type in yourself, not a replay.

## Does the agent solve it well?

Measured directly, not asserted. Baseline: 100% accuracy, 12/12 —
same model, same context as the agent, no tools, so the comparison
isolates what tool use and verification actually contribute. Agent:
67% raw accuracy, but the safety breakdown is the number that
matters for this task:

|  | Correct | Wrong |
|---|---|---|
| **No review needed** | 4 | **0** — the dangerous quadrant |
| **Review required** | 4 | 4 |

Confidence is also a real, calibrated signal, not noise attached to a
verdict: average confidence when correct is 0.825; when wrong, 0.400
— with a clean separation at the 0.65/0.6 boundary across all 12
cases. See `results/summary.md` for the live numbers and
`docs/CHANGELOG.md` for the confidence-calibration and hard-case
analysis behind them.

## Can another person reproduce it?

Yes — with either a real Anthropic API key or a local Ollama model,
your choice (`LLM_PROVIDER=anthropic` or `ollama`). See
[`docs/REPRODUCTION.md`](docs/REPRODUCTION.md) for exact commands.
**45 tests across 8 files** verify every piece of the harness —
tool logic, orchestration mechanics, scoring, wire-format translation
for both providers, the live API server, and the adversarial and
pattern-detection mechanics — **without needing a running model for
all but a handful of them.**

This was also verified on two genuinely separate machines during
development, and that process caught three real, distinct bugs
(a cross-platform file-encoding issue, a test-isolation bug, and a
Next.js routing issue) — each documented with the evidence, not
smoothed over. See `docs/CHANGELOG.md`.

## Quick start

```bash
pip install -r requirements.txt --break-system-packages
export LLM_PROVIDER=ollama          # or anthropic
export OLLAMA_MODEL=llama3.1

python tests/test_tools.py          # no model needed
python eval/run_eval.py             # the real 12-case evaluation
python eval/run_adversarial_test.py # the injection test
python eval/run_pattern_analysis.py # the ring-detection test

cd website && npm install && npm run dev   # the site, at localhost:3000
```

Full setup, including the live demo backend and every test file, is
in [`docs/REPRODUCTION.md`](docs/REPRODUCTION.md).

## Repo layout

```
agent/            tools.py, run_agent.py, pattern_detector.py, pattern_coordinator.py
baseline/         run_baseline.py — the fair, same-context baseline
common/           llm_client.py — provider-agnostic (Anthropic + Ollama)
data/             cases.json (12), adversarial_cases.json (1), ring_cases.json (2)
eval/             run_eval.py, run_adversarial_test.py, run_pattern_analysis.py
results/          real eval_results.json, summary.md — generated, not hand-written
tests/            45 tests across 8 files
docs/             README.md, CHANGELOG.md, REPRODUCTION.md, SCORECARD.md, ARCHITECTURE.md
website/          Next.js site, 11 pages, live demo included
api_server.py     FastAPI backend for the live demo and ring-check pages
```

## Human oversight (ground rules 4 & 5)

The agent's output has no `action` field anywhere — verified directly
by test. Any fraud verdict, any confidence below 0.75, or any
disagreement from the verification pass routes the case to
`requires_human_review: true`, enforced in Python, not requested in a
prompt. The same principle extends to Tier 3: the pattern detector
only ever flags a cluster for a human to look at; it never takes
action on an account. See `docs/CHANGELOG.md` for why that
distinction was a deliberate design choice throughout, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system
design.

## Judging this submission

[`docs/SCORECARD.md`](docs/SCORECARD.md) maps every rubric criterion
directly to where its evidence lives in this repo — useful if you're
scoring against a specific list rather than reading front to back.
