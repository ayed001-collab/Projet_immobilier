"""Étape de scoring (batch) — normalisation + Home/Investment par défaut.

La normalisation dépend de la distribution de toutes les zones ⇒ elle est
calculée ici (batch). Les sous-scores sont publiés pour permettre la pondération
dynamique côté API (recalcul instantané au changement de pondération).
"""
from __future__ import annotations

import pandas as pd

from scoring import DEFAULT_WEIGHTS, PROFILES, compute_subscores, score_zone


def indicators_by_zone(current: pd.DataFrame) -> dict[str, dict[str, float]]:
    out: dict[str, dict[str, float]] = {}
    for _, r in current.iterrows():
        out.setdefault(str(r["zone_id"]), {})[r["indicator"]] = float(r["value"])
    return out


def compute(current: pd.DataFrame) -> dict[str, dict]:
    """Retourne {zone: {subscores, home:{score,breakdown}, investment:{...}}}."""
    subscores = compute_subscores(indicators_by_zone(current))
    scores: dict[str, dict] = {}
    for zone, subs in subscores.items():
        entry = {"subscores": subs}
        for profile in PROFILES:
            entry[profile] = score_zone(subs, DEFAULT_WEIGHTS[profile])
        scores[zone] = entry
    return scores
