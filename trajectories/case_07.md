# Trajectory — case_07

**Ground truth:** `legit`  (not shown to either system)

## Transaction
```json
{
  "transaction_id": "txn_a7",
  "account_id": "acct_007",
  "amount_usd": 76.0,
  "merchant": "StreamPlus Subscription",
  "merchant_category": "subscription",
  "country": "US",
  "device_id": "dev_new_6f",
  "timestamp": "2026-08-24T11:00:00Z"
}
```

## Baseline (single prompt, full context, no tools)
- Verdict: `legit` (confidence 0.9)
- Rationale: The transaction's exact recurring amount, same merchant, and same country match a routine monthly subscription charge. Although the new device is unusual, its reputation score is still relatively high.
- Elapsed: 271.412s, 1 LLM call, 0 tool calls

## Agent (tools + verification)
Instruction given: transaction only — account history and device info withheld until requested via tools.

### Tool calls made, in order, with real results
1. `check_amount_anomaly({})` →
   ```json
   {"amount_usd": 76.0, "account_typical_range_usd": [10, 100], "above_typical_range": false, "ratio_to_typical_max": 0.76}
   ```
2. `check_account_tenure({})` →
   ```json
   {"account_age_days": 1500, "is_new_account": false}
   ```
3. `check_velocity({})` →
   ```json
   {"window_minutes": 30, "transactions_in_window": 0, "high_velocity": false}
   ```

### Proposed verdict: `legit` (confidence 0.9)
Evidence cited: ["Transaction amount is within the account's typical range", 'Account has a long history of 1500 days', 'No recent high-velocity transactions in the last 30 minutes']
Rationale: Given the transaction amount is within the account's typical range, the account has a long history, and there are no recent high-velocity transactions, we conclude this transaction is likely legitimate.

### Raw final response text (before parsing) — for debugging a mismatch
```
{
  "verdict": "legit",
  "confidence": 0.8,
  "evidence_cited": ["Transaction amount is within the account's typical range", "Account has a long history of 1500 days", "No recent high-velocity transactions in the last 30 minutes"],
  "rationale": "Given the transaction amount is within the account's typical range, the account has a long history, and there are no recent high-velocity transactions, we conclude this transaction is likely legitimate."
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
- Elapsed: 266.966s, 3 tool calls, 2 LLM calls (proposal + verification)