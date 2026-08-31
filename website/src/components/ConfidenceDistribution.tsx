import { CASES, isCorrect } from "@/data/cases";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 20, right: 16, bottom: 28, left: 40 };
const CHART_W = WIDTH - PAD.left - PAD.right;
const CHART_H = HEIGHT - PAD.top - PAD.bottom;
const REVIEW_THRESHOLD = 0.75;

export default function ConfidenceDistribution() {
  const sorted = [...CASES].sort((a, b) => a.agent.confidence - b.agent.confidence);
  const barWidth = CHART_W / sorted.length;
  const yFor = (v: number) => PAD.top + CHART_H - v * CHART_H;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Agent confidence per case, sorted ascending, colored by whether the verdict was correct"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={yFor(t)}
            y2={yFor(t)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={yFor(t) + 4}
            textAnchor="end"
            className="fill-text-dim"
            style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          >
            {t.toFixed(2)}
          </text>
        </g>
      ))}

      {sorted.map((c, i) => {
        const correct = isCorrect(c);
        const x = PAD.left + i * barWidth + barWidth * 0.2;
        const w = barWidth * 0.6;
        const y = yFor(c.agent.confidence);
        const h = PAD.top + CHART_H - y;
        return (
          <g key={c.case_id}>
            <rect
              x={x}
              y={y}
              width={w}
              height={Math.max(h, 1)}
              className={correct ? "fill-legit" : "fill-fraud"}
              opacity={0.85}
            />
            <text
              x={x + w / 2}
              y={HEIGHT - PAD.bottom + 14}
              textAnchor="middle"
              className="fill-text-dim"
              style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
            >
              {c.case_id.replace("case_", "#")}
            </text>
          </g>
        );
      })}

      {/* Drawn last, on top of the bars, so a tall bar can never obscure
          the threshold line or its label. */}
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={yFor(REVIEW_THRESHOLD)}
        y2={yFor(REVIEW_THRESHOLD)}
        className="stroke-review"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <rect
        x={WIDTH - PAD.right - 148}
        y={yFor(REVIEW_THRESHOLD) - 18}
        width={148}
        height={14}
        className="fill-bg"
        opacity={0.9}
      />
      <text
        x={WIDTH - PAD.right}
        y={yFor(REVIEW_THRESHOLD) - 8}
        textAnchor="end"
        className="fill-review"
        style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
      >
        review threshold 0.75
      </text>
    </svg>
  );
}
