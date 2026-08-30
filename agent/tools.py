"""
Tools the agent calls to gather evidence about a flagged transaction.

Each function computes a DERIVED signal from raw case data rather than
just handing back fields verbatim — this is what makes it a genuine
tool call rather than the same information sitting in the prompt from
the start. In a real deployment these would hit separate systems (a
velocity-tracking store, a device-reputation API, the account ledger);
here they read from the same synthetic case bundle for reproducibility,
which is a real simplification and is documented as one in
docs/README.md rather than left implicit.
"""

from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class ToolResult:
    tool: str
    result: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {"tool": self.tool, "result": self.result}


def check_velocity(case: dict, window_minutes: int = 30) -> ToolResult:
    """How many prior transactions landed within `window_minutes` of now."""
    recents = case["account_history"]["recent_transactions"]
    count = sum(1 for t in recents if t["minutes_ago"] <= window_minutes)
    flagged = count >= 3
    return ToolResult(
        "check_velocity",
        {
            "window_minutes": window_minutes,
            "transactions_in_window": count,
            "high_velocity": flagged,
        },
    )


def check_geo_mismatch(case: dict) -> ToolResult:
    """Compares the transaction's country to the account's typical country
    AND to recent transaction countries, since a mismatch with a
    coherent recent trail (travel) reads very differently than an
    isolated mismatch."""
    txn_country = case["transaction"]["country"]
    typical = case["account_history"]["typical_country"]
    recent_countries = [t["country"] for t in case["account_history"]["recent_transactions"]]

    mismatch_vs_typical = txn_country != typical
    matches_recent_trail = txn_country in recent_countries

    return ToolResult(
        "check_geo_mismatch",
        {
            "transaction_country": txn_country,
            "typical_country": typical,
            "mismatch_vs_typical": mismatch_vs_typical,
            "matches_recent_transaction_trail": matches_recent_trail,
            "recent_transaction_countries": recent_countries,
        },
    )


def check_device_reputation(case: dict) -> ToolResult:
    """Device reputation is checked independently of is_new_device —
    a known device can still have a low reputation score (case_11),
    and a new device isn't automatically bad (case_07)."""
    dev = case["device_info"]
    score = dev["reputation_score"]
    return ToolResult(
        "check_device_reputation",
        {
            "device_id": dev["device_id"],
            "reputation_score": score,
            "is_new_device": dev["is_new_device"],
            "low_reputation": score < 0.3,
        },
    )


def check_amount_anomaly(case: dict) -> ToolResult:
    """Compares against THIS account's own typical range, not a
    population-wide threshold — case_12 exists specifically to check
    this distinction."""
    amount = case["transaction"]["amount_usd"]
    lo, hi = case["account_history"]["typical_amount_range_usd"]
    if amount <= hi:
        ratio = amount / hi if hi > 0 else 0
        above_range = False
    else:
        ratio = amount / hi if hi > 0 else float("inf")
        above_range = True
    return ToolResult(
        "check_amount_anomaly",
        {
            "amount_usd": amount,
            "account_typical_range_usd": [lo, hi],
            "above_typical_range": above_range,
            "ratio_to_typical_max": round(ratio, 2),
        },
    )


def check_prior_flags(case: dict) -> ToolResult:
    return ToolResult(
        "check_prior_flags",
        {"prior_flags_count": case["account_history"]["prior_flags_count"]},
    )


def check_account_tenure(case: dict) -> ToolResult:
    days = case["account_history"]["account_age_days"]
    return ToolResult(
        "check_account_tenure",
        {"account_age_days": days, "is_new_account": days < 90},
    )


TOOLS = {
    "check_velocity": check_velocity,
    "check_geo_mismatch": check_geo_mismatch,
    "check_device_reputation": check_device_reputation,
    "check_amount_anomaly": check_amount_anomaly,
    "check_prior_flags": check_prior_flags,
    "check_account_tenure": check_account_tenure,
}
