"use client";

import { useState } from "react";

export default function ReviewActionPanel({ caseId }: { caseId: string }) {
  const [action, setAction] = useState<"approve" | "escalate" | null>(null);

  if (action) {
    return (
      <div className="rounded-md border border-legit/40 bg-legit-dim/10 p-5">
        <p className="font-mono text-xs uppercase tracking-widest2 text-legit">
          {action === "approve" ? "Reviewed — verdict approved" : "Escalated for senior review"}
        </p>
        <p className="mt-2 text-sm text-text-dim">
          This demonstrates the reviewer workflow for {caseId}. Since this is
          a static evaluation record, this action isn&apos;t written back to
          the underlying data — a production version would log the
          reviewer, timestamp, and final decision against the case.
        </p>
        <button
          onClick={() => setAction(null)}
          className="mt-3 font-mono text-xs text-text-dim underline hover:text-text"
        >
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-review/40 bg-review-dim/10 p-5">
      <p className="font-mono text-xs uppercase tracking-widest2 text-review">
        Awaiting human review
      </p>
      <p className="mt-2 text-sm text-text-dim">
        This is a recommendation, not an action — ground rules 4 &amp; 5. A
        qualified reviewer decides from here.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => setAction("approve")}
          className="rounded-sm bg-legit px-4 py-2 font-mono text-xs font-medium uppercase tracking-wide text-bg transition hover:bg-legit/90"
        >
          Approve verdict
        </button>
        <button
          onClick={() => setAction("escalate")}
          className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide text-text-dim transition hover:border-text-dim hover:text-text"
        >
          Escalate
        </button>
      </div>
    </div>
  );
}
