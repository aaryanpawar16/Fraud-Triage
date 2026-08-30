import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import { CASES, isCorrect } from "@/data/cases";

export default function ReviewQueuePage() {
  const queue = CASES.filter((c) => c.agent.requires_human_review);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest2 text-review">
        ground rules 4 &amp; 5 — human in the loop
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-text sm:text-4xl">
        Review queue
      </h1>
      <p className="mt-3 max-w-2xl text-text-dim">
        {queue.length} of 12 cases are routed here — enforced in code, not
        requested in a prompt. Any fraud verdict, low confidence, or
        verification disagreement lands in this queue. The agent produces a
        recommendation; a qualified reviewer makes the actual call.
      </p>

      <div className="mt-10 overflow-hidden rounded-md border border-border">
        {queue.map((c, i) => {
          const correct = isCorrect(c);
          return (
            <Link
              key={c.case_id}
              href={`/cases/${c.case_id}`}
              className={`flex flex-wrap items-center gap-4 p-5 transition hover:bg-surface-raised ${
                i !== queue.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="w-16 shrink-0 font-mono text-sm text-text-dim">
                {c.case_id.replace("case_", "#")}
              </span>
              <VerdictBadge verdict={c.agent.verdict} size="sm" />
              <ConfidenceBar value={c.agent.confidence} />
              <span className="min-w-[14rem] flex-1 truncate text-sm text-text-dim">
                {c.agent.verification.concerns || "verification agreed with the evidence"}
              </span>
              <span
                className={`shrink-0 font-mono text-xs uppercase tracking-widest2 ${
                  correct ? "text-legit" : "text-fraud"
                }`}
              >
                {correct ? "verdict correct" : "verdict wrong"}
              </span>
              <span className="shrink-0 font-mono text-xs text-review">Review &rarr;</span>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 max-w-2xl text-sm text-text-dim">
        4 of these 8 cases were correct calls the agent was simply being
        cautious about. The other 4 were genuine mistakes — all caught
        here, none reaching an action unflagged. Click into any case for
        the full evidence trail and to act on it.
      </p>
    </main>
  );
}
