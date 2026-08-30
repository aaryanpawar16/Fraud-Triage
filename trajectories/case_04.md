# Trajectory — case_04

**Ground truth:** `fraud`  (not shown to either system)

## Transaction
```json
{
  "transaction_id": "txn_a4",
  "account_id": "acct_004",
  "amount_usd": 1899.0,
  "merchant": "QuickCoin Exchange",
  "merchant_category": "crypto",
  "country": "NG",
  "device_id": "dev_new_3d",
  "timestamp": "2026-08-22T02:10:00Z"
}
```

## Baseline (single prompt, full context, no tools)
- Verdict: `fraud` (confidence 0.95)
- Rationale: New device, brand-new-ish account with a prior flag, high-risk merchant category, country mismatch, amount 12x typical, AND a burst of small transactions minutes earlier — classic card-testing followed by cash-out.
- Elapsed: 134.447s, 1 LLM call, 0 tool calls

## Agent (tools + verification)
Instruction given: transaction only — account history and device info withheld until requested via tools.

### Tool calls made, in order, with real results
1. `check_amount_anomaly({})` →
   ```json
   {"amount_usd": 1899.0, "account_typical_range_usd": [20, 150], "above_typical_range": true, "ratio_to_typical_max": 12.66}
   ```
2. `check_velocity({})` →
   ```json
   {"window_minutes": 30, "transactions_in_window": 3, "high_velocity": true}
   ```
3. `check_geo_mismatch({})` →
   ```json
   {"transaction_country": "NG", "typical_country": "US", "mismatch_vs_typical": true, "matches_recent_transaction_trail": false, "recent_transaction_countries": ["US", "US", "US"]}
   ```

### Proposed verdict: `fraud` (confidence 0.75)
Evidence cited: ["Transaction amount is significantly higher than the account's typical range, indicating potential fraud.", 'The transaction velocity is high, suggesting that the account is being used for illicit activity.', 'There is a geo mismatch, and the recent transaction trail does not match the current transaction country.']
Rationale: The combination of a high transaction amount, high transaction velocity, and geo mismatch all point to potential fraudulent activity. While each signal on its own could be explained, the cumulative effect of these signals suggests that the transaction is likely fraudulent. However, there is a small chance that this is an innocent transaction, which is why the confidence is not 1.0.

### Raw final response text (before parsing) — for debugging a mismatch
```
{
  "verdict": "fraud",
  "confidence": 0.8,
  "evidence_cited": ["Transaction amount is significantly higher than the account's typical range, indicating potential fraud.", "The transaction velocity is high, suggesting that the account is being used for illicit activity.", "There is a geo mismatch, and the recent transaction trail does not match the current transaction country."],
  "rationale": "The combination of a high transaction amount, high transaction velocity, and geo mismatch all point to potential fraudulent activity. While each signal on its own could be explained, the cumulative effect of these signals suggests that the transaction is likely fraudulent. However, there is a small chance that this is an innocent transaction, which is why the confidence is not 1.0."
}
```

### Verification pass (feedback that shaped the final result)
```json
{
  "evidence_supports_verdict": true,
  "concerns": "The verdict states that the transaction velocity is high, but the actual evidence shows that the transactions in the window were 3, which might not necessarily be high. The wording of the evidence might be misleading.",
  "adjusted_confidence": 0.75
}
```

### Human checkpoint: `requires_human_review = True`
Per ground rules 4/5, this is a RECOMMENDATION, not an action. Any fraud verdict, low confidence, or verification disagreement routes here regardless of what the model itself said.
- Elapsed: 109.67s, 3 tool calls, 2 LLM calls (proposal + verification)