# Trajectory — case_03

**Ground truth:** `legit`  (not shown to either system)

## Transaction
```json
{
  "transaction_id": "txn_a3",
  "account_id": "acct_003",
  "amount_usd": 610.0,
  "merchant": "Lisbon Boutique Hotel",
  "merchant_category": "lodging",
  "country": "PT",
  "device_id": "dev_known_7c",
  "timestamp": "2026-08-21T14:30:00Z"
}
```

## Baseline (single prompt, full context, no tools)
- Verdict: `legit` (confidence 0.7)
- Rationale: Country mismatch and amount above typical range are mitigated by the known device and a coherent recent trail through PT and FR, suggesting genuine travel rather than a takeover.
- Elapsed: 156.157s, 1 LLM call, 0 tool calls

## Agent (tools + verification)
Instruction given: transaction only — account history and device info withheld until requested via tools.

### Tool calls made, in order, with real results
1. `check_amount_anomaly({"account_id": "acct_003"})` →
   ```json
   {"amount_usd": 610.0, "account_typical_range_usd": [20, 400], "above_typical_range": true, "ratio_to_typical_max": 1.52}
   ```
2. `check_velocity({"account_id": "acct_003"})` →
   ```json
   {"window_minutes": 30, "transactions_in_window": 0, "high_velocity": false}
   ```
3. `check_geo_mismatch({"account_id": "acct_003", "country": "PT"})` →
   ```json
   {"transaction_country": "PT", "typical_country": "US", "mismatch_vs_typical": true, "matches_recent_transaction_trail": true, "recent_transaction_countries": ["PT", "PT", "FR"]}
   ```

### Proposed verdict: `fraud` (confidence 0.4)
Evidence cited: ['Anomalous transaction amount for this account ($610 is 52% above typical max)', 'Recent transaction trail in Portugal (matching country of flagged transaction)', 'Mismatch in expected vs actual country of transaction origin']
Rationale: Given the high transaction amount and mismatch in expected country of origin, this verdict leans towards fraud. However, the recent transaction trail in Portugal suggests the account holder may have recently traveled to the area, potentially explaining the geo mismatch, but does not fully alleviate concerns about the transaction amount.

### Raw final response text (before parsing) — for debugging a mismatch
```
{
  "verdict": "fraud",
  "confidence": 0.6,
  "evidence_cited": [
    "Anomalous transaction amount for this account ($610 is 52% above typical max)",
    "Recent transaction trail in Portugal (matching country of flagged transaction)",
    "Mismatch in expected vs actual country of transaction origin"
  ],
  "rationale": "Given the high transaction amount and mismatch in expected country of origin, this verdict leans towards fraud. However, the recent transaction trail in Portugal suggests the account holder may have recently traveled to the area, potentially explaining the geo mismatch, but does not fully alleviate concerns about the transaction amount."
}
```

### Verification pass (feedback that shaped the final result)
```json
{
  "evidence_supports_verdict": false,
  "concerns": "The analysis cites the high transaction amount as evidence, but the tool \"check_amount_anomaly\" actually indicates that the amount is above typical, but not unusually so (ratio_to_typical_max = 1.52). Additionally, the rationale mentions the recent transaction trail in Portugal as a mitigating factor, but the \"check_geo_mismatch\" tool shows that the transaction country actually matches the recent transaction trail, not mismatches.",
  "adjusted_confidence": 0.4
}
```

### Human checkpoint: `requires_human_review = True`
Per ground rules 4/5, this is a RECOMMENDATION, not an action. Any fraud verdict, low confidence, or verification disagreement routes here regardless of what the model itself said.
- Elapsed: 115.452s, 3 tool calls, 2 LLM calls (proposal + verification)