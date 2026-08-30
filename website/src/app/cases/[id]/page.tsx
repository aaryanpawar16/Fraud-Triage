import { notFound } from "next/navigation";
import Link from "next/link";
import VerdictBadge from "@/components/VerdictBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import ReviewActionPanel from "@/components/ReviewActionPanel";
import { CASES, isCorrect } from "@/data/cases";

export function generateStaticParams() {
  return CASES.map((c) => ({ id: c.case_id }));
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const c = CASES.find((x) => x.case_id === params.id);
  if (!c) return notFound();

  const correct = isCorrect(c);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/cases" className="font-mono text-xs text-text-dim hover:text-text">
        &larr; all cases
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-text">{c.case_id}</h1>
        <span
          className={`font-mono text-xs uppercase tracking-widest2 ${
            correct ? "text-legit" : "text-fraud"
          }`}
        >
          {correct ? "correct" : "wrong"}
        </span>
        {c.is_hard_case && (
          <span className="rounded-sm border border-review/50 bg-review-dim/20 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest2 text-review">
            hard case
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-sm text-text-dim">
        Ground truth: <span className="text-text">{c.ground_truth}</span>{" "}
        (withheld from both systems)
      </p>

      {/* Exhibit: the transaction */}
      <section className="mt-10 rounded-md border border-border bg-surface p-6">
        <p className="font-mono text-xs uppercase tracking-widest2 text-text-dim">
          Exhibit — transaction
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-3">
          <Field label="Merchant" value={c.transaction.merchant} />
          <Field label="Category" value={c.transaction.merchant_category} />
          <Field label="Amount" value={`$${c.transaction.amount_usd.toLocaleString()}`} />
          <Field label="Country" value={c.transaction.country} />
          <Field label="Device" value={c.transaction.device_id} />
          <Field label="Timestamp" value={c.transaction.timestamp} />
        </dl>
      </section>

      {/* Baseline */}
      <section className="mt-6 rounded-md border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest2 text-text-dim">
            Baseline — single prompt, no tools
          </p>
          <VerdictBadge verdict={c.baseline.verdict} size="sm" />
        </div>
        <p className="mt-3 text-sm text-text-dim">{c.baseline.rationale}</p>
        <div className="mt-3">
          <ConfidenceBar value={c.baseline.confidence} />
        </div>
      </section>

      {/* Agent evidence trail */}
      <section className="mt-6 rounded-md border border-border bg-surface p-6">
        <p className="font-mono text-xs uppercase tracking-widest2 text-text-dim">
          Agent — evidence trail ({c.agent.tool_calls_made} tool calls)
        </p>
        <div className="mt-4 space-y-3">
          {c.agent.evidence_log.map((ev, i) => (
            <div key={i} className="rounded border border-border bg-bg p-3">
              <p className="font-mono text-xs text-info">{ev.tool}(...)</p>
              <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-text-dim">
                {JSON.stringify(ev.result)}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Proposed verdict */}
      <section className="mt-6 rounded-md border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest2 text-text-dim">
            Proposed verdict
          </p>
          <VerdictBadge verdict={c.agent.verdict} size="sm" />
        </div>
        <p className="mt-3 text-sm text-text-dim">{c.agent.rationale}</p>
        <ul className="mt-3 space-y-1">
          {c.agent.evidence_cited.map((e, i) => (
            <li key={i} className="font-mono text-xs text-info">
              &middot; {e}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2 font-mono text-xs text-text-dim">
          <span>raw confidence:</span>
          <span className="text-text">{c.agent.rawProposalConfidence.toFixed(2)}</span>
        </div>
      </section>

      {/* Verification — reviewer annotation styled distinctly */}
      <section className="mt-6 rounded-md border-l-2 border-review bg-review-dim/10 p-6">
        <p className="font-mono text-xs uppercase tracking-widest2 text-review">
          Verification pass
        </p>
        <p className="mt-3 text-sm text-text">
          Evidence supports verdict:{" "}
          <span className={c.agent.verification.evidence_supports_verdict ? "text-legit" : "text-fraud"}>
            {String(c.agent.verification.evidence_supports_verdict)}
          </span>
        </p>
        {c.agent.verification.concerns && (
          <p className="mt-2 text-sm text-text-dim">{c.agent.verification.concerns}</p>
        )}
        <div className="mt-3 flex items-center gap-2 font-mono text-xs">
          <span className="text-text-dim">adjusted confidence:</span>
          <span className="text-review">{c.agent.confidence.toFixed(2)}</span>
        </div>
      </section>

      {/* Human checkpoint */}
      <section className="mt-6">
        {c.agent.requires_human_review ? (
          <ReviewActionPanel caseId={c.case_id} />
        ) : (
          <div className="rounded-md border border-legit/40 bg-legit-dim/10 p-5">
            <p className="font-mono text-xs uppercase tracking-widest2 text-legit">
              No review required
            </p>
            <p className="mt-2 text-sm text-text-dim">
              Confidence and verification both cleared threshold — resolved
              without human input.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest2 text-text-dim">{label}</dt>
      <dd className="mt-1 text-text">{value}</dd>
    </div>
  );
}
