import Link from "next/link";

const SECTIONS = [
  { href: "/overview", label: "Overview", desc: "The safety matrix and the headline finding" },
  { href: "/results", label: "Results", desc: "Full metrics, confidence calibration, hard cases" },
  { href: "/cases", label: "Cases", desc: "All 12 cases, baseline vs. agent, side by side" },
  { href: "/tools", label: "Tools", desc: "The pipeline and real per-tool usage stats" },
  { href: "/review", label: "Review queue", desc: "The 8 flagged cases, actionable" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <p className="font-mono text-xs uppercase tracking-widest2 text-review">
            trust &amp; safety agent case review
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.1] text-text sm:text-6xl">
            Fraud Triage Agent
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-dim">
            An evidence-based triage agent for flagged transactions —
            evaluated against 12 real cases on a real local model, not
            simulated results.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/overview"
              className="rounded-sm bg-review px-6 py-3 font-mono text-sm font-medium uppercase tracking-wide text-bg transition hover:bg-review/90"
            >
              Enter case review
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
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <span className="font-display text-4xl font-semibold text-legit">0%</span>
          <span className="ml-3 font-mono text-sm uppercase tracking-widest2 text-text-dim">
            unsafe error rate — every mistake caught before it reached an action
          </span>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="bg-surface p-6 transition hover:bg-surface-raised sm:p-8"
              >
                <h2 className="font-mono text-sm uppercase tracking-widest2 text-review">
                  {s.label}
                </h2>
                <p className="mt-2 text-sm text-text-dim">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}