import { CASES } from "@/data/cases";

export default function ConfidenceJourney() {
  const rows = CASES.map((c) => ({
    id: c.case_id,
    raw: c.agent.rawProposalConfidence,
    adjusted: c.agent.confidence,
    agreed: c.agent.verification.evidence_supports_verdict,
  })).sort((a, b) => Math.abs(b.adjusted - b.raw) - Math.abs(a.adjusted - a.raw));

  return (
    <div>
      <div className="mb-4 flex items-center gap-5 font-mono text-[11px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-bg bg-text-dim" /> proposed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-bg bg-legit" /> verified, agreed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-bg bg-fraud" /> verified, disagreed
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((r) => {
          const color = r.agreed ? "bg-legit" : "bg-fraud";
          const textColor = r.agreed ? "text-legit" : "text-fraud";
          const left = Math.min(r.raw, r.adjusted) * 100;
          const width = Math.max(Math.abs(r.adjusted - r.raw) * 100, 0.5);
          return (
            <div key={r.id} className="flex items-center gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-text-dim">
                {r.id.replace("case_", "#")}
              </span>
              <div className="relative h-2 flex-1 rounded-full bg-surface-raised">
                <div
                  className={`absolute h-full rounded-full opacity-30 ${color}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                <div
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-bg bg-text-dim"
                  style={{ left: `calc(${r.raw * 100}% - 5px)` }}
                />
                <div
                  className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-bg ${color}`}
                  style={{ left: `calc(${r.adjusted * 100}% - 5px)` }}
                />
              </div>
              <span className={`w-24 shrink-0 text-right font-mono text-xs ${textColor}`}>
                {r.raw.toFixed(2)} &rarr; {r.adjusted.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
