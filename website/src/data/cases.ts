export type Verdict = "fraud" | "legit";

export interface Transaction {
  transaction_id: string;
  account_id: string;
  amount_usd: number;
  merchant: string;
  merchant_category: string;
  country: string;
  device_id: string;
  timestamp: string;
}

export interface BaselineResult {
  verdict: Verdict;
  confidence: number;
  rationale: string;
}

export interface EvidenceEntry {
  tool: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface Verification {
  evidence_supports_verdict: boolean;
  concerns: string;
  adjusted_confidence: number;
}

export interface AgentResult {
  verdict: Verdict;
  confidence: number;
  rawProposalConfidence: number;
  evidence_cited: string[];
  rationale: string;
  verification: Verification;
  requires_human_review: boolean;
  evidence_log: EvidenceEntry[];
  tool_calls_made: number;
  elapsed_seconds: number;
}

export interface CaseRecord {
  case_id: string;
  ground_truth: Verdict;
  is_hard_case: boolean;
  transaction: Transaction;
  baseline: BaselineResult;
  agent: AgentResult;
}

// Every value below is real, taken directly from results/eval_results.json
// (llama3.1 via Ollama). Nothing here is illustrative or filled in.
export const CASES: CaseRecord[] = [
  {
    case_id: "case_01",
    ground_truth: "fraud",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a1", account_id: "acct_001", amount_usd: 4200, merchant: "GlobalTech Electronics", merchant_category: "electronics", country: "VN", device_id: "dev_new_9f2", timestamp: "2026-08-20T03:14:00Z" },
    baseline: { verdict: "fraud", confidence: 0.95, rationale: "New low-reputation device and country far from typical, coupled with an amount 14x the account's historical max, are strong signals of an account-takeover attempt." },
    agent: {
      verdict: "fraud", confidence: 0.65, rawProposalConfidence: 0.7,
      evidence_cited: ["transaction amount is above typical range", "device reputation score is low", "device is new"],
      rationale: "The transaction amount is significantly higher than typical for this account, and the device used to make the transaction has a low reputation score and is new. These factors suggest that the transaction may be fraudulent.",
      verification: { evidence_supports_verdict: true, concerns: "The check_velocity tool result indicates no high velocity, which contradicts the fraud verdict. However, this is a minor concern and may not be sufficient to overturn the verdict.", adjusted_confidence: 0.65 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_velocity", input: { window_minutes: 30 }, result: { window_minutes: 30, transactions_in_window: 0, high_velocity: false } },
        { tool: "check_amount_anomaly", input: {}, result: { amount_usd: 4200, account_typical_range_usd: [15, 300], above_typical_range: true, ratio_to_typical_max: 14.0 } },
        { tool: "check_device_reputation", input: { device_id: "dev_new_9f2" }, result: { device_id: "dev_new_9f2", reputation_score: 0.12, is_new_device: true, low_reputation: true } },
      ],
      tool_calls_made: 3, elapsed_seconds: 88.244,
    },
  },
  {
    case_id: "case_02",
    ground_truth: "legit",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a2", account_id: "acct_002", amount_usd: 54.3, merchant: "Corner Grocery", merchant_category: "grocery", country: "US", device_id: "dev_known_1a", timestamp: "2026-08-20T18:02:00Z" },
    baseline: { verdict: "legit", confidence: 0.95, rationale: "The transaction amount is within the account's typical amount range and the merchant category is consistent with the account's typical behavior." },
    agent: {
      verdict: "legit", confidence: 0.9, rawProposalConfidence: 0.8,
      evidence_cited: ["Amount of $54.3 is within typical range", "No high velocity", "No geo mismatch"],
      rationale: "Given the amount is within typical range, there is no high velocity, and the geo location matches the typical location, this transaction is likely legit. However, there is a slight uncertainty due to the recent travel trail, hence the confidence is 0.8.",
      verification: { evidence_supports_verdict: true, concerns: "", adjusted_confidence: 0.9 },
      requires_human_review: false,
      evidence_log: [
        { tool: "check_amount_anomaly", input: {}, result: { amount_usd: 54.3, account_typical_range_usd: [10, 120], above_typical_range: false, ratio_to_typical_max: 0.45 } },
        { tool: "check_velocity", input: {}, result: { window_minutes: 30, transactions_in_window: 0, high_velocity: false } },
        { tool: "check_geo_mismatch", input: { country: "US" }, result: { transaction_country: "US", typical_country: "US", mismatch_vs_typical: false, matches_recent_transaction_trail: true, recent_transaction_countries: ["US", "US"] } },
      ],
      tool_calls_made: 3, elapsed_seconds: 94.974,
    },
  },
  {
    case_id: "case_03",
    ground_truth: "legit",
    is_hard_case: true,
    transaction: { transaction_id: "txn_a3", account_id: "acct_003", amount_usd: 610, merchant: "Lisbon Boutique Hotel", merchant_category: "lodging", country: "PT", device_id: "dev_known_7c", timestamp: "2026-08-21T14:30:00Z" },
    baseline: { verdict: "legit", confidence: 0.7, rationale: "Country mismatch and amount above typical range are mitigated by the known device and a coherent recent trail through PT and FR, suggesting genuine travel rather than a takeover." },
    agent: {
      verdict: "fraud", confidence: 0.4, rawProposalConfidence: 0.6,
      evidence_cited: ["Anomalous transaction amount for this account ($610 is 52% above typical max)", "Recent transaction trail in Portugal (matching country of flagged transaction)", "Mismatch in expected vs actual country of transaction origin"],
      rationale: "Given the high transaction amount and mismatch in expected country of origin, this verdict leans towards fraud. However, the recent transaction trail in Portugal suggests the account holder may have recently traveled to the area, potentially explaining the geo mismatch, but does not fully alleviate concerns about the transaction amount.",
      verification: { evidence_supports_verdict: false, concerns: "The analysis cites the high transaction amount as evidence, but the tool \"check_amount_anomaly\" actually indicates that the amount is above typical, but not unusually so (ratio_to_typical_max = 1.52). Additionally, the rationale mentions the recent transaction trail in Portugal as a mitigating factor, but the \"check_geo_mismatch\" tool shows that the transaction country actually matches the recent transaction trail, not mismatches.", adjusted_confidence: 0.4 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_amount_anomaly", input: { account_id: "acct_003" }, result: { amount_usd: 610, account_typical_range_usd: [20, 400], above_typical_range: true, ratio_to_typical_max: 1.52 } },
        { tool: "check_velocity", input: { account_id: "acct_003" }, result: { window_minutes: 30, transactions_in_window: 0, high_velocity: false } },
        { tool: "check_geo_mismatch", input: { account_id: "acct_003", country: "PT" }, result: { transaction_country: "PT", typical_country: "US", mismatch_vs_typical: true, matches_recent_transaction_trail: true, recent_transaction_countries: ["PT", "PT", "FR"] } },
      ],
      tool_calls_made: 3, elapsed_seconds: 115.452,
    },
  },
  {
    case_id: "case_04",
    ground_truth: "fraud",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a4", account_id: "acct_004", amount_usd: 1899, merchant: "QuickCoin Exchange", merchant_category: "crypto", country: "NG", device_id: "dev_new_3d", timestamp: "2026-08-22T02:10:00Z" },
    baseline: { verdict: "fraud", confidence: 0.95, rationale: "New device, brand-new-ish account with a prior flag, high-risk merchant category, country mismatch, amount 12x typical, AND a burst of small transactions minutes earlier — classic card-testing followed by cash-out." },
    agent: {
      verdict: "fraud", confidence: 0.75, rawProposalConfidence: 0.8,
      evidence_cited: ["Transaction amount is significantly higher than the account's typical range, indicating potential fraud.", "The transaction velocity is high, suggesting that the account is being used for illicit activity.", "There is a geo mismatch, and the recent transaction trail does not match the current transaction country."],
      rationale: "The combination of a high transaction amount, high transaction velocity, and geo mismatch all point to potential fraudulent activity. While each signal on its own could be explained, the cumulative effect of these signals suggests that the transaction is likely fraudulent. However, there is a small chance that this is an innocent transaction, which is why the confidence is not 1.0.",
      verification: { evidence_supports_verdict: true, concerns: "The verdict states that the transaction velocity is high, but the actual evidence shows that the transactions in the window were 3, which might not necessarily be high. The wording of the evidence might be misleading.", adjusted_confidence: 0.75 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_amount_anomaly", input: {}, result: { amount_usd: 1899, account_typical_range_usd: [20, 150], above_typical_range: true, ratio_to_typical_max: 12.66 } },
        { tool: "check_velocity", input: {}, result: { window_minutes: 30, transactions_in_window: 3, high_velocity: true } },
        { tool: "check_geo_mismatch", input: {}, result: { transaction_country: "NG", typical_country: "US", mismatch_vs_typical: true, matches_recent_transaction_trail: false, recent_transaction_countries: ["US", "US", "US"] } },
      ],
      tool_calls_made: 3, elapsed_seconds: 109.67,
    },
  },
  {
    case_id: "case_05",
    ground_truth: "legit",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a5", account_id: "acct_005", amount_usd: 340, merchant: "Northwind Dept Store", merchant_category: "retail", country: "US", device_id: "dev_known_2b", timestamp: "2026-11-27T09:00:00Z" },
    baseline: { verdict: "legit", confidence: 0.9, rationale: "Amount is above the historical range, but the two prior days show a clear step-up trend on the same trusted device, indicating a potential seasonal pattern rather than anomalous behavior." },
    agent: {
      verdict: "fraud", confidence: 0.6, rawProposalConfidence: 0.7,
      evidence_cited: ["The account is 900 days old, which is unlikely to be a new account, and is thus less likely to be fraud.", "The transaction amount is significantly above the typical range for this account, indicating potential fraud.", "There is no recent activity on the account, which could be indicative of an attempted large transaction before the account is shut down or the card is cancelled."],
      rationale: "Given the account's age, the large transaction amount, and the lack of recent activity, it is likely that this transaction is fraudulent. The account's age makes it less likely to be a new account, and the large transaction amount suggests that the account may be being used for fraudulent activity. The lack of recent activity on the account could be indicative of an attempt to use the account for a large transaction before the account is shut down or the card is cancelled.",
      verification: { evidence_supports_verdict: true, concerns: "The verdict incorrectly states that the account is unlikely to be a new account, as the 'check_account_tenure' tool indicates the account is 900 days old, which is likely not new.", adjusted_confidence: 0.6 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_account_tenure", input: {}, result: { account_age_days: 900, is_new_account: false } },
        { tool: "check_amount_anomaly", input: { amount_usd: 340 }, result: { amount_usd: 340, account_typical_range_usd: [15, 150], above_typical_range: true, ratio_to_typical_max: 2.27 } },
        { tool: "check_velocity", input: { amount_usd: 340 }, result: { window_minutes: 30, transactions_in_window: 0, high_velocity: false } },
      ],
      tool_calls_made: 3, elapsed_seconds: 320.99,
    },
  },
  {
    case_id: "case_06",
    ground_truth: "fraud",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a6", account_id: "acct_006", amount_usd: 1.0, merchant: "Random Digital Goods LLC", merchant_category: "digital_goods", country: "US", device_id: "dev_new_5e", timestamp: "2026-08-23T04:01:00Z" },
    baseline: { verdict: "fraud", confidence: 0.9, rationale: "Five consecutive $1.00 charges to the same country in the last few minutes on a brand-new device with low reputation score and a merchant that doesn't fit the account's typical merchant category, indicates a card-testing signature." },
    agent: {
      verdict: "legit", confidence: 0.0, rawProposalConfidence: 0.8,
      evidence_cited: ["Device has low reputation, but is not new and has a low reputation score.", "Amount is within typical range for this account.", "Geo location matches typical country and recent transaction trail."],
      rationale: "While the device has a low reputation score, it is not new and has a low reputation score. The transaction amount is within the typical range for this account. The geo location matches the typical country and recent transaction trail, indicating that the transaction is likely legitimate.",
      verification: { evidence_supports_verdict: false, concerns: "The device has a low reputation score and is marked as having low reputation, but the verdict states it's 'legit'. This discrepancy in the verdict and evidence needs to be addressed.", adjusted_confidence: 0.0 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_device_reputation", input: {}, result: { device_id: "dev_new_5e", reputation_score: 0.2, is_new_device: true, low_reputation: true } },
        { tool: "check_amount_anomaly", input: { amount_usd: 1 }, result: { amount_usd: 1.0, account_typical_range_usd: [10, 200], above_typical_range: false, ratio_to_typical_max: 0.01 } },
        { tool: "check_geo_mismatch", input: { country: "US" }, result: { transaction_country: "US", typical_country: "US", mismatch_vs_typical: false, matches_recent_transaction_trail: true, recent_transaction_countries: ["US", "US", "US", "US", "US"] } },
      ],
      tool_calls_made: 3, elapsed_seconds: 160.569,
    },
  },
  {
    case_id: "case_07",
    ground_truth: "legit",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a7", account_id: "acct_007", amount_usd: 76, merchant: "StreamPlus Subscription", merchant_category: "subscription", country: "US", device_id: "dev_new_6f", timestamp: "2026-08-24T11:00:00Z" },
    baseline: { verdict: "legit", confidence: 0.9, rationale: "The transaction's exact recurring amount, same merchant, and same country match a routine monthly subscription charge. Although the new device is unusual, its reputation score is still relatively high." },
    agent: {
      verdict: "legit", confidence: 0.9, rawProposalConfidence: 0.8,
      evidence_cited: ["Transaction amount is within the account's typical range", "Account has a long history of 1500 days", "No recent high-velocity transactions in the last 30 minutes"],
      rationale: "Given the transaction amount is within the account's typical range, the account has a long history, and there are no recent high-velocity transactions, we conclude this transaction is likely legitimate.",
      verification: { evidence_supports_verdict: true, concerns: "", adjusted_confidence: 0.9 },
      requires_human_review: false,
      evidence_log: [
        { tool: "check_amount_anomaly", input: {}, result: { amount_usd: 76, account_typical_range_usd: [10, 100], above_typical_range: false, ratio_to_typical_max: 0.76 } },
        { tool: "check_account_tenure", input: {}, result: { account_age_days: 1500, is_new_account: false } },
        { tool: "check_velocity", input: {}, result: { window_minutes: 30, transactions_in_window: 0, high_velocity: false } },
      ],
      tool_calls_made: 3, elapsed_seconds: 266.966,
    },
  },
  {
    case_id: "case_08",
    ground_truth: "fraud",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a8", account_id: "acct_008", amount_usd: 2650, merchant: "LuxWatch Direct", merchant_category: "luxury_goods", country: "AE", device_id: "dev_new_8a", timestamp: "2026-08-25T22:47:00Z" },
    baseline: { verdict: "fraud", confidence: 0.95, rationale: "High-value luxury transaction (12x typical amount), country mismatch (AE vs typical GB), and a low-reputation device all contributed to the fraud determination." },
    agent: {
      verdict: "fraud", confidence: 0.9, rawProposalConfidence: 0.8,
      evidence_cited: ["The transaction amount is significantly above the account's typical spending range", "The transaction was made from the user's country, but they typically make purchases in a different country", "The device used for the transaction is new and has a low reputation score"],
      rationale: "The combination of a large transaction amount, geo mismatch, and low-reputation device all point towards a fraudulent transaction. While each signal on its own may not be conclusive, together they suggest a high likelihood of fraud.",
      verification: { evidence_supports_verdict: true, concerns: "", adjusted_confidence: 0.9 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_amount_anomaly", input: { account_id: "acct_008" }, result: { amount_usd: 2650, account_typical_range_usd: [30, 220], above_typical_range: true, ratio_to_typical_max: 12.05 } },
        { tool: "check_geo_mismatch", input: { account_id: "acct_008" }, result: { transaction_country: "AE", typical_country: "GB", mismatch_vs_typical: true, matches_recent_transaction_trail: false, recent_transaction_countries: ["GB"] } },
        { tool: "check_device_reputation", input: { device_id: "dev_new_8a" }, result: { device_id: "dev_new_8a", reputation_score: 0.05, is_new_device: true, low_reputation: true } },
      ],
      tool_calls_made: 3, elapsed_seconds: 325.836,
    },
  },
  {
    case_id: "case_09",
    ground_truth: "legit",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a9", account_id: "acct_009", amount_usd: 118, merchant: "CityPower Utility Co", merchant_category: "utilities", country: "US", device_id: "dev_known_4c", timestamp: "2026-08-26T08:00:00Z" },
    baseline: { verdict: "legit", confidence: 0.95, rationale: "The transaction amount falls within the typical amount range for this account, and the device reputation score is high. This suggests a legitimate payment for a recurring utility bill." },
    agent: {
      verdict: "legit", confidence: 0.95, rawProposalConfidence: 0.85,
      evidence_cited: ["Amount of $118.00 is within the account's typical range.", "No high-velocity transactions in the past 30 minutes.", "Geo location matches the typical location and recent transaction trail."],
      rationale: "The amount is within the account's typical range, and there are no high-velocity transactions in the past 30 minutes. Additionally, the geo location matches the typical location and recent transaction trail.",
      verification: { evidence_supports_verdict: true, concerns: "", adjusted_confidence: 0.95 },
      requires_human_review: false,
      evidence_log: [
        { tool: "check_amount_anomaly", input: {}, result: { amount_usd: 118, account_typical_range_usd: [90, 140], above_typical_range: false, ratio_to_typical_max: 0.84 } },
        { tool: "check_velocity", input: {}, result: { window_minutes: 30, transactions_in_window: 0, high_velocity: false } },
        { tool: "check_geo_mismatch", input: {}, result: { transaction_country: "US", typical_country: "US", mismatch_vs_typical: false, matches_recent_transaction_trail: true, recent_transaction_countries: ["US", "US"] } },
        { tool: "check_device_reputation", input: {}, result: { device_id: "dev_known_4c", reputation_score: 0.97, is_new_device: false, low_reputation: false } },
      ],
      tool_calls_made: 4, elapsed_seconds: 333.78,
    },
  },
  {
    case_id: "case_10",
    ground_truth: "legit",
    is_hard_case: true,
    transaction: { transaction_id: "txn_a10", account_id: "acct_010", amount_usd: 95, merchant: "Airport Duty Free", merchant_category: "retail", country: "JP", device_id: "dev_known_9d", timestamp: "2026-08-27T06:15:00Z" },
    baseline: { verdict: "legit", confidence: 0.8, rationale: "The transaction is consistent with the account's typical country (US) and amount range, and the device has a high reputation score, indicating a trusted device." },
    agent: {
      verdict: "fraud", confidence: 0.6, rawProposalConfidence: 0.8,
      evidence_cited: ["The account has a high tenure, making the new geo mismatch suspicious.", "The device reputation score is 0.9, but the device itself is known and not new."],
      rationale: "Although the geo mismatch is unusual for this account, the fact that it has a high tenure reduces the likelihood of this being an innocent mistake. The device reputation score is high, but the fact that it is known and not new reduces the likelihood of this being a device-based fraud attempt.",
      verification: { evidence_supports_verdict: false, concerns: "The tool 'check_geo_mismatch' indicates that the geo mismatch is not unusual for this account, as it has been observed in recent transactions (matches_recent_transaction_trail=true). This contradicts the proposed verdict's rationale that the high tenure makes the geo mismatch suspicious.", adjusted_confidence: 0.6 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_account_tenure", input: {}, result: { account_age_days: 1800, is_new_account: false } },
        { tool: "check_geo_mismatch", input: {}, result: { transaction_country: "JP", typical_country: "US", mismatch_vs_typical: true, matches_recent_transaction_trail: true, recent_transaction_countries: ["JP", "JP", "US"] } },
        { tool: "check_device_reputation", input: {}, result: { device_id: "dev_known_9d", reputation_score: 0.9, is_new_device: false, low_reputation: false } },
      ],
      tool_calls_made: 3, elapsed_seconds: 373.658,
    },
  },
  {
    case_id: "case_11",
    ground_truth: "fraud",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a11", account_id: "acct_011", amount_usd: 210, merchant: "MidTown Pharmacy", merchant_category: "pharmacy", country: "US", device_id: "dev_flagged_2x", timestamp: "2026-08-28T13:00:00Z" },
    baseline: { verdict: "fraud", confidence: 0.95, rationale: "The transaction amount of $210.0 is significantly higher than the account's typical amount range, and combined with the device's low reputation score and prior flags on the account, this signals a high likelihood of fraud." },
    agent: {
      verdict: "fraud", confidence: 0.7, rawProposalConfidence: 0.75,
      evidence_cited: ["Anomalous amount on a low-reputation device", "Device is not new, but still has a low reputation score"],
      rationale: "The transaction amount is significantly higher than the account's typical range, and this is occurring on a device with a low reputation score, indicating potential fraud.",
      verification: { evidence_supports_verdict: true, concerns: "The evidence_cited string does not accurately reflect the evidence. Also, the verdict is based solely on two pieces of evidence, but the confidence level is still 0.75, which might be too high.", adjusted_confidence: 0.7 },
      requires_human_review: true,
      evidence_log: [
        { tool: "check_account_tenure", input: {}, result: { account_age_days: 500, is_new_account: false } },
        { tool: "check_amount_anomaly", input: {}, result: { amount_usd: 210, account_typical_range_usd: [10, 80], above_typical_range: true, ratio_to_typical_max: 2.62 } },
        { tool: "check_device_reputation", input: { device_id: "dev_flagged_2x" }, result: { device_id: "dev_flagged_2x", reputation_score: 0.03, is_new_device: false, low_reputation: true } },
      ],
      tool_calls_made: 3, elapsed_seconds: 220.007,
    },
  },
  {
    case_id: "case_12",
    ground_truth: "legit",
    is_hard_case: false,
    transaction: { transaction_id: "txn_a12", account_id: "acct_012", amount_usd: 18500, merchant: "Sterling Art Auction House", merchant_category: "luxury_goods", country: "US", device_id: "dev_known_priv1", timestamp: "2026-08-28T20:00:00Z" },
    baseline: { verdict: "legit", confidence: 0.9, rationale: "The transaction amount is well within the account's established range, and the device is trusted with a high reputation score." },
    agent: {
      verdict: "legit", confidence: 0.85, rawProposalConfidence: 0.9,
      evidence_cited: ["The transaction amount is within the account's typical range.", "The device has a high reputation score of 0.99."],
      rationale: "The transaction amount is within the account's typical range, indicating a legitimate transaction. Additionally, the device has a high reputation score, suggesting it is a trusted device.",
      verification: { evidence_supports_verdict: true, concerns: "", adjusted_confidence: 0.85 },
      requires_human_review: false,
      evidence_log: [
        { tool: "check_amount_anomaly", input: { account_id: "acct_012" }, result: { amount_usd: 18500, account_typical_range_usd: [500, 25000], above_typical_range: false, ratio_to_typical_max: 0.74 } },
        { tool: "check_device_reputation", input: { device_id: "dev_known_priv1" }, result: { device_id: "dev_known_priv1", reputation_score: 0.99, is_new_device: false, low_reputation: false } },
      ],
      tool_calls_made: 2, elapsed_seconds: 83.334,
    },
  },
];

export const AGGREGATE = {
  baseline: { accuracy: 1.0, precision: 1.0, recall: 1.0, wallTimePerCase: 136.4 },
  agent: { accuracy: 0.667, precision: 0.571, recall: 0.8, wallTimePerCase: 207.8 },
  safety: {
    correct_no_review: 4,
    correct_with_review: 4,
    wrong_with_review: 4,
    wrong_no_review: 0,
  },
};

export function isCorrect(c: CaseRecord): boolean {
  return c.agent.verdict === c.ground_truth;
}
