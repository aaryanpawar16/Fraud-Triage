"use client";

import { useEffect, useState } from "react";
import {
  clearReviewRecord,
  getReviewRecord,
  setReviewRecord,
  type ReviewDecision,
  type ReviewRecord,
} from "@/lib/reviewState";

export default function ReviewActionPanel({ caseId }: { caseId: string }) {
  // undefined = not yet checked (avoids a server/client hydration
  // mismatch, since localStorage doesn't exist during SSR)
  const [record, setRecord] = useState<ReviewRecord | null | undefined>(undefined);

  useEffect(() => {
    setRecord(getReviewRecord(caseId));
  }, [caseId]);

  const act = (decision: ReviewDecision) => {
    setRecord(setReviewRecord(caseId, decision));
  };

  const reset = () => {
    clearReviewRecord(caseId);
    setRecord(null);
  };

  if (record === undefined) {
    return (
      <div className="rounded-md border border-border bg-surface p-5">
        <p className="font-mono text-xs text-text-dim">Checking review status...</p>
      </div>
    );
  }

  if (record) {
    const when = new Date(record.reviewedAt).toLocaleString();
    return (
      <div className="rounded-md border border-legit/40 bg-legit-dim/10 p-5">
        <p className="font-mono text-xs uppercase tracking-widest2 text-legit">
          {record.decision === "approve" ? "Reviewed — verdict approved" : "Escalated for senior review"}
        </p>
        <p className="mt-2 text-sm text-text-dim">
          Recorded {when}, saved in this browser. This persists across
          reloads — check the{" "}
          <a href="/review" className="text-legit hover:underline">
            review queue
          </a>{" "}
          to see it reflected there too.
        </p>
        <button
          onClick={reset}
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
        qualified reviewer decides from here. Your decision is saved in
        this browser and persists across reloads.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => act("approve")}
          className="rounded-sm bg-legit px-4 py-2 font-mono text-xs font-medium uppercase tracking-wide text-bg transition hover:bg-legit/90"
        >
          Approve verdict
        </button>
        <button
          onClick={() => act("escalate")}
          className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide text-text-dim transition hover:border-text-dim hover:text-text"
        >
          Escalate
        </button>
      </div>
    </div>
  );
}
