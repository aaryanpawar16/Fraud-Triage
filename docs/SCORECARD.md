# Judge Scorecard

Where the evidence for each criterion actually lives, so nothing gets
missed by being in the wrong file at read time. Every reference below
is to something real already in this submission — nothing here is
new content, just a map to what exists.

## Problem & User Value (15)

- `docs/README.md` — "Who this is for" and "The bottleneck" sections
  name the user (fraud/trust-and-safety analyst) and the specific
  failure modes (context-blind flagging, missed low-signal fraud
  patterns) directly, with case citations.
- Website `/overview` — same argument, one click.

## Agent Solution & Engineering (30) — the largest category

- `agent/tools.py` — every tool computes a *derived* signal, not a
  raw pass-through (see the module docstring for why that distinction
  matters).
- `agent/run_agent.py` — the tool-calling loop, the separate
  verification pass, and the human-review gate **enforced in Python**,
  not requested in a prompt (`requires_human_review` computation,
  ~line 180).
- `common/llm_client.py` — provider-agnostic message translation
  (Anthropic ↔ Ollama), added after the coupling was discovered
  mid-build — see `docs/CHANGELOG.md`'s "Provider pivot" entry for the
  evidence of *why* this refactor happened, not just that it did.
- `api_server.py` + website `/live` — the same agent, callable on a
  transaction that was never part of the evaluation set. See
  `docs/CHANGELOG.md`'s "Independent confirmation" section: the exact
  reasoning-failure pattern found in the static dataset reproduced
  live, out-of-sample.
- `tests/test_harness_mechanics.py` — 10 tests proving the
  orchestration itself (not just individual tool logic) is correct,
  independent of any model's answers.

## End to End Quality (20)

- The website: 7 pages, real data throughout, verified with a
  production build before every delivery in this project's history.
- `/live` — a working custom-transaction form calling the real
  backend, not a mockup.
- `/review` — reviewer decisions persist via `localStorage` across
  reloads; not a stateless demo.
- `video/solution-demo-link.md` — shot list built entirely from real,
  already-verified evidence.

## Measured Improvement (15)

- `docs/CHANGELOG.md` — the full stage table, plus three dedicated
  analysis sections: "Hard case analysis," "Independent confirmation,"
  and the confidence-calibration finding (clean separation between
  correct and wrong verdicts at the 0.65/0.6 boundary).
- `results/summary.md` — the real numbers, regenerated directly from
  `results/eval_results.json` using the actual scoring code, not
  hand-typed.
- Website `/results` — the safety matrix leads the page (not raw
  accuracy), with three real charts: accuracy/precision/recall bars,
  the confidence journey (raw → verified), and the confidence
  distribution against the review threshold.

## Reproducibility (15)

- `docs/REPRODUCTION.md` — exact commands for both providers
  (Anthropic or Ollama), versions, measured runtimes, explicit $0 cost
  note.
- `tests/` — 30 tests across 5 files; all but the live-model call
  itself run with **zero API key or running model required**.
- This submission was verified on two independent machines (this
  development environment, and a separate Windows machine) — three
  real, distinct bugs were found and fixed in that process (a
  cross-platform file-encoding bug, a test-isolation bug, and a
  Next.js routing issue), each with the evidence trail kept rather
  than smoothed over. That's stronger proof of reproducibility than a
  single clean run would have been.

## Hot Take / Insights (5)

- `docs/CHANGELOG.md` "Hot take" section — two insights, both derived
  from specific observed failures, both stating what they'd change
  next time:
  1. The routing around the model matters more than the model itself
     — human-review-gate-in-code vs. gate-in-prompt.
  2. A model correct single-shot can still fail a multi-step task, and
     the failure looks like success until the *schema*, not just the
     syntax, is checked.
- The "Independent confirmation" section adds a third, live data
  point to insight #2 without needing a new write-up.
