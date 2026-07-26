"""Définitions Dagster (optionnel) — enveloppe fine autour des fonctions pures.

Permet d'exécuter la même chaîne via l'orchestrateur (docs/08 : un asset par
étape, lineage natif). Import paresseux : Dagster n'est pas requis pour le
runner en ligne de commande (`run.py`).
"""
from __future__ import annotations

try:
    from dagster import asset, Definitions  # type: ignore
except ImportError:  # pragma: no cover - Dagster optionnel
    asset = None
    Definitions = None

if asset is not None:
    from . import aggregate, clean, geo, outputs, quality, sources

    @asset
    def dvf_bronze() -> dict:
        return sources.collect()

    @asset
    def dvf_observations(dvf_bronze: dict):
        return clean.clean(clean.load_raw(dvf_bronze["bronze_path"]))

    @asset
    def dvf_indicators(dvf_bronze: dict, dvf_observations):
        return aggregate.aggregate(
            dvf_observations, collected_at=dvf_bronze["collected_at"]
        )

    @asset
    def dvf_gold(dvf_bronze: dict, dvf_indicators) -> dict:
        dq = quality.check_output(dvf_indicators)
        fc = geo.join_to_geojson(dvf_indicators, geo.load_geometries())
        return outputs.write_gold(fc, dvf_indicators, dvf_bronze, dq)

    defs = Definitions(assets=[dvf_bronze, dvf_observations, dvf_indicators, dvf_gold])
