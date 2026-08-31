const COLOR_CLASS = { legit: "bg-legit", fraud: "bg-fraud", review: "bg-review" } as const;

export default function BarChart({
  items,
}: {
  items: { label: string; value: number; color: keyof typeof COLOR_CLASS }[];
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between font-mono text-xs text-text-dim">
            <span>{item.label}</span>
            <span className="text-text">{Math.round(item.value * 100)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-sm bg-surface-raised">
            <div
              className={`h-full ${COLOR_CLASS[item.color]}`}
              style={{ width: `${item.value * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
