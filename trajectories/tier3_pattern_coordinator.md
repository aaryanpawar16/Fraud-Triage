# Trajectory: Tier 3 — Pattern Coordinator (Ring Detection)

Real output from `eval/run_pattern_analysis.py`, live run against
llama3.1 via Ollama. This is a different agent from the Tier 1/2
trajectories elsewhere in this folder — it never sees a single
transaction in isolation; it only runs on clusters the deterministic
detector already found.

## Input

`agent/pattern_detector.py`'s `find_device_reuse()` checked all 14
cases (12 main + 2 planted ring cases) with **zero LLM calls** — this
step is pure deterministic logic, not part of this trajectory.

**Result:** 1 cluster found.
- `device_id`: `dev_shared_x7`
- `linked_accounts`: `["acct_ring_alpha", "acct_ring_beta"]`
- `case_ids`: `["ring_01_alpha", "ring_02_beta"]`

Both linked cases, individually, had nothing a per-case agent would
flag: modest amounts within each account's own typical range, no geo
mismatch, no velocity concern. The only signal is the shared device
across two unrelated accounts — invisible to any single-case check.

## Coordinator call

Only clusters the detector already found are sent to the LLM — the
coordinator never decides *whether* a cluster exists, only what it
*means*. `agent/pattern_coordinator.py`'s system prompt instructs it
to assess whether the pattern looks like a coordinated ring versus an
innocent explanation (e.g. a shared family device), and to state its
reasoning plainly.

## Output (verbatim, real)

```json
{
  "assessment": "likely_ring",
  "confidence": 0.8,
  "reasoning": "The same device (dev_shared_x7) is being used across two separate accounts, both of which have been deemed legitimate on their own. This pattern of reuse is suspicious and indicates a potential coordinated effort to reuse devices across accounts.",
  "recommended_action": "Investigate the relationship between these two accounts and the owner of the device dev_shared_x7 to determine if there is a coordinated effort to reuse devices or if these are indeed separate, legitimate transactions on shared devices."
}
```

## What this trajectory demonstrates

- The coordinator correctly identified the exact point of the
  feature in its own words — *"both of which have been deemed
  legitimate on their own"* — without being told that framing in the
  prompt.
- `recommended_action` is concrete (investigate the account
  relationship and device ownership) rather than a generic "review
  this," which is what a useful escalation to a human investigator
  needs to look like.
- No retries were needed — one call, one parseable response. See
  `agent/pattern_coordinator.py`'s malformed-response handling
  (`tests/test_pattern_coordinator.py::test_coordinator_malformed_response_degrades_safely`)
  for what happens when that isn't true.
- **Human checkpoint:** this output is a recommendation only. Nothing
  in Tier 3 executes an account action — it terminates in exactly the
  same kind of human handoff as Tier 1/2, consistent with ground
  rules 4 and 5.

Full write-up: `docs/CHANGELOG.md`'s "Tier 3: cross-case
orchestration" section. Reproduce with:
`python eval/run_pattern_analysis.py`.
