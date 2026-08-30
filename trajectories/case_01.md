# Trajectory — case_01

**Ground truth:** `fraud`  (not shown to either system)

## Transaction
```json
{
  "transaction_id": "txn_a1",
  "account_id": "acct_001",
  "amount_usd": 4200.0,
  "merchant": "GlobalTech Electronics",
  "merchant_category": "electronics",
  "country": "VN",
  "device_id": "dev_new_9f2",
  "timestamp": "2026-08-20T03:14:00Z"
}
```

## Baseline (single prompt, full context, no tools)
- Verdict: `fraud` (confidence 0.95)
- Rationale: New low-reputation device and country far from typical, coupled with an amount 14x the account's historical max, are strong signals of an account-takeover attempt.
- Elapsed: 386.971s, 1 LLM call, 0 tool calls

## Agent (tools + verification)
Instruction given: transaction only — account history and device info withheld until requested via tools.

### Tool calls made, in order, with real results
1. `check_velocity({"window_minutes": 30})` →
   ```json
   {"window_minutes": 30, "transactions_in_window": 0, "high_velocity": false}
   ```
2. `check_amount_anomaly({"amount": 4200, "threshold": 5000})` →
   ```json
   {"amount_usd": 4200.0, "account_typical_range_usd": [15, 300], "above_typical_range": true, "ratio_to_typical_max": 14.0}
   ```
3. `check_device_reputation({"device_id": "dev_new_9f2"})` →
   ```json
   {"device_id": "dev_new_9f2", "reputation_score": 0.12, "is_new_device": true, "low_reputation": true}
   ```

### Proposed verdict: `fraud` (confidence 0.65)
Evidence cited: ['transaction amount is above typical range', 'device reputation score is low', 'device is new']
Rationale: The transaction amount is significantly higher than typical for this account, and the device used to make the transaction has a low reputation score and is new. These factors suggest that the transaction may be fraudulent.

### Raw final response text (before parsing) — for debugging a mismatch
```
{
  "verdict": "fraud",
  "confidence": 0.7,
  "evidence_cited": ["transaction amount is above typical range", "device reputation score is low", "device is new"],
  "rationale": "The transaction amount is significantly higher than typical for this account, and the device used to make the transaction has a low reputation score and is new. These factors suggest that the transaction may be fraudulent."
}
```

### Verification pass (feedback that shaped the final result)
```json
{
  "evidence_supports_verdict": true,
  "concerns": "The check_velocity tool result indicates no high velocity, which contradicts the fraud verdict. However, this is a minor concern and may not be sufficient to overturn the verdict.",
  "adjusted_confidence": 0.65
}
```

### Human checkpoint: `requires_human_review = True`
Per ground rules 4/5, this is a RECOMMENDATION, not an action. Any fraud verdict, low confidence, or verification disagreement routes here regardless of what the model itself said.
- Elapsed: 88.244s, 3 tool calls, 2 LLM calls (proposal + verification)