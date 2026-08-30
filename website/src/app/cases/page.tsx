import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import { CASES, isCorrect } from "@/data/cases";

export default function CasesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest2 text-review">case docket</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-text sm:text-4xl">
        All 12 cases
      </h1>
      <p className="mt-3 max-w-2xl text-text-dim">
        Every case the agent processed, with its verdict, confidence, and
        whether it was correct against withheld ground truth.
      </p>

      <div className="mt-10 overflow-x-auto rounded-md border border-border">
        <div className="flex min-w-[900px] items-center gap-4 border-b border-border bg-surface-raised p-4 font-mono text-xs uppercase tracking-widest2 text-text-dim">
          <span className="w-16 shrink-0">Case</span>
          <span className="min-w-[10rem] flex-1">Merchant</span>
          <span className="w-24 shrink-0">Country</span>
          <span className="w-24 shrink-0">Amount</span>
          <span className="w-20 shrink-0">Baseline</span>
          <span className="w-20 shrink-0">Agent</span>
          <span className="w-24 shrink-0">Confidence</span>
          <span className="w-20 shrink-0 text-right">Result</span>
        </div>
        {CASES.map((c, i) => {
          const correct = isCorrect(c);
          const agreeWithBaseline = c.baseline.verdict === c.agent.verdict;
          return (
            <Link
              key={c.case_id}
              href={`/cases/${c.case_id}`}
              className={`flex min-w-[900px] flex-wrap items-center gap-4 p-4 transition hover:bg-surface-raised sm:p-5 ${
                i !== CASES.length - 1 ? "border-b border-border" : ""
              } ${correct ? "" : "bg-fraud-dim/5"}`}
            >
              <span className="w-16 shrink-0 font-mono text-sm text-text-dim">
                {c.case_id.replace("case_", "#")}
              </span>
              <span className="min-w-[10rem] flex-1 truncate text-sm text-text">
                {c.transaction.merchant}
              </span>
              <span className="w-24 shrink-0 font-mono text-xs text-text-dim">
                {c.transaction.country}
              </span>
              <span className="w-24 shrink-0 font-mono text-xs text-text-dim">
                ${c.transaction.amount_usd.toLocaleString()}
              </span>
              <span className="w-20 shrink-0">
                <VerdictBadge verdict={c.baseline.verdict} size="sm" />
              </span>
              <span className="w-20 shrink-0 flex items-center gap-1.5">
                <VerdictBadge verdict={c.agent.verdict} size="sm" />
                {!agreeWithBaseline && (
                  <span className="text-fraud" title="disagrees with baseline">
                    &bull;
                  </span>
                )}
              </span>
              <span className="w-24 shrink-0">
                <ConfidenceBar value={c.agent.confidence} />
              </span>
              <span
                className={`w-20 shrink-0 text-right font-mono text-xs uppercase tracking-widest2 ${
                  correct ? "text-legit" : "text-fraud"
                }`}
              >
                {correct ? "correct" : "wrong"}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 font-mono text-xs text-text-dim">
        <span className="text-fraud">&bull;</span> marks a case where the
        agent&apos;s verdict disagreed with the baseline&apos;s.
      </p>
    </main>
  );
}
