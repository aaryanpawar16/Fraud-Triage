"use client";

import type { EvidenceEntry } from "@/data/cases";

export default function EvidenceTrailReveal({
  evidenceLog,
}: {
  evidenceLog: EvidenceEntry[];
}) {
  return (
    <div className="mt-4 space-y-3">
      {evidenceLog.map((ev, i) => (
        <div
          key={i}
          className="reveal-row rounded border border-border bg-bg p-3"
          style={{ animationDelay: `${i * 0.25}s` }}
        >
          <p className="font-mono text-xs text-info">{ev.tool}(...)</p>
          <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px] text-text-dim">
            {JSON.stringify(ev.result)}
          </pre>
        </div>
      ))}
      <style jsx>{`
        .reveal-row {
          opacity: 0;
          animation: revealIn 0.5s ease forwards;
        }
        @keyframes revealIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
