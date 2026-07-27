"""Rattachement géographique — étape [5]."""
from __future__ import annotations

import json
from pathlib import Path

from . import config


def load_geometries(geojson_path: Path | None = None) -> dict:
    geojson_path = geojson_path or config.COMMUNES_GEOJSON
    return json.loads(Path(geojson_path).read_text(encoding="utf-8"))


def commune_names(geometries: dict) -> dict[str, str]:
    return {
        str(f["properties"]["code_commune"]): f["properties"].get("nom_commune")
        for f in geometries.get("features", [])
    }
