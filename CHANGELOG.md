# Improvement Changelog

Every entry is a real decision made during this build, with the
evidence that drove it — not written up afterward to look tidier than
it was.

| Stage | What we tried and why | Evidence | Decision / learning |
|---|---|---|---|
| **Baseline design** | Considered giving the baseline only the raw transaction (no account history), matching "one direct prompt" literally. | Realized this would make ANY improvement trivially attributable to "the agent just had more data," not to the agent's design. | **Changed the baseline** to receive the exact same full context (transaction + account history + device info) as the agent, in one prompt, no tools. This isolates what we actually want to measure: does structured tool use + verification produce more reliable judgments than a single read of the same material? |
| **Tool design** | First draft of `tools.py` considered just returning the relevant fields verbatim from the case bundle (e.g. `get_account_history()` returning the raw dict). | Realized this wouldn't be a meaningfully different capability from the baseline just having the data in its prompt — it would be "agentic" in name only. | **Redesigned every tool to compute a derived signal**, not pass through raw data — e.g. `check_geo_mismatch` doesn't just return the country, it cross-references against the recent-transaction trail to distinguish travel from an isolated mismatch. This is what makes tool use load-bearing rather than decorative. |
| **Verification API format** | Needed to get the Anthropic tool-use wire format (tool_use/tool_result block structure) exactly right before writing the agent loop. | Training data on API specifics can be stale — fetched the live docs (`platform.claude.com/docs/.../define-tools` and `.../handle-tool-calls`) rather than relying on memory. Confirmed: tool_result blocks must come first in the reply, matched by `tool_use_id`. | Built `_run_tool_loop` against the verified current format. Cost: a few minutes of doc-fetching up front; benefit: no silent wire-format bug discovered only when the user runs it. |
| **Human-review gate** | Could have relied on the model's own prompted instruction ("flag for review if uncertain") to decide when a human needs to see this. | Ground rules 4/5 require consequential actions to have human approval and a qualified reviewer for anything significant — a prompted instruction is not a guarantee, it's a request the model could get wrong. | **Enforced the gate in Python**, not the prompt: `requires_human_review` is computed in code from the verdict, the confidence, and the verification step's own agreement — a fraud call is *always* routed to a human regardless of what the model claims, even at 0.99 stated confidence. Tested directly (`test_fraud_verdict_always_requires_human_review_even_at_high_confidence`). |
| **Harness testing — found a real bug** | Wrote `tests/test_harness_mechanics.py` using a `MockClient` to verify the tool loop and verification wiring without needing a live API key. First version distinguished the tool-loop call from the verification call by checking `len(messages) == 1`. | Running the suite: `test_confident_verified_legit_verdict_does_not_require_review` **failed**. Traced it by logging which system prompt each mock call actually received — confirmed the *agent code* was correct (verification response had defaulted safely to requiring review because of missing data), but the *test's mock* had fed the verification call the wrong canned response, since both calls happen to have a 1-message list. | **Fixed the test**, not the agent — root-caused correctly rather than "fixing" working code to match a broken test. Switched every affected mock to distinguish calls by `system == VERIFICATION_SYSTEM_PROMPT` instead of message length. All 8 harness tests pass for the right reasons now, confirmed by re-tracing. |
| **Provider pivot — Ollama instead of a paid API key** | Built against the Anthropic API first. Then needed to support a local Ollama model instead, since not every reproduction environment has (or should need) a paid API key. | Attempted the swap by just adding an `OllamaClient` alongside `RealAnthropicClient`. Found immediately that `agent/run_agent.py`'s tool loop was constructing Anthropic-specific `tool_use`/`tool_result` content blocks directly — the coupling was real, not just a config difference, because Anthropic requires consecutive tool results grouped into one message while Ollama expects them as separate `role: "tool"` messages. | **Refactored to a provider-agnostic message format** (`{"role": "assistant", "tool_calls": [...]}` / `{"role": "tool_result", ...}`) that `run_agent.py` builds once; each client (`RealAnthropicClient`, `OllamaClient`) translates it to its own wire format in `complete()`. Verified with dedicated tests (`test_message_translation.py`) that check the Anthropic path correctly groups tool results into one message and the Ollama path correctly keeps them separate — the exact difference that broke the naive version. All 8 harness-mechanics tests still passed unchanged after the refactor, confirming the abstraction boundary was in the right place. |
| **Windows cross-platform bug — found on the first real run, not caught by any test** | Trajectory files use a `→` character for readability. Development and testing both happened on Linux, where Python's default file-write encoding is UTF-8. | First live run on Windows crashed: `UnicodeEncodeError: 'charmap' codec can't encode character '\u2192'` — Windows' default text encoding (cp1252) has no representation for that character. The crash happened *after* both baseline and agent had already produced real results, but *before* they were written to disk, so the run's output was lost. | **Added explicit `encoding="utf-8"` to every file `open()` in the project — reads and writes, all 9 call sites, not just the one that crashed.** Em-dashes elsewhere in the same output happen to survive on standard Windows cp1252 (they're in that code page; the arrow isn't) but would fail on other locales, so the fix covers all of them rather than patching the one visible symptom. Reproduced the exact failure on demand by writing the same string with `encoding="cp1252"` before applying the fix, confirmed it fails identically, then confirmed `encoding="utf-8"` resolves it. This is a real gap in a Linux-only dev/test environment that only a cross-platform run could surface — worth stating plainly rather than implying the test suite would have caught it. |
| **First real evaluation run — found a genuine model-reliability failure mode** | Ran `eval/run_eval.py` live against Ollama + llama3.1 for the first time. | Baseline: 100% accuracy (12/12), perfect precision and recall. **Agent: 0% accuracy (0/12)** — every case's verdict came back Python `None`. Traced via `trajectories/case_02.md`: the agent called exactly ONE tool (`check_amount_anomaly`) on a case where the amount looked normal, then tried to stop and request more evidence rather than committing to a verdict — producing syntactically valid JSON (`{"confidence": 0.6, ...}`) that simply had no `"verdict"` key. My own code only checked "is this valid JSON," never "does this match the schema I asked for," so the missing field silently became `None` instead of a visible failure. | **Two fixes, both directly motivated by this evidence:** (1) Added schema validation after parsing — `verdict` must be exactly `"fraud"` or `"legit"`, or the result is now explicitly `"unparseable"` with the raw text captured, never silent `None`. (2) Strengthened `AGENT_SYSTEM_PROMPT` to explicitly push back on single-signal conclusions ("a single signal is rarely sufficient... typically call SEVERAL of the available tools") and to forbid using the JSON block to ask for more information instead of committing to a verdict. Added two regression tests reproducing this exact failure shape (`test_syntactically_valid_json_missing_verdict_is_treated_as_a_failure`, `test_explicit_null_verdict_is_also_treated_as_a_failure`) — both pass. This is real, first-hand evidence that small (8B-class) local models are meaningfully less reliable at closing out a multi-step tool-use task than at a single-shot classification with the same information — see Hot Take. |
| **Second real run, after the schema-validation and prompt fixes — and the actual headline finding** | Re-ran `eval/run_eval.py` after the fixes above. | Accuracy: baseline 100% (12/12), agent 67% (8/12) — agent recall 0.8, precision 0.571. Checked whether the agent's own 4 wrong verdicts (`case_03`, `case_05`, `case_06`, `case_10`) were flagged for human review: **all 4 were.** Zero wrong verdicts reached the caller unflagged. | Added `safety_breakdown()` to `eval/run_eval.py` as a first-class metric, not a one-off manual check — this is the actual claim this system can defensibly make, and it deserved to be computed automatically on every run, not just this one. Two new tests (`test_safety_breakdown_all_wrong_verdicts_flagged_is_zero_unsafe`, `test_safety_breakdown_catches_a_genuinely_unsafe_case`) prove the metric itself is correct, including that it would visibly flag a real unsafe case if one occurred — it isn't a metric that can only ever report success. |
| **Post-hoc analysis — confidence calibration** | After the second run, checked whether the agent's final confidence score actually tracks correctness, or is just noise attached to a verdict. | Average confidence when correct: 0.825 (n=8). Average confidence when wrong: 0.400 (n=4). More specifically: **every correct verdict has confidence ≥ 0.65; every wrong verdict has confidence ≤ 0.6** — clean separation, no overlap, in this sample. Worth stating plainly: n=12 is small, and this is not a claim that generalizes without more cases — but it's a real, computed result, not an assumption. | This also validates the 0.75 human-review threshold as a deliberately conservative choice rather than a bare-minimum one — the data shows 0.65 would have cleanly separated correct from wrong here, and the system is set well above that. |
| **Post-hoc analysis — a tool that existed but was never used** | Built `src/app/tools/page.tsx` to show real per-tool usage stats, computed directly from the 12 real evidence logs rather than estimated. | `check_prior_flags` was called **0/12 times** — never, despite being available in every case, and despite `case_11` having a genuinely relevant `prior_flags_count: 2` in the underlying data that the tool would have surfaced. The agent still reached the correct verdict on `case_11`, but through amount and device-reputation signals alone. | Not fixed — recorded as a real, honest limitation. Having a capability available doesn't guarantee a model reaches for it; that gap is worth naming rather than glossing over. A natural next iteration would be prompting the model to explicitly consider account history (prior flags), not just transaction-level signals. |
| **Final** | Combined: fair same-context baseline, derived-signal tools, code-enforced human-review gate, verified wire format for both providers, cross-platform-safe file I/O, explicit schema validation on model output, a first-class safety metric, confidence shown to be a real calibrated signal, an honest accounting of which tools actually got used, a test suite that survived being wrong three times and got fixed correctly every time. | 27/27 tests pass across all four test files. Live result on llama3.1 via Ollama: 67% raw accuracy, but **0% unsafe error rate** — every model mistake was caught by the human-review gate before it would have reached an action. | See `docs/REPRODUCTION.md`. |

## Hard case analysis: what case_03 and case_10 actually revealed

Both hard cases test the same thing: does a country mismatch get
correctly weighed against a coherent recent-transaction trail, or
flagged reflexively? The agent got the final label wrong on both
(`fraud` when ground truth is `legit`) — but *why* is more specific
and more useful than "the agent is unreliable."

**The tools worked in both cases.** `check_geo_mismatch` correctly
returned `matches_recent_transaction_trail: true` for both —
transaction country PT matching a recent `["PT", "PT", "FR"]` trail
on case_03; JP matching `["JP", "JP", "US"]` on case_10. That's the
exact disambiguating signal these cases were built to test for, and
evidence-gathering retrieved it correctly both times.

**The failure happened one step later, in how the model's own words
interpreted that evidence:**

- **case_03**: called the Portugal trail a "mitigating factor" in one
  sentence, then treated the same geo signal as still supporting
  fraud in the next — internally inconsistent, not wrong data.
- **case_10**: went further and described the trail-matched mismatch
  as *"the **new** geo mismatch"* — directly contradicting its own
  tool result, which showed this exact country appearing twice
  already in the recent trail. That's not an inconsistent synthesis;
  that's misreading the evidence it just gathered.

This is a **reasoning failure**, distinct from the earlier
schema-validation bug (which was a tool-use/parsing failure). The
tools returned the right evidence; the rationale step failed to
correctly weight it.

**What partially caught it:** the verification pass identified the
contradiction correctly and explicitly in both cases —
*"the tool shows X, but the rationale said Y — these contradict"* —
and lowered confidence accordingly (0.6→0.4 on case_03, 0.8→0.6 on
case_10), both landing under the 0.75 human-review threshold. Both
cases were correctly flagged. A human reviewer seeing "fraud,
confidence 0.4, verification explicitly disagrees with the evidence"
would not treat that as a confident fraud call, even though the raw
`verdict` label is technically wrong.

**What verification currently can't do, named as a real limitation
rather than glossed over:** it can lower confidence and flag for
review, but it cannot correct the verdict label itself, even when it
correctly identifies that the stated reasoning contradicts the
gathered evidence. A natural next iteration — explicitly out of scope
here — would let a verification failure propose a corrected verdict
rather than only ever discount confidence on the original one.

## Main failure mode

The agent's tool loop has a hard cap (`MAX_TOOL_ITERATIONS = 8`). If a
model gets stuck calling tools without converging, it terminates with
an explicit `"unresolved"` verdict rather than hanging — which is safe,
but it means a genuinely ambiguous case could be mis-scored as a
process failure rather than a judgment failure. `test_tool_loop_hits_
iteration_cap_gracefully` proves the cap itself works; it can't prove
the cap is set at the right number for real-world tool-call patterns,
which only a live run can tell us.

The second, larger gap: **the human-review gate is a routing decision,
not a review.** This system produces a recommendation with evidence —
it does not simulate what a human reviewer would actually decide, and
it should not be scored as if "requires_human_review" were itself a
correctness signal. It's a safety property, not an accuracy one.

## Hot take

Two, both earned the hard way rather than asserted upfront.

**The routing around the model matters more than the model.** The
human-review gate is a code-level `if` statement, not a prompt
instruction — a model that reasons well 95% of the time is still
wrong 5% of the time, and for a task where being wrong has real
consequences, that gate needs to be something you can unit test, not
a sentence you hope gets read carefully every time.

**A model that reasons correctly single-shot can still fail to close
out a multi-step task — and the failure looks like success until you
check the schema, not just the syntax.** The baseline (one prompt,
full context, no tools) hit 100% accuracy on llama3.1. The agent,
same model, same underlying task, hit 0% — not because it reasoned
badly, but because after gathering one piece of evidence it tried to
ask a question instead of committing to a verdict, and produced JSON
that was syntactically valid but missing the one field everything
else depended on. My own validation was checking "is this parseable,"
not "does this match the contract" — the same class of gap, one
layer up, as the mock-isolation bug earlier in this table. If you're
validating a model's structured output, valid JSON is necessary and
not remotely sufficient; check the shape you actually asked for.
