"""Data Confidence Score par zone (docs/05 §6).

Agrège la qualité des indicateurs présents pour une zone, pondérée par le poids
de chaque indicateur. Une zone bien documentée sur des mesures directes fraîches
obtient une confiance élevée ; une zone reposant sur des estimations anciennes
ou peu d'observations obtient une confiance réduite — jamais masquée.
"""
from __future__ import annotations

import pandas as pd

from . import config
from .model import FRESHNESS_GRACE_YEARS, INDICATOR_REGISTRY
from .quality import _freshness_score, _volume_score


def _indicator_quality(row) -> float:
    meta = INDICATOR_REGISTRY[row["indicator"]]
    freshness = _freshness_score(row["indicator"], str(row["millesime"]))
    volume = _volume_score(row["indicator"], row.get("obs_count"))
    reliability = config.RELIABILITY_BY_NATURE.get(meta.nature, 0.5)
    return 0.35 * freshness + 0.25 * volume + 0.40 * reliability


def level(score: int) -> str:
    if score >= 75:
        return "Élevée"
    if score >= 60:
        return "Correcte"
    if score >= 45:
        return "Limitée"
    return "Faible"


def per_zone(current: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for zone, grp in current.groupby("zone_id"):
        num = 0.0
        den = 0.0
        for _, r in grp.iterrows():
            w = config.CONFIDENCE_WEIGHTS.get(r["indicator"], 0.05)
            num += w * _indicator_quality(r)
            den += w
        score = int(round(100 * num / den)) if den else 0
        rows.append(
            {
                "zone_id": str(zone),
                "confidence_score": score,
                "confidence_level": level(score),
                "n_indicators": int(len(grp)),
            }
        )
    return pd.DataFrame(rows)
