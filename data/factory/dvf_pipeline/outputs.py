"""Publication — étape [9] Serving (Gold).

Écrit le GeoJSON de service + un CSV d'indicateurs + un manifeste de run.
Charge optionnellement PostGIS si `DATABASE_URL` est défini.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import config


def write_gold(
    geojson: dict, indicators: pd.DataFrame, run_meta: dict, dq_report: dict,
    gold_dir: Path | None = None,
) -> dict:
    gold_dir = gold_dir or config.GOLD_DIR
    gold_dir.mkdir(parents=True, exist_ok=True)

    geojson_path = gold_dir / "communes_prix_m2.geojson"
    geojson_path.write_text(
        json.dumps(geojson, ensure_ascii=False), encoding="utf-8"
    )

    csv_path = gold_dir / "communes_prix_m2.csv"
    indicators.to_csv(csv_path, index=False)

    manifest = {
        **run_meta,
        "dq_report": dq_report,
        "gold_geojson": str(geojson_path),
        "gold_csv": str(csv_path),
    }
    manifest_path = gold_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return {
        "geojson": str(geojson_path),
        "csv": str(csv_path),
        "manifest": str(manifest_path),
    }


def load_postgis(indicators: pd.DataFrame, database_url: str) -> None:
    """Charge les indicateurs dans PostGIS (chemin production, optionnel).

    Import paresseux : sqlalchemy/psycopg ne sont requis que si utilisé.
    """
    from sqlalchemy import create_engine  # noqa: PLC0415

    engine = create_engine(database_url)
    indicators.to_sql("indicator_commune_prix", engine, if_exists="replace", index=False)
