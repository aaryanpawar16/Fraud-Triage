import Link from "next/link";
import type { Metadata } from "next";
import SafetyMatrix from "@/components/SafetyMatrix";
import { AGGREGATE } from "@/data/cases";

export const metadata: Metadata = {
  title: "Overview — Fraud Triage Agent",
  description: "The safety matrix and the headline finding: zero unsafe error rate.",
};


export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-widest2 text-review">
            trust &amp; safety — agent case review
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.15] text-text sm:text-5xl">
            Zero of this agent&apos;s mistakes reached the caller unflagged.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-dim">
            A fraud triage agent that gathers evidence through real tool
            calls, checks its own reasoning against that evidence, and knows
            when to hand a case to a human — evaluated against 12 real
            cases, on a real local model, not simulated results.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/results"
              className="rounded-sm bg-review px-6 py-3 font-mono text-sm font-medium uppercase tracking-wide text-bg transition hover:bg-review/90"
            >
              See the results
            </Link>
            <Link
              href="/review"
              className="rounded-sm border border-border px-6 py-3 font-mono text-sm uppercase tracking-wide text-text-dim transition hover:border-text-dim hover:text-text"
            >
              Open review queue
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl font-semibold text-text">
            What the safety matrix actually shows
          </h2>
          <p className="mt-3 max-w-2xl text-text-dim">
            Raw accuracy favors a simple prompt over this agent — 67% vs
            100% on the same 12 cases. But the claim this system makes
            isn&apos;t &ldquo;always right.&rdquo; It&apos;s &ldquo;wrong
            less dangerously.&rdquo; Every one of its 4 mistakes was
            caught by its own confidence and verification checks before it
            would have reached an action.
          </p>
          <div className="mt-8 max-w-2xl">
            <SafetyMatrix />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl font-semibold text-text">
            Two things beyond per-case triage
          </h2>
          <p className="mt-3 max-w-2xl text-text-dim">
            Everything above happens one transaction at a time. Two
            capabilities go further.
          </p>
          <div className="mt-8 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            <Link
              href="/orchestration"
              className="bg-surface p-6 transition hover:bg-surface-raised sm:p-8"
            >
              <p className="font-mono text-xs uppercase tracking-widest2 text-review">
                orchestration
              </p>
              <h3 className="mt-2 font-display text-xl text-text">
                The fraud no single case reveals
              </h3>
              <p className="mt-2 text-sm text-text-dim">
                Two individually-clean cases secretly share one device
                across unrelated accounts — a pattern no per-case agent
                can see. A third agent tier catches it, proven to require
                the cross-case comparison, not just possess one.
              </p>
            </Link>
            <Link
              href="/security"
              className="bg-surface p-6 transition hover:bg-surface-raised sm:p-8"
            >
              <p className="font-mono text-xs uppercase tracking-widest2 text-review">
                security
              </p>
              <h3 className="mt-2 font-display text-xl text-text">
                Resistance held, but not for free
              </h3>
              <p className="mt-2 text-sm text-text-dim">
                A live prompt-injection test in a transaction field: the
                agent reached the correct verdict and ignored the
                injected instruction — but confidence dropped to the
                lowest of any case in the project.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border px-6 py-0 sm:grid-cols-4 sm:px-0">
          <Stat label="Agent accuracy" value={`${Math.round(AGGREGATE.agent.accuracy * 100)}%`} />
          <Stat label="Agent recall (fraud)" value={AGGREGATE.agent.recall.toFixed(2)} />
          <Stat label="Baseline accuracy" value={`${Math.round(AGGREGATE.baseline.accuracy * 100)}%`} />
          <Stat label="Unsafe error rate" value="0%" highlight />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <Link href="/case-list" className="font-mono text-sm text-review hover:underline">
            Browse all 12 cases &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-surface p-6 text-center sm:p-8">
      <div
        className={`font-display text-3xl font-semibold ${highlight ? "text-legit" : "text-text"}`}
      >
        {value}
      </div>
      <div className="mt-2 font-mono text-xs uppercase tracking-widest2 text-text-dim">
        {label}
      </div>
    </div>
  );
}
