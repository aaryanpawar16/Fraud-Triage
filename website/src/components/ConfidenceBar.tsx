export default function ConfidenceBar({
  value,
  reviewThreshold = 0.75,
}: {
  value: number;
  reviewThreshold?: number;
}) {
  const pct = Math.round(value * 100);
  const belowThreshold = value < reviewThreshold;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-raised">
        <div
          className={`h-full rounded-full ${belowThreshold ? "bg-review" : "bg-legit"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-text-dim">{value.toFixed(2)}</span>
    </div>
  );
}
