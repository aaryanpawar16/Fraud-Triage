import SafetyMatrix from "@/components/SafetyMatrix";
import ConfidenceJourney from "@/components/ConfidenceJourney";
import BarChart from "@/components/BarChart";
import ConfidenceDistribution from "@/components/ConfidenceDistribution";
import Link from "next/link";
import { AGGREGATE, CASES } from "@/data/cases";

export default function ResultsPage() {
  const hardCases = CASES.filter((c) => c.is_hard_case);
  const falseNegative = CASES.find((c) => c.case_id === "case_06")!;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest2 text-review">
        real run — llama3.1 via ollama
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-text sm:text-4xl">
        Evaluation results
      </h1>
      <p className="mt-3 max-w-2xl text-text-dim">
        12 synthetic cases, ground truth withheld from both systems. Every
        number below is from one real run — see{" "}
        <code className="text-text">results/eval_results.json</code>.
      </p>

      <div className="mt-12 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-left text-xs uppercase tracking-widest2 text-text-dim">
              <th className="p-4 font-normal">Metric</th>
              <th className="p-4 font-normal">Baseline</th>
              <th className="p-4 font-normal">Agent</th>
            </tr>
          </thead>
          <tbody className="text-text-dim">
            <Row label="Accuracy" a="100% (12/12)" b="67% (8/12)" />
            <Row label="Precision (fraud)" a="1.0" b="0.571" />
            <Row label="Recall (fraud)" a="1.0" b="0.8" />
            <Row label="Wall time / case" a="136.4s" b="207.8s" />
            <Row label="Requires human review" a="—" b="8/12" />
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-md border border-border bg-surface p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest2 text-text-dim">
          Baseline
        </h3>
        <div className="mt-4">
          <BarChart
            items={[
              { label: "Accuracy", value: AGGREGATE.baseline.accuracy, color: "legit" },
              { label: "Precision (fraud)", value: 1.0, color: "legit" },
              { label: "Recall (fraud)", value: 1.0, color: "legit" },
            ]}
          />
        </div>
        <h3 className="mt-8 font-mono text-xs uppercase tracking-widest2 text-text-dim">
          Agent
        </h3>
        <div className="mt-4">
          <BarChart
            items={[
              { label: "Accuracy", value: AGGREGATE.agent.accuracy, color: "review" },
              { label: "Precision (fraud)", value: 0.571, color: "review" },
              { label: "Recall (fraud)", value: AGGREGATE.agent.recall, color: "review" },
            ]}
          />
        </div>
      </div>

      <h2 className="mt-16 font-display text-2xl font-semibold text-text">
        The safety breakdown
      </h2>
      <p className="mt-3 max-w-2xl text-text-dim">
        The number that actually matters for a triage agent: not &ldquo;did
        it label correctly,&rdquo; but &ldquo;did a wrong label ever reach
        an action without a human catching it.&rdquo; Here, that number is
        zero.
      </p>
      <div className="mt-6 max-w-2xl">
        <SafetyMatrix />
      </div>

      <h2 className="mt-16 font-display text-2xl font-semibold text-text">
        Confidence journey
      </h2>
      <p className="mt-3 max-w-2xl text-text-dim">
        Every case&apos;s proposed confidence versus its confidence after the
        verification pass. The single largest swing —{" "}
        <Link href="/cases/case_06" className="text-review hover:underline">
          case_06
        </Link>
        , 0.8 down to 0.0 — happened because verification caught the model
        contradicting its own tool result mid-rationale.
      </p>
      <div className="mt-8 rounded-md border border-border bg-surface p-6">
        <ConfidenceJourney />
      </div>

      <h2 className="mt-16 font-display text-2xl font-semibold text-text">
        Is confidence actually meaningful?
      </h2>
      <p className="mt-3 max-w-2xl text-text-dim">
        Checked directly rather than assumed: average confidence when correct
        is <span className="text-legit">0.825</span>; average confidence when
        wrong is <span className="text-fraud">0.400</span>. More
        specifically — every correct verdict in this run sits at confidence{" "}
        <span className="text-text">&ge; 0.65</span>; every wrong one sits at{" "}
        <span className="text-text">&le; 0.6</span>. Clean separation, no
        overlap, in these 12 cases. Worth saying plainly: that&apos;s a small
        sample and this isn&apos;t a claim that generalizes on its own — but
        it&apos;s a real, computed result, and it means the 0.75 human-review
        threshold is a deliberately conservative choice, not a bare-minimum
        one.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
        <div className="bg-surface p-6 text-center">
          <div className="font-display text-3xl font-semibold text-legit">0.825</div>
          <div className="mt-2 font-mono text-xs uppercase tracking-widest2 text-text-dim">
            avg confidence, correct (n=8)
          </div>
        </div>
        <div className="bg-surface p-6 text-center">
          <div className="font-display text-3xl font-semibold text-fraud">0.400</div>
          <div className="mt-2 font-mono text-xs uppercase tracking-widest2 text-text-dim">
            avg confidence, wrong (n=4)
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-border bg-surface p-6">
        <ConfidenceDistribution />
        <div className="mt-3 flex items-center gap-5 font-mono text-[11px] text-text-dim">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-legit" /> correct verdict
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-fraud" /> wrong verdict
          </span>
        </div>
      </div>

      <h2 className="mt-16 font-display text-2xl font-semibold text-text">
        Hard cases: what they actually revealed
      </h2>
      <p className="mt-3 max-w-2xl text-text-dim">
        Both cases test the same thing — does a country mismatch get
        correctly weighed against a coherent recent-transaction trail, or
        flagged reflexively. The agent got both wrong. The tools worked in
        both; the failure happened one step later, in how the rationale
        interpreted the evidence.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {hardCases.map((c) => (
          <Link
            key={c.case_id}
            href={`/cases/${c.case_id}`}
            className="block rounded-md border border-border bg-surface p-6 transition hover:border-review/50"
          >
            <span className="font-mono text-xs uppercase tracking-widest2 text-review">
              {c.case_id}
            </span>
            <p className="mt-2 text-sm text-text-dim">
              {c.transaction.merchant} · {c.transaction.country} · $
              {c.transaction.amount_usd.toLocaleString()}
            </p>
            <p className="mt-3 text-sm text-text">
              Truth: <span className="text-legit">legit</span> — agent said{" "}
              <span className="text-fraud">fraud</span>, confidence dropped
              to {c.agent.confidence.toFixed(2)} after verification flagged
              a contradiction.
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-md border border-fraud/30 bg-fraud-dim/10 p-6">
        <span className="font-mono text-xs uppercase tracking-widest2 text-fraud">
          the one false negative — case_06
        </span>
        <p className="mt-3 text-sm text-text-dim">
          Unlike the hard cases, this wasn&apos;t a reasoning failure over
          correctly-gathered evidence — the agent never called{" "}
          <code className="text-text">check_velocity</code> at all, missing
          the five $1.00 charges in 15 minutes that both the baseline and
          the ground truth caught. Confidence collapsed to{" "}
          {falseNegative.agent.confidence.toFixed(1)} after verification
          caught a separate self-contradiction, so it was still flagged for
          review — but the underlying cause was an evidence-gathering gap,
          not a weighing error.
        </p>
        <Link
          href="/cases/case_06"
          className="mt-3 inline-block font-mono text-sm text-fraud hover:underline"
        >
          View full trajectory &rarr;
        </Link>
      </div>
    </main>
  );
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-4 text-text">{label}</td>
      <td className="p-4">{a}</td>
      <td className="p-4">{b}</td>
    </tr>
  );
}