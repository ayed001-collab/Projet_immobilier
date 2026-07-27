"""Moteur de Data Quality — étapes [3]/[8] (docs/09).

Contrôles déclaratifs (« expectations ») par indicateur, sur les dimensions :
complétude, validité (bornes du registre), fraîcheur (âge vs fréquence attendue),
volume (observations). Produit un DQ score par indicateur. Un échec bloquant
empêche la publication.

En production, ces expectations peuvent être portées par Great Expectations ;
l'implémentation reste ici légère et sans dépendance lourde.
"""
from __future__ import annotations

import pandas as pd

from . import config
from .model import FRESHNESS_GRACE_YEARS, INDICATOR_REGISTRY


class DataQualityError(Exception):
    """Contrôle bloquant échoué → pas de publication."""


def _freshness_score(indicator: str, millesime: str) -> float:
    meta = INDICATOR_REGISTRY[indicator]
    grace = FRESHNESS_GRACE_YEARS.get(meta.expected_frequency, 2.0)
    age = config.TODAY.year - int(millesime)
    if age <= grace:
        return 1.0
    # décroissance linéaire au-delà de la tolérance, plancher à 0.2
    return max(0.2, 1.0 - (age - grace) / 5.0)


def _volume_score(indicator: str, obs_count) -> float:
    if pd.isna(obs_count):
        return 1.0  # indicateur non transactionnel : volume non applicable
    obs = int(obs_count)
    if obs >= 30:
        return 1.0
    if obs >= 10:
        return 0.75
    if obs >= 5:
        return 0.5
    return 0.35


def assess(current: pd.DataFrame, zones_total: int) -> dict:
    """Rapport DQ par indicateur + global. Lève si un contrôle bloquant casse."""
    errors: list[str] = []
    per_indicator: dict[str, dict] = {}

    for indicator, grp in current.groupby("indicator"):
        meta = INDICATOR_REGISTRY.get(indicator)
        if meta is None:
            errors.append(f"Indicateur inconnu du registre : {indicator}")
            continue

        # Validité (bornes) — bloquant.
        invalid = grp[(grp["value"] < meta.valid_min) | (grp["value"] > meta.valid_max)]
        if not invalid.empty:
            errors.append(
                f"{indicator}: {len(invalid)} valeur(s) hors bornes "
                f"[{meta.valid_min}, {meta.valid_max}]."
            )
        # Doublons zone — bloquant.
        if grp["zone_id"].duplicated().any():
            errors.append(f"{indicator}: doublon de zone.")

        completeness = round(len(grp) / max(zones_total, 1), 3)
        freshness = round(
            grp["millesime"].map(lambda m: _freshness_score(indicator, m)).mean(), 3
        )
        volume = round(grp["obs_count"].map(lambda o: _volume_score(indicator, o)).mean(), 3)
        reliability = config.RELIABILITY_BY_NATURE.get(meta.nature, 0.5)

        dq = round(
            100 * (0.30 * completeness + 0.25 * freshness + 0.20 * volume + 0.25 * reliability),
            1,
        )
        per_indicator[indicator] = {
            "label": meta.label,
            "nature": meta.nature,
            "is_estimated": meta.is_estimated,
            "completeness": completeness,
            "freshness": freshness,
            "volume": volume,
            "reliability": reliability,
            "dq_score": dq,
            "n_zones": int(len(grp)),
        }

    if errors:
        raise DataQualityError("; ".join(errors))

    global_dq = round(
        sum(v["dq_score"] for v in per_indicator.values()) / max(len(per_indicator), 1), 1
    )
    return {
        "global_dq_score": global_dq,
        "per_indicator": per_indicator,
        "passed": True,
    }
