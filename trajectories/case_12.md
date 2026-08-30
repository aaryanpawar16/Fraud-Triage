# Trajectory — case_12

**Ground truth:** `legit`  (not shown to either system)

## Transaction
```json
{
  "transaction_id": "txn_a12",
  "account_id": "acct_012",
  "amount_usd": 18500.0,
  "merchant": "Sterling Art Auction House",
  "merchant_category": "luxury_goods",
  "country": "US",
  "device_id": "dev_known_priv1",
  "timestamp": "2026-08-28T20:00:00Z"
}
```

## Baseline (single prompt, full context, no tools)
- Verdict: `legit` (confidence 0.9)
- Rationale: The transaction amount is well within the account's established range, and the device is trusted with a high reputation score.
- Elapsed: 15.743s, 1 LLM call, 0 tool calls

## Agent (tools + verification)
Instruction given: transaction only — account history and device info withheld until requested via tools.

### Tool calls made, in order, with real results
1. `check_amount_anomaly({"account_id": "acct_012"})` →
   ```json
   {"amount_usd": 18500.0, "account_typical_range_usd": [500, 25000], "above_typical_range": false, "ratio_to_typical_max": 0.74}
   ```
2. `check_device_reputation({"device_id": "dev_known_priv1"})` →
   ```json
   {"device_id": "dev_known_priv1", "reputation_score": 0.99, "is_new_device": false, "low_reputation": false}
   ```

### Proposed verdict: `legit` (confidence 0.85)
Evidence cited: ["The transaction amount is within the account's typical range.", 'The device has a high reputation score of 0.99.']
Rationale: The transaction amount is within the account's typical range, indicating a legitimate transaction. Additionally, the device has a high reputation score, suggesting it is a trusted device.

### Raw final response text (before parsing) — for debugging a mismatch
```
{
  "verdict": "legit",
  "confidence": 0.9,
  "evidence_cited": ["The transaction amount is within the account's typical range.", "The device has a high reputation score of 0.99."],
  "rationale": "The transaction amount is within the account's typical range, indicating a legitimate transaction. Additionally, the device has a high reputation score, suggesting it is a trusted device."
}
```

### Verification pass (feedback that shaped the final result)
```json
{
  "evidence_supports_verdict": true,
  "concerns": "",
  "adjusted_confidence": 0.85
}
```

### Human checkpoint: `requires_human_review = False`
Per ground rules 4/5, this is a RECOMMENDATION, not an action. Any fraud verdict, low confidence, or verification disagreement routes here regardless of what the model itself said.
- Elapsed: 83.334s, 2 tool calls, 2 LLM calls (proposal + verification)