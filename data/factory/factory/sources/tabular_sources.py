"""Sources tabulaires par commune (INSEE, Loyers, Éducation, Transports).

Chacune lit un CSV (une ligne par commune) et projette une ou plusieurs colonnes
sur des indicateurs du registre. En production, le `extract` de chaque source
appellerait sa vraie API/fichier ; ici on lit les fixtures (config-driven).
"""
from __future__ import annotations

import shutil
from pathlib import Path

import pandas as pd

from .. import config
from ..model import INDICATOR_REGISTRY, IndicatorValue
from .base import Source, now_iso


class TabularCommuneSource(Source):
    """Source générique : CSV commune → indicateurs via un mapping colonne→code."""

    def __init__(self, name: str, fixture: str, mapping: dict[str, str]):
        self.name = name
        self.fixture = fixture  # nom de fichier dans fixtures/
        self.mapping = mapping  # {colonne_csv: code_indicateur}

    def _resolve(self, bronze_dir: Path) -> Path:
        bronze_dir.mkdir(parents=True, exist_ok=True)
        out = bronze_dir / self.fixture
        shutil.copyfile(config.FIXTURES_DIR / self.fixture, out)
        return out

    def extract(self, bronze_dir: Path | None = None) -> list[IndicatorValue]:
        bronze_dir = bronze_dir or config.BRONZE_DIR
        collected_at = now_iso()
        df = pd.read_csv(self._resolve(bronze_dir), dtype={"code_commune": str})
        values: list[IndicatorValue] = []
        for _, row in df.iterrows():
            millesime = str(row["millesime"])
            for col, code in self.mapping.items():
                if col not in df.columns or pd.isna(row[col]):
                    continue
                meta = INDICATOR_REGISTRY[code]
                values.append(
                    IndicatorValue(
                        zone_id=str(row["code_commune"]),
                        nom_commune=row.get("nom_commune"),
                        indicator=code,
                        millesime=millesime,
                        value=float(row[col]),
                        unit=meta.unit,
                        source=meta.source,
                        nature=meta.nature,
                        is_estimated=meta.is_estimated,
                        collected_at=collected_at,
                    )
                )
        return values


def default_sources() -> list[TabularCommuneSource]:
    return [
        TabularCommuneSource(
            "insee", "insee_33.csv",
            {"population": "population", "revenu_median": "revenu_median"},
        ),
        TabularCommuneSource("loyers", "loyers_33.csv", {"loyer_m2": "loyer_m2"}),
        TabularCommuneSource("education", "education_33.csv", {"ips_moyen": "ips_moyen"}),
        TabularCommuneSource(
            "transports", "transports_33.csv",
            {"temps_gare_bordeaux_min": "temps_gare_min"},
        ),
    ]
