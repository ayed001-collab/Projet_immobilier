"""Orchestration du pipeline DVF de bout en bout (Incrément 0).

Chaîne : Collecte (Bronze) → Nettoyage/QC entrée → Agrégation (indicateurs)
→ Rattachement géo → QC sortie (bloquante) → Publication (Gold).

Exécutable en direct (`python run.py`) ou via Dagster (dvf_pipeline.dagster_defs).
"""
from __future__ import annotations

import os

from . import aggregate, clean, config, geo, outputs, quality, sources


def run_pipeline() -> dict:
    # [2] Collecte → Bronze
    run_meta = sources.collect()

    # [3][4] Nettoyage & QC entrée
    raw = clean.load_raw(run_meta["bronze_path"])
    observations = clean.clean(raw)

    # [7] Agrégation → indicateurs par commune
    indicators = aggregate.aggregate(observations, collected_at=run_meta["collected_at"])

    # [8] QC sortie (bloquante)
    dq_report = quality.check_output(indicators)

    # [5] Rattachement géo → GeoJSON de service
    geometries = geo.load_geometries()
    fc = geo.join_to_geojson(indicators, geometries)

    # [9] Publication → Gold
    written = outputs.write_gold(fc, indicators, run_meta, dq_report)

    # Chemin production optionnel : PostGIS
    database_url = os.getenv("DATABASE_URL", "")
    if database_url:
        outputs.load_postgis(indicators, database_url)
        written["postgis"] = "loaded"

    return {
        "run_meta": run_meta,
        "dq_report": dq_report,
        "outputs": written,
        "communes_scored": dq_report["communes_scored"],
    }
