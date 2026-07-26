"""Source DVF — prix au m² par commune, sur plusieurs millésimes.

Reprend le nettoyage robuste de l'Incrément 0 (filtrage ventes/logements,
calcul €/m², élimination des aberrants, médiane par commune) et l'étend à
plusieurs millésimes pour permettre l'historisation et le calcul de tendance.
"""
from __future__ import annotations

import gzip
import shutil
import urllib.request
from pathlib import Path

import pandas as pd

from .. import config
from ..model import IndicatorValue
from .base import Source, now_iso

USECOLS = [
    "date_mutation", "nature_mutation", "valeur_fonciere", "code_commune",
    "nom_commune", "type_local", "surface_reelle_bati",
]


def load_raw(csv_path) -> pd.DataFrame:
    df = pd.read_csv(csv_path, dtype={"code_commune": str}, low_memory=False)
    missing = [c for c in USECOLS if c not in df.columns]
    if missing:
        raise ValueError(f"Colonnes DVF manquantes (schéma cassé ?): {missing}")
    return df[USECOLS].copy()


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Transactions valides + colonne `prix_m2` (déterministe, testé)."""
    df = df.copy()
    df["valeur_fonciere"] = pd.to_numeric(df["valeur_fonciere"], errors="coerce")
    df["surface_reelle_bati"] = pd.to_numeric(df["surface_reelle_bati"], errors="coerce")

    df = df[df["nature_mutation"].isin(config.VALID_NATURES)]
    df = df[df["type_local"].isin(config.VALID_TYPES)]
    df = df[df["valeur_fonciere"].notna() & (df["valeur_fonciere"] > 0)]
    df = df[df["surface_reelle_bati"].notna()]
    df = df[df["surface_reelle_bati"] >= config.MIN_SURFACE_M2]

    df["prix_m2"] = df["valeur_fonciere"] / df["surface_reelle_bati"]
    df = df[
        (df["prix_m2"] >= config.PRICE_M2_HARD_MIN)
        & (df["prix_m2"] <= config.PRICE_M2_HARD_MAX)
    ]
    return _winsorize_by_commune(df).reset_index(drop=True)


def _winsorize_by_commune(df: pd.DataFrame) -> pd.DataFrame:
    parts = []
    for _, grp in df.groupby("code_commune", sort=False):
        if len(grp) >= config.WINSOR_MIN_OBS:
            lo = grp["prix_m2"].quantile(config.WINSOR_LOW_PCT)
            hi = grp["prix_m2"].quantile(config.WINSOR_HIGH_PCT)
            grp = grp[(grp["prix_m2"] >= lo) & (grp["prix_m2"] <= hi)]
        parts.append(grp)
    return pd.concat(parts) if parts else df.iloc[0:0]


class DVFSource(Source):
    name = "dvf"

    def __init__(self, millesimes: list[str] | None = None):
        self.millesimes = millesimes or config.DVF_MILLESIMES

    def _resolve(self, millesime: str, bronze_dir: Path) -> Path:
        """Chemin du CSV brut : téléchargement geo-dvf si configuré, sinon fixture."""
        bronze_dir.mkdir(parents=True, exist_ok=True)
        out = bronze_dir / f"dvf_{config.DEPARTEMENT}_{millesime}.csv"
        if config.DVF_SOURCE_URL_TEMPLATE:
            url = config.DVF_SOURCE_URL_TEMPLATE.format(
                millesime=millesime, dep=config.DEPARTEMENT
            )
            gz = bronze_dir / f"dvf_{millesime}.csv.gz"
            urllib.request.urlretrieve(url, gz)  # noqa: S310
            with gzip.open(gz, "rb") as fin, out.open("wb") as fout:
                shutil.copyfileobj(fin, fout)
            gz.unlink(missing_ok=True)
        else:
            fixture = config.FIXTURES_DIR / f"dvf_{millesime}_{config.DEPARTEMENT}.csv"
            shutil.copyfile(fixture, out)
        return out

    def extract(self, bronze_dir: Path | None = None) -> list[IndicatorValue]:
        bronze_dir = bronze_dir or config.BRONZE_DIR
        collected_at = now_iso()
        values: list[IndicatorValue] = []
        for millesime in self.millesimes:
            raw = load_raw(self._resolve(millesime, bronze_dir))
            obs = clean(raw)
            for code, grp in obs.groupby("code_commune", sort=True):
                values.append(
                    IndicatorValue(
                        zone_id=str(code),
                        nom_commune=grp["nom_commune"].iloc[0],
                        indicator="prix_m2",
                        millesime=millesime,
                        value=round(float(grp["prix_m2"].median()), 0),
                        unit="€/m²",
                        source="DVF — Demandes de Valeurs Foncières",
                        nature="measure",
                        is_estimated=False,
                        collected_at=collected_at,
                        obs_count=int(len(grp)),
                    )
                )
        return values
