"""Agrégation par commune — étape [7] Calcul des indicateurs (Silver → Gold).

Produit, par commune, l'indicateur `prix_m2` (médiane robuste), le nombre
d'observations, la période couverte et un niveau de confiance simplifié qui
préfigure le Data Confidence Score (docs/05 §6).
"""
from __future__ import annotations

import pandas as pd

from . import config


def confidence_from_obs(obs_count: int) -> tuple[int, str]:
    """Confiance simplifiée fondée sur le volume d'observations (Incrément 0).

    En V+, elle intègrera fraîcheur, complétude et fiabilité source (docs/05).
    """
    if obs_count >= config.CONFIDENCE_MIN_OBS_HIGH:
        return 85, "Élevée"
    if obs_count >= config.CONFIDENCE_MIN_OBS_OK:
        return 65, "Correcte"
    return 40, "Limitée"


def aggregate(df: pd.DataFrame, collected_at: str) -> pd.DataFrame:
    """Agrège les observations nettoyées en une ligne par commune."""
    if df.empty:
        return pd.DataFrame(
            columns=[
                "code_commune",
                "nom_commune",
                "prix_m2",
                "obs_count",
                "periode",
                "confidence_score",
                "confidence_level",
                "source",
                "millesime",
                "derniere_maj",
                "is_estimated",
            ]
        )

    dates = pd.to_datetime(df["date_mutation"], errors="coerce")
    year_min = int(dates.dt.year.min())
    year_max = int(dates.dt.year.max())
    periode = (
        f"transactions {year_min}" if year_min == year_max
        else f"transactions {year_min}–{year_max}"
    )

    rows = []
    for code, grp in df.groupby("code_commune", sort=True):
        obs = int(len(grp))
        conf_score, conf_level = confidence_from_obs(obs)
        rows.append(
            {
                "code_commune": code,
                "nom_commune": grp["nom_commune"].iloc[0],
                "prix_m2": round(float(grp["prix_m2"].median()), 0),
                "obs_count": obs,
                "periode": periode,
                "confidence_score": conf_score,
                "confidence_level": conf_level,
                "source": config.SOURCE_NAME,
                "millesime": config.MILLESIME,
                "derniere_maj": collected_at,
                "is_estimated": False,  # DVF = mesure directe
            }
        )
    return pd.DataFrame(rows)
