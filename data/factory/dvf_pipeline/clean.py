"""Nettoyage DVF — étape [3]/[4] Contrôle qualité entrée + Transformation.

Transforme les transactions brutes en observations €/m² valides :
- ne garde que les ventes de logements (Appartement/Maison) ;
- exige une surface et une valeur foncière exploitables ;
- calcule le prix au m² ;
- élimine les valeurs aberrantes (bornes dures, puis winsorisation
  intra-commune si le volume le permet).

Le nettoyage est volontairement testable et déterministe (voir tests/).
"""
from __future__ import annotations

import pandas as pd

from . import config

# Colonnes réellement utilisées (geo-dvf en expose bien davantage).
USECOLS = [
    "date_mutation",
    "nature_mutation",
    "valeur_fonciere",
    "code_commune",
    "nom_commune",
    "type_local",
    "surface_reelle_bati",
]


def load_raw(csv_path) -> pd.DataFrame:
    """Charge le CSV brut en ne conservant que les colonnes utiles."""
    df = pd.read_csv(csv_path, dtype={"code_commune": str}, low_memory=False)
    missing = [c for c in USECOLS if c not in df.columns]
    if missing:
        raise ValueError(f"Colonnes DVF manquantes (schéma cassé ?): {missing}")
    return df[USECOLS].copy()


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Renvoie un DataFrame d'observations valides avec une colonne `prix_m2`.

    Chaque ligne = une transaction retenue. Colonnes ajoutées : `prix_m2`.
    """
    df = df.copy()

    # Typage robuste.
    df["valeur_fonciere"] = pd.to_numeric(df["valeur_fonciere"], errors="coerce")
    df["surface_reelle_bati"] = pd.to_numeric(
        df["surface_reelle_bati"], errors="coerce"
    )

    # Filtres métier.
    df = df[df["nature_mutation"].isin(config.VALID_NATURES)]
    df = df[df["type_local"].isin(config.VALID_TYPES)]
    df = df[df["valeur_fonciere"].notna() & (df["valeur_fonciere"] > 0)]
    df = df[df["surface_reelle_bati"].notna()]
    df = df[df["surface_reelle_bati"] >= config.MIN_SURFACE_M2]

    # Prix au m².
    df["prix_m2"] = df["valeur_fonciere"] / df["surface_reelle_bati"]

    # Bornes dures (élimine les erreurs grossières de saisie).
    df = df[
        (df["prix_m2"] >= config.PRICE_M2_HARD_MIN)
        & (df["prix_m2"] <= config.PRICE_M2_HARD_MAX)
    ]

    # Winsorisation intra-commune (seulement si assez d'observations).
    df = _winsorize_by_commune(df)

    return df.reset_index(drop=True)


def _winsorize_by_commune(df: pd.DataFrame) -> pd.DataFrame:
    parts = []
    for _, grp in df.groupby("code_commune", sort=False):
        if len(grp) >= config.WINSOR_MIN_OBS:
            lo = grp["prix_m2"].quantile(config.WINSOR_LOW_PCT)
            hi = grp["prix_m2"].quantile(config.WINSOR_HIGH_PCT)
            grp = grp[(grp["prix_m2"] >= lo) & (grp["prix_m2"] <= hi)]
        parts.append(grp)
    if not parts:
        return df.iloc[0:0]
    return pd.concat(parts)
