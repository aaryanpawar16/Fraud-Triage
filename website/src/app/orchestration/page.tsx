import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orchestration — Fraud Triage Agent",
  description: "A fraud ring no single case can reveal alone — cross-case device-reuse detection.",
};


const RING_CASES = [
  {
    id: "ring_01_alpha",
    account: "acct_ring_alpha",
    merchant: "QuickMart Convenience",
    amount: "$85",
  },
  {
    id: "ring_02_beta",
    account: "acct_ring_beta",
    merchant: "Downtown Pharmacy",
    amount: "$62",
  },
];

export default function OrchestrationPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest2 text-review">
        orchestration — a third agent tier
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-text sm:text-4xl">
        The fraud no single case can reveal
      </h1>
      <p className="mt-4 max-w-2xl text-text-dim">
        Every case elsewhere on this site is triaged in isolation. Real
        fraud rings don&apos;t look suspicious one account at a time — the
        signal only exists in the comparison across accounts, which a
        per-case agent, however good, structurally never performs.
      </p>
      <p className="mt-3 max-w-2xl">
        <Link href="/ring-check" className="font-mono text-sm text-review hover:underline">
          Try it live with your own transactions &rarr;
        </Link>
      </p>

      {/* The two clean-looking cases */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        {RING_CASES.map((c) => (
          <div key={c.id} className="rounded-md border border-border bg-surface p-6">
            <p className="font-mono text-xs uppercase tracking-widest2 text-legit">
              individually: clean
            </p>
            <p className="mt-3 font-mono text-sm text-text">{c.id}</p>
            <dl className="mt-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <dt className="text-text-dim">Account</dt>
                <dd className="text-text">{c.account}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-dim">Merchant</dt>
                <dd className="text-text">{c.merchant}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-dim">Amount</dt>
                <dd className="text-text">{c.amount}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-text-dim">
              No amount anomaly, no geo mismatch — nothing here that Tier 1
              would ever flag on its own.
            </p>
          </div>
        ))}
      </section>

      {/* The reveal */}
      <section className="mt-6 rounded-md border border-fraud/30 bg-fraud-dim/10 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest2 text-fraud">
          the link neither case reveals alone
        </p>
        <p className="mt-3 font-display text-2xl text-text">
          Both used device{" "}
          <code className="text-fraud">dev_shared_x7</code>
        </p>
        <p className="mt-2 text-sm text-text-dim">
          The same physical device, two unrelated accounts — a textbook
          synthetic-identity signature.
        </p>
      </section>

      {/* How it was found */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-text">
          How the detector works — and why it&apos;s deterministic
        </h2>
        <p className="mt-3 max-w-2xl text-text-dim">
          <code className="text-text">agent/pattern_detector.py</code>{" "}
          groups every case by device_id and flags any device appearing
          across more than one distinct account. No LLM call — the fact
          that a cluster exists should never depend on a model&apos;s
          judgment, only what it means should.
        </p>
        <div className="mt-6 rounded-md border border-border bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-widest2 text-text-dim">
            Proven, not just built
          </p>
          <ul className="mt-3 space-y-2 text-sm text-text-dim">
            <li>
              &middot; Run on each ring case <em>alone</em>: finds nothing —
              proving the capability genuinely requires the orchestration
              layer, not just possessing one.
            </li>
            <li>
              &middot; Run on all 12 real cases: zero false positives — the
              detector is specific, not just sensitive.
            </li>
            <li>
              &middot; Run on all 14 cases together: finds exactly the one
              real cluster, exactly the two linked accounts.
            </li>
          </ul>
        </div>
      </section>

      <p className="mt-10 text-sm text-text-dim">
        See{" "}
        <Link href="/results" className="text-review hover:underline">
          /results
        </Link>{" "}
        for the per-case triage this builds on, or{" "}
        <code className="text-text">docs/CHANGELOG.md</code>&apos;s
        &ldquo;Tier 3&rdquo; entry for the full write-up.
      </p>
    </main>
  );
}
