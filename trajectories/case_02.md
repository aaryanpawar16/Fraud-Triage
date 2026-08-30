# Trajectory — case_02

**Ground truth:** `legit`  (not shown to either system)

## Transaction
```json
{
  "transaction_id": "txn_a2",
  "account_id": "acct_002",
  "amount_usd": 54.3,
  "merchant": "Corner Grocery",
  "merchant_category": "grocery",
  "country": "US",
  "device_id": "dev_known_1a",
  "timestamp": "2026-08-20T18:02:00Z"
}
```

## Baseline (single prompt, full context, no tools)
- Verdict: `legit` (confidence 0.95)
- Rationale: The transaction amount is within the account's typical amount range and the merchant category is consistent with the account's typical behavior.
- Elapsed: 317.88s, 1 LLM call, 0 tool calls

## Agent (tools + verification)
Instruction given: transaction only — account history and device info withheld until requested via tools.

### Tool calls made, in order, with real results
1. `check_amount_anomaly({})` →
   ```json
   {"amount_usd": 54.3, "account_typical_range_usd": [10, 120], "above_typical_range": false, "ratio_to_typical_max": 0.45}
   ```
2. `check_velocity({"transaction_id": "txn_a2", "account_id": "acct_002"})` →
   ```json
   {"window_minutes": 30, "transactions_in_window": 0, "high_velocity": false}
   ```
3. `check_geo_mismatch({"country": "US", "account_id": "acct_002"})` →
   ```json
   {"transaction_country": "US", "typical_country": "US", "mismatch_vs_typical": false, "matches_recent_transaction_trail": true, "recent_transaction_countries": ["US", "US"]}
   ```

### Proposed verdict: `legit` (confidence 0.9)
Evidence cited: ['Amount of $54.3 is within typical range', 'No high velocity', 'No geo mismatch']
Rationale: Given the amount is within typical range, there is no high velocity, and the geo location matches the typical location, this transaction is likely legit. However, there is a slight uncertainty due to the recent travel trail, hence the confidence is 0.8.

### Raw final response text (before parsing) — for debugging a mismatch
```
{
  "verdict": "legit",
  "confidence": 0.8,
  "evidence_cited": ["Amount of $54.3 is within typical range", "No high velocity", "No geo mismatch"],
  "rationale": "Given the amount is within typical range, there is no high velocity, and the geo location matches the typical location, this transaction is likely legit. However, there is a slight uncertainty due to the recent travel trail, hence the confidence is 0.8."
}
```

### Verification pass (feedback that shaped the final result)
```json
{
  "evidence_supports_verdict": true,
  "concerns": "",
  "adjusted_confidence": 0.9
}
```

### Human checkpoint: `requires_human_review = False`
Per ground rules 4/5, this is a RECOMMENDATION, not an action. Any fraud verdict, low confidence, or verification disagreement routes here regardless of what the model itself said.
- Elapsed: 94.974s, 3 tool calls, 2 LLM calls (proposal + verification)