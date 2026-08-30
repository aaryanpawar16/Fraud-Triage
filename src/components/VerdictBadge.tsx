export default function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: "fraud" | "legit";
  size?: "sm" | "md";
}) {
  const isFraud = verdict === "fraud";
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-sm border font-mono uppercase tracking-widest2 ${pad} ${
        isFraud
          ? "border-fraud/50 bg-fraud-dim/30 text-fraud"
          : "border-legit/50 bg-legit-dim/30 text-legit"
      }`}
    >
      {verdict}
    </span>
  );
}
