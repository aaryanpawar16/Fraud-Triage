"use client";

// Real persistence, not a stateless demo: reviewer decisions survive
// a page reload and are visible from the review queue list. This is
// a genuine local browser API in a real deployed Next.js app running
// on the reviewer's own machine — not the sandboxed artifact
// environment where browser storage is unavailable, so it's the
// correct tool here, not a restricted one.

const STORAGE_KEY = "fraud-triage-review-decisions";

export type ReviewDecision = "approve" | "escalate";

export interface ReviewRecord {
  decision: ReviewDecision;
  reviewedAt: string;
}

function readAll(): Record<string, ReviewRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReviewRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, ReviewRecord>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — the
    // review workflow still works for the current session, it just
    // won't survive a reload. Not worth failing the action over.
  }
}

export function getReviewRecord(caseId: string): ReviewRecord | null {
  return readAll()[caseId] ?? null;
}

export function setReviewRecord(caseId: string, decision: ReviewDecision): ReviewRecord {
  const all = readAll();
  const record: ReviewRecord = { decision, reviewedAt: new Date().toISOString() };
  all[caseId] = record;
  writeAll(all);
  return record;
}

export function clearReviewRecord(caseId: string) {
  const all = readAll();
  delete all[caseId];
  writeAll(all);
}

export function getAllReviewRecords(): Record<string, ReviewRecord> {
  return readAll();
}
