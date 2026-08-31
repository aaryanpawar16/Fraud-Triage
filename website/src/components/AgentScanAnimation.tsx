"use client";

import { useEffect, useState } from "react";
import { CASES } from "@/data/cases";

// A representative spread of real cases — a clean pass, a hard case,
// a false negative, a ring-adjacent style, and a fraud call — cycled
// for visual variety, not cherry-picked for a flattering result.
const DEMO_CASE_IDS = ["case_02", "case_03", "case_06", "case_09", "case_11"];

export default function AgentScanAnimation() {
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % DEMO_CASE_IDS.length);
      setTick((t) => t + 1);
    }, 3400);
    return () => clearInterval(interval);
  }, []);

  const caseId = DEMO_CASE_IDS[index];
  const c = CASES.find((x) => x.case_id === caseId)!;
  const correct = c.agent.verdict === c.ground_truth;

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-md border border-border bg-surface p-6">
      <div className="flex items-center justify-between font-mono text-xs text-text-dim">
        <span className="text-text">{c.case_id}</span>
        <span className="truncate pl-3">{c.transaction.merchant}</span>
      </div>

      <div className="mt-5 space-y-2">
        {c.agent.evidence_log.map((ev, i) => (
          <div
            key={`${tick}-${ev.tool}-${i}`}
            className="scan-row flex items-center gap-2 rounded border border-border bg-bg px-3 py-2 font-mono text-[11px] text-info"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-review" />
            <span className="truncate">{ev.tool}(...)</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span
          className={`font-mono text-xs uppercase tracking-widest2 ${
            c.agent.verdict === "fraud" ? "text-fraud" : "text-legit"
          }`}
        >
          {c.agent.verdict}
        </span>
        <span className="font-mono text-xs text-text-dim">
          confidence {c.agent.confidence.toFixed(2)}
        </span>
        <span
          className={`font-mono text-[10px] uppercase tracking-widest2 ${
            correct ? "text-legit" : "text-fraud"
          }`}
        >
          {correct ? "correct" : "wrong"}
        </span>
      </div>

      <div className="scan-sweep pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-transparent via-review/10 to-transparent" />

      <style jsx>{`
        .scan-row {
          opacity: 0;
          animation: fadeIn 0.5s ease forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-6px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .scan-sweep {
          animation: sweep 3.4s linear infinite;
        }
        @keyframes sweep {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(600%);
          }
        }
      `}</style>
    </div>
  );
}
