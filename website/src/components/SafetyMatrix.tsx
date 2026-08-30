import { AGGREGATE } from "@/data/cases";

export default function SafetyMatrix({ compact = false }: { compact?: boolean }) {
  const s = AGGREGATE.safety;
  const cellBase = compact ? "p-4" : "p-6";

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="grid grid-cols-[auto_1fr_1fr]">
        <div className="border-b border-r border-border bg-surface-raised" />
        <div className="border-b border-r border-border bg-surface-raised p-3 text-center font-mono text-xs uppercase tracking-widest2 text-legit">
          Correct
        </div>
        <div className="border-b border-border bg-surface-raised p-3 text-center font-mono text-xs uppercase tracking-widest2 text-fraud">
          Wrong
        </div>

        <div className="border-r border-border bg-surface-raised p-3 text-center font-mono text-xs uppercase tracking-widest2 text-text-dim">
          No review<br />needed
        </div>
        <div className={`border-r border-border bg-surface ${cellBase} text-center`}>
          <div className="font-display text-3xl font-semibold text-text">{s.correct_no_review}</div>
          <div className="mt-1 text-xs text-text-dim">resolved confidently, correctly</div>
        </div>
        <div className={`bg-fraud-dim/10 ${cellBase} text-center`}>
          <div className="font-display text-3xl font-semibold text-fraud">{s.wrong_no_review}</div>
          <div className="mt-1 text-xs text-fraud/80">the dangerous quadrant — stayed at zero</div>
        </div>

        <div className="border-r border-t border-border bg-surface-raised p-3 text-center font-mono text-xs uppercase tracking-widest2 text-text-dim">
          Review<br />required
        </div>
        <div className={`border-r border-t border-border bg-surface ${cellBase} text-center`}>
          <div className="font-display text-3xl font-semibold text-text">{s.correct_with_review}</div>
          <div className="mt-1 text-xs text-text-dim">flagged out of caution, was right</div>
        </div>
        <div className={`border-t border-border bg-review-dim/10 ${cellBase} text-center`}>
          <div className="font-display text-3xl font-semibold text-review">{s.wrong_with_review}</div>
          <div className="mt-1 text-xs text-review/80">flagged, and the flag was earned</div>
        </div>
      </div>
    </div>
  );
}
