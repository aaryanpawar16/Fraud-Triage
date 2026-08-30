"""
Cross-case pattern detection. Everything here is pure and deterministic
on purpose — no LLM call, no ambiguity, same reliability standard as
agent/tools.py. This is the layer a per-case triage agent, however
good, structurally cannot replicate: it requires looking across
multiple cases at once, which a single-case agent by definition never
does.
"""

from __future__ import annotations
from dataclasses import dataclass


@dataclass
class DeviceReuseCluster:
    device_id: str
    linked_accounts: list[str]
    case_ids: list[str]

    def as_dict(self) -> dict:
        return {
            "device_id": self.device_id,
            "linked_accounts": self.linked_accounts,
            "case_ids": self.case_ids,
        }


def find_device_reuse(cases: list[dict]) -> list[DeviceReuseCluster]:
    """Groups cases by device_id. Any device_id appearing across more
    than one DISTINCT account_id is flagged — a single physical device
    transacting on unrelated accounts is a classic synthetic-identity
    / fraud-ring signature. Each individual transaction can look
    completely clean; the signal only exists in the comparison."""
    by_device: dict[str, dict[str, list[str]]] = {}

    for case in cases:
        device_id = case["transaction"]["device_id"]
        account_id = case["transaction"]["account_id"]
        entry = by_device.setdefault(device_id, {"accounts": [], "cases": []})
        if account_id not in entry["accounts"]:
            entry["accounts"].append(account_id)
        entry["cases"].append(case["case_id"])

    clusters = []
    for device_id, entry in by_device.items():
        if len(entry["accounts"]) > 1:
            clusters.append(
                DeviceReuseCluster(
                    device_id=device_id,
                    linked_accounts=sorted(entry["accounts"]),
                    case_ids=sorted(entry["cases"]),
                )
            )
    return clusters
