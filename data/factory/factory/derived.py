"""Indicateurs dérivés (calc) — rendement brut & tendance des prix.

Calculés à partir des indicateurs collectés. Marqués `nature='calc'` : ils
héritent de l'incertitude de leurs entrées (docs/00 §2).
"""
from __future__ import annotations

import pandas as pd

from .model import INDICATOR_REGISTRY, IndicatorValue
from .sources.base import now_iso


def _latest(df: pd.DataFrame, indicator: str) -> pd.DataFrame:
    sub = df[df["indicator"] == indicator]
    if sub.empty:
        return sub
    idx = sub.groupby("zone_id")["millesime"].idxmax()
    return sub.loc[idx]


def compute_rendement(df: pd.DataFrame) -> list[IndicatorValue]:
    prix = _latest(df, "prix_m2").set_index("zone_id")
    loyer = _latest(df, "loyer_m2").set_index("zone_id")
    meta = INDICATOR_REGISTRY["rendement_brut"]
    collected_at = now_iso()
    out: list[IndicatorValue] = []
    for zone in prix.index.intersection(loyer.index):
        p = float(prix.loc[zone, "value"])
        loy = float(loyer.loc[zone, "value"])
        if p <= 0:
            continue
        rendement = round(loy * 12 / p * 100, 2)
        out.append(
            IndicatorValue(
                zone_id=str(zone), nom_commune=prix.loc[zone, "nom_commune"],
                indicator="rendement_brut", millesime=str(loyer.loc[zone, "millesime"]),
                value=rendement, unit=meta.unit, source=meta.source,
                nature=meta.nature, is_estimated=True,  # dépend d'un loyer estimé
                collected_at=collected_at,
            )
        )
    return out


def compute_trend(df: pd.DataFrame) -> list[IndicatorValue]:
    prix = df[df["indicator"] == "prix_m2"]
    meta = INDICATOR_REGISTRY["tendance_prix_1an"]
    collected_at = now_iso()
    out: list[IndicatorValue] = []
    for zone, grp in prix.groupby("zone_id"):
        grp = grp.sort_values("millesime")
        if len(grp) < 2:
            continue
        prev, last = grp.iloc[-2], grp.iloc[-1]
        if int(last["millesime"]) - int(prev["millesime"]) != 1:
            continue
        if float(prev["value"]) <= 0:
            continue
        pct = round((float(last["value"]) - float(prev["value"])) / float(prev["value"]) * 100, 1)
        out.append(
            IndicatorValue(
                zone_id=str(zone), nom_commune=last["nom_commune"],
                indicator="tendance_prix_1an", millesime=str(last["millesime"]),
                value=pct, unit=meta.unit, source=meta.source, nature=meta.nature,
                is_estimated=False, collected_at=collected_at,
            )
        )
    return out
