"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MiniTxn {
  account_id: string;
  device_id: string;
  merchant: string;
  amount_usd: number;
  country: string;
}

const KNOWN_RING: MiniTxn[] = [
  { account_id: "acct_ring_alpha", device_id: "dev_shared_x7", merchant: "QuickMart Convenience", amount_usd: 85, country: "US" },
  { account_id: "acct_ring_beta", device_id: "dev_shared_x7", merchant: "Downtown Pharmacy", amount_usd: 62, country: "US" },
];

const UNRELATED: MiniTxn[] = [
  { account_id: "acct_clean_a", device_id: "dev_clean_1", merchant: "Corner Cafe", amount_usd: 15, country: "US" },
  { account_id: "acct_clean_b", device_id: "dev_clean_2", merchant: "Book Nook", amount_usd: 28, country: "US" },
];

interface Cluster {
  device_id: string;
  linked_accounts: string[];
  case_ids: string[];
}

interface Assessment {
  cluster: Cluster;
  assessment: string;
  confidence: number;
  reasoning: string;
  recommended_action: string;
}

export default function RingCheckClient() {
  const [txns, setTxns] = useState<MiniTxn[]>(UNRELATED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const update = (i: number, key: keyof MiniTxn, value: string | number) =>
    setTxns((t) => t.map((txn, idx) => (idx === i ? { ...txn, [key]: value } : txn)));

  const addTxn = () =>
    setTxns((t) => [...t, { account_id: `acct_${t.length + 1}`, device_id: "", merchant: "", amount_usd: 0, country: "US" }]);

  const removeTxn = (i: number) => setTxns((t) => t.filter((_, idx) => idx !== i));

  const submit = async () => {
    setLoading(true);
    setError(null);
    setClusters(null);
    setAssessments([]);
    try {
      const res = await fetch(`${API_URL}/api/pattern-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: txns }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      setClusters(data.clusters);
      setAssessments(data.assessments);
    } catch (e) {
      setError(
        `Could not reach the API at ${API_URL}. Make sure api_server.py is running. Details: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest2 text-review">
        calls the real pattern detector, live
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-text sm:text-4xl">
        Ring check
      </h1>
      <p className="mt-4 max-w-2xl text-text-dim">
        Submit two or more transactions and see whether any device is
        reused across different accounts — the real deterministic
        detector, run against whatever you type in, not a canned
        example. See{" "}
        <a href="/orchestration" className="text-review hover:underline">
          /orchestration
        </a>{" "}
        for the static proof this capability requires cross-case
        comparison.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => setTxns(KNOWN_RING)}
          className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest2 text-text-dim transition hover:border-review/50 hover:text-text"
        >
          Load: known ring pair
        </button>
        <button
          onClick={() => setTxns(UNRELATED)}
          className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-widest2 text-text-dim transition hover:border-review/50 hover:text-text"
        >
          Load: two unrelated
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {txns.map((t, i) => (
          <div key={i} className="rounded-md border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest2 text-text-dim">
                Transaction {i + 1}
              </p>
              {txns.length > 2 && (
                <button onClick={() => removeTxn(i)} className="font-mono text-xs text-fraud hover:underline">
                  remove
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Account ID">
                <input
                  value={t.account_id}
                  onChange={(e) => update(i, "account_id", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Device ID">
                <input
                  value={t.device_id}
                  onChange={(e) => update(i, "device_id", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Merchant">
                <input
                  value={t.merchant}
                  onChange={(e) => update(i, "merchant", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Amount (USD)">
                <input
                  type="number"
                  value={t.amount_usd}
                  onChange={(e) => update(i, "amount_usd", Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        ))}
        <button onClick={addTxn} className="font-mono text-xs text-review hover:underline">
          + add another transaction
        </button>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="mt-8 rounded-sm bg-review px-6 py-3 font-mono text-sm font-medium uppercase tracking-wide text-bg transition hover:bg-review/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Checking..." : "Check for shared devices"}
      </button>

      {error && (
        <div className="mt-6 rounded-md border border-fraud/30 bg-fraud-dim/10 p-5">
          <p className="font-mono text-xs uppercase tracking-widest2 text-fraud">Error</p>
          <p className="mt-2 text-sm text-text-dim">{error}</p>
        </div>
      )}

      {clusters !== null && (
        <div className="mt-8">
          {clusters.length === 0 ? (
            <div className="rounded-md border border-legit/40 bg-legit-dim/10 p-6">
              <p className="font-mono text-xs uppercase tracking-widest2 text-legit">
                No shared devices found
              </p>
              <p className="mt-2 text-sm text-text-dim">
                Every device_id you submitted belongs to exactly one
                account — no cluster, no coordinator call made.
              </p>
            </div>
          ) : (
            assessments.map((a, i) => (
              <div key={i} className="rounded-md border border-fraud/30 bg-fraud-dim/10 p-6">
                <p className="font-mono text-xs uppercase tracking-widest2 text-fraud">
                  Cluster found: {a.cluster.device_id}
                </p>
                <p className="mt-1 font-mono text-xs text-text-dim">
                  Linked accounts: {a.cluster.linked_accounts.join(", ")}
                </p>
                <div className="mt-4 flex items-center gap-3 font-mono text-sm">
                  <span className="text-text-dim">assessment:</span>
                  <span className="text-fraud">{a.assessment}</span>
                  <span className="text-text-dim">confidence:</span>
                  <span className="text-text">{a.confidence}</span>
                </div>
                <p className="mt-3 text-sm text-text-dim">{a.reasoning}</p>
                <p className="mt-3 text-sm text-text">
                  <span className="text-text-dim">Recommended: </span>
                  {a.recommended_action}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-sm border border-border bg-bg px-3 py-2 font-mono text-sm text-text";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[11px] uppercase tracking-widest2 text-text-dim">
        {label}
      </label>
      {children}
    </div>
  );
}
