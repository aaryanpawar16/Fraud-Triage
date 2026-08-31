import type { Metadata } from "next";
import { CASES } from "@/data/cases";
import AnimatedBar from "@/components/AnimatedBar";

export const metadata: Metadata = {
  title: "Tools — Fraud Triage Agent",
  description: "The agent pipeline and real per-tool usage statistics.",
};


const TOOL_INFO: Record<string, string> = {
  check_velocity:
    "Counts how many of this account's recent transactions landed within the last N minutes. Catches rapid bursts a single transaction viewed alone would miss.",
  check_geo_mismatch:
    "Compares the transaction's country to the account's typical country AND to the recent transaction trail. A mismatch that matches a recent trail usually means travel, not takeover.",
  check_device_reputation:
    "Returns the device's reputation score and whether it's new to this account — independent signals, checked separately on purpose.",
  check_amount_anomaly:
    "Compares the amount to THIS account's own typical range, not a population-wide threshold.",
  check_prior_flags:
    "Returns how many times this account has been flagged before.",
  check_account_tenure:
    "Returns the account's age in days and whether it counts as new (<90 days).",
};

const PIPELINE = [
  { label: "Transaction received", detail: "Only the raw transaction — account history withheld until requested" },
  { label: "Tool calls", detail: "Agent decides which signals to gather, in any order" },
  { label: "Proposed verdict", detail: "fraud or legit, with confidence and cited evidence" },
  { label: "Verification pass", detail: "Separate check: does the evidence actually support the verdict?" },
  { label: "Human review gate", detail: "Enforced in code — fraud, low confidence, or disagreement all route here" },
];

export default function ToolsPage() {
  const toolCounts: Record<string, { count: number; cases: string[] }> = {};
  for (const name of Object.keys(TOOL_INFO)) toolCounts[name] = { count: 0, cases: [] };
  for (const c of CASES) {
    for (const ev of c.agent.evidence_log) {
      if (!toolCounts[ev.tool]) toolCounts[ev.tool] = { count: 0, cases: [] };
      toolCounts[ev.tool].count++;
      toolCounts[ev.tool].cases.push(c.case_id);
    }
  }

  const neverCalled = Object.entries(toolCounts).filter(([, d]) => d.count === 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest2 text-review">
        agent solution &amp; engineering
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-text sm:text-4xl">
        How it works
      </h1>
      <p className="mt-3 max-w-2xl text-text-dim">
        The pipeline every case goes through, and exactly which tools the
        agent actually reached for across the real 12-case run — not which
        tools it could theoretically use.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PIPELINE.map((step, i) => (
          <div key={step.label} className="flex flex-col border border-border bg-surface p-5">
            <span className="font-mono text-xs text-review">{i + 1}</span>
            <h3 className="mt-1 text-sm text-text">{step.label}</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-dim">{step.detail}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-16 font-display text-2xl font-semibold text-text">
        Tool usage across all 12 cases
      </h2>
      <p className="mt-3 max-w-2xl text-text-dim">
        Computed directly from the real evidence logs, not estimated.
      </p>

      <div className="mt-8 overflow-hidden rounded-md border border-border">
        {Object.entries(toolCounts).map(([tool, data], i, arr) => (
          <div
            key={tool}
            className={`p-5 ${i !== arr.length - 1 ? "border-b border-border" : ""} ${
              data.count === 0 ? "bg-fraud-dim/5" : ""
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="font-mono text-sm text-info">{tool}</span>
              <span
                className={`font-mono text-xs uppercase tracking-widest2 ${
                  data.count === 0 ? "text-fraud" : "text-text-dim"
                }`}
              >
                {data.count === 0 ? "never called" : `${data.count}/12 cases`}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-dim">{TOOL_INFO[tool]}</p>
            <AnimatedBar
              targetPercent={(data.count / 12) * 100}
              colorClass={data.count === 0 ? "bg-fraud" : "bg-review"}
            />
          </div>
        ))}
      </div>

      {neverCalled.length > 0 && (
        <div className="mt-8 rounded-md border border-fraud/30 bg-fraud-dim/10 p-6">
          <span className="font-mono text-xs uppercase tracking-widest2 text-fraud">
            a tool that existed but was never used
          </span>
          <p className="mt-3 text-sm text-text-dim">
            <code className="text-text">check_prior_flags</code> was
            available in every case and was never called, not once — despite{" "}
            <code className="text-text">case_11</code> having a genuinely
            relevant <code className="text-text">prior_flags_count: 2</code>{" "}
            in the underlying data. The agent still got case_11 right, but
            via amount and device-reputation signals alone, not the one tool
            most directly suited to it. Having the right capability
            available doesn&apos;t guarantee the model reaches for it —
            that gap is worth naming, not glossing over.
          </p>
        </div>
      )}
    </main>
  );
}
