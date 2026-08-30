# Trajectory — case_09

**Ground truth:** `legit`  (not shown to either system)

## Transaction
```json
{
  "transaction_id": "txn_a9",
  "account_id": "acct_009",
  "amount_usd": 118.0,
  "merchant": "CityPower Utility Co",
  "merchant_category": "utilities",
  "country": "US",
  "device_id": "dev_known_4c",
  "timestamp": "2026-08-26T08:00:00Z"
}
```

## Baseline (single prompt, full context, no tools)
- Verdict: `legit` (confidence 0.95)
- Rationale: The transaction amount falls within the typical amount range for this account, and the device reputation score is high. This suggests a legitimate payment for a recurring utility bill.
- Elapsed: 21.619s, 1 LLM call, 0 tool calls

## Agent (tools + verification)
Instruction given: transaction only — account history and device info withheld until requested via tools.

### Tool calls made, in order, with real results
1. `check_amount_anomaly({"transaction": "{'transaction_id': 'txn_a9', 'account_id': 'acct_009', 'amount_usd': 118.0}"})` →
   ```json
   {"amount_usd": 118.0, "account_typical_range_usd": [90, 140], "above_typical_range": false, "ratio_to_typical_max": 0.84}
   ```
2. `check_velocity({"transaction": "{'transaction_id': 'txn_a9', 'account_id': 'acct_009', 'amount_usd': 118.0}"})` →
   ```json
   {"window_minutes": 30, "transactions_in_window": 0, "high_velocity": false}
   ```
3. `check_geo_mismatch({"transaction": "{'transaction_id': 'txn_a9', 'account_id': 'acct_009', 'amount_usd': 118.0, 'merchant': 'CityPower Utility Co', 'merchant_category': 'utilities', 'country': 'US'}"})` →
   ```json
   {"transaction_country": "US", "typical_country": "US", "mismatch_vs_typical": false, "matches_recent_transaction_trail": true, "recent_transaction_countries": ["US", "US"]}
   ```
4. `check_device_reputation({"transaction": "{'transaction_id': 'txn_a9', 'account_id': 'acct_009', 'amount_usd': 118.0, 'device_id': 'dev_known_4c'}"})` →
   ```json
   {"device_id": "dev_known_4c", "reputation_score": 0.97, "is_new_device": false, "low_reputation": false}
   ```

### Proposed verdict: `legit` (confidence 0.95)
Evidence cited: ["Amount of $118.00 is within the account's typical range.", 'No high-velocity transactions in the past 30 minutes.', 'Geo location matches the typical location and recent transaction trail.']
Rationale: The amount is within the account's typical range, and there are no high-velocity transactions in the past 30 minutes. Additionally, the geo location matches the typical location and recent transaction trail.

### Raw final response text (before parsing) — for debugging a mismatch
```
{
  "verdict": "legit",
  "confidence": 0.85,
  "evidence_cited": ["Amount of $118.00 is within the account's typical range.",
                     "No high-velocity transactions in the past 30 minutes.",
                     "Geo location matches the typical location and recent transaction trail."],
  "rationale": "The amount is within the account's typical range, and there are no high-velocity transactions in the past 30 minutes. Additionally, the geo location matches the typical location and recent transaction trail."
}
```

### Verification pass (feedback that shaped the final result)
```json
{
  "evidence_supports_verdict": true,
  "concerns": "",
  "adjusted_confidence": 0.95
}
```

### Human checkpoint: `requires_human_review = False`
Per ground rules 4/5, this is a RECOMMENDATION, not an action. Any fraud verdict, low confidence, or verification disagreement routes here regardless of what the model itself said.
- Elapsed: 333.78s, 4 tool calls, 2 LLM calls (proposal + verification)