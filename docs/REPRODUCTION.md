# Reproduction Guide

Written for a clean environment. Every test command below was
actually run during development; the numbers you'll see are what
they produced, not descriptions of expected behavior.

## Versions used during development

| Tool | Version |
|---|---|
| Python | 3.x with `anthropic>=0.40.0`, `ollama>=0.4.0` |

## Setup

```bash
git clone <your-repo>
cd fraud-triage
pip install -r requirements.txt
cp .env.example .env   # then edit .env, or export the variables directly
```

## Data required

None external. `data/cases.json` is fully synthetic — 12 cases, no
real people, no real accounts, no PII. Safe to run and safe to share.

## Choose a provider

### Option A — Ollama (no API key, runs locally)

```bash
# Install Ollama: https://ollama.com/download
ollama pull llama3.1        # or another tool-calling-capable model —
                             # check the model's page on ollama.com
                             # for the "tools" capability badge first
ollama serve                 # if not already running as a service

export LLM_PROVIDER=ollama
export OLLAMA_MODEL=llama3.1
export OLLAMA_HOST=http://localhost:11434
```

**Windows (PowerShell), same steps:**
```powershell
ollama pull llama3.1
ollama serve                 # skip if already running — check with:
                              # curl.exe http://localhost:11434

$env:LLM_PROVIDER = "ollama"
$env:OLLAMA_MODEL = "llama3.1"
$env:OLLAMA_HOST = "http://localhost:11434"
```

Environment variables set this way only apply to the terminal window
you set them in — opening a new window means setting them again there
before running anything that needs them.

**Cost: $0.** Compute is whatever your own machine costs to run.
Quality depends heavily on which model you pull — smaller models (7-8B)
may struggle with the multi-step tool-calling loop; if you see a lot
of `"verdict": "unresolved"` results, try a larger or more
tool-reliable model.

### Option B — Anthropic API

```bash
export LLM_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-...   # never commit this
export ANTHROPIC_MODEL=claude-sonnet-5
```

**Windows (PowerShell):**
```powershell
$env:LLM_PROVIDER = "anthropic"
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # never commit this
$env:ANTHROPIC_MODEL = "claude-sonnet-5"
```

**Cost: real, from your account's usage.** `eval/run_eval.py` makes 1
call per baseline case and 2+ calls per agent case (tool loop +
verification) — for 12 cases, expect on the order of 12 + ~30-40 calls
total. Check current per-token pricing at
https://docs.claude.com before running at any scale beyond this
12-case set.

## Run the tests (no provider needed for this part)

```bash
python3 tests/test_tools.py
python3 tests/test_harness_mechanics.py
python3 tests/test_scoring.py
python3 tests/test_message_translation.py
```

Expected: 23/23 pass, in well under a second total, no network calls.
These verify the tool logic, the tool-calling loop and human-review
gate, the scoring math, and the Anthropic/Ollama wire-format
translation — all independent of any live model.

## Run baseline and agent individually

```bash
python3 baseline/run_baseline.py    # prints JSON to stdout
python3 agent/run_agent.py          # prints JSON to stdout
```

## Run the full evaluation

```bash
python3 eval/run_eval.py
```

This runs both systems across all 12 cases, scores against ground
truth, and writes:

- `results/eval_results.json` — full structured output
- `results/summary.md` — the metric table
- `trajectories/case_01.md` ... `case_12.md` — one readable
  trajectory per case, built directly from the real tool calls and
  responses that happened during the run

**Runtime:** dominated by model latency, not local compute. With the
Anthropic API, expect roughly 1-3 minutes total for all 12 cases.
With Ollama, runtime depends entirely on your hardware and chosen
model size — could be faster or much slower than the API.

## What "correct" looks like

- All 23 tests pass with **zero** network calls or API keys required.
- `eval/run_eval.py` completes without raising, and every case in
  `results/eval_results.json` has a `verdict` of `"fraud"` or
  `"legit"` (not `"unparseable"` or `"unresolved"` — a few of those
  is a sign the model you chose isn't reliably following the tool-use
  or JSON-output instructions; try a different model).
- `results/summary.md`'s accuracy row is the primary metric to look
  at first; the two "hard case" rows at the bottom are worth reading
  by hand regardless of the aggregate number.

## If something doesn't reproduce

If Ollama tool calls come back empty even though you called
`ollama.chat(..., tools=...)`, the most common cause is the model
itself not supporting tool use — not every Ollama model does. Check
the model's page on ollama.com for a "tools" capability badge before
troubleshooting anything else.
