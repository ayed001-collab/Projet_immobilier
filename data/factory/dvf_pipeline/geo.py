"""Rattachement géographique — étape [5] Normalisation & géo.

Joint les indicateurs par commune aux géométries communales pour produire
un GeoJSON de service (Gold), consommable directement par l'API et la carte.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import config


def load_geometries(geojson_path: Path | None = None) -> dict:
    geojson_path = geojson_path or config.COMMUNES_GEOJSON
    return json.loads(Path(geojson_path).read_text(encoding="utf-8"))


def join_to_geojson(indicators: pd.DataFrame, geometries: dict) -> dict:
    """Retourne une FeatureCollection enrichie des indicateurs par commune."""
    by_code = {row["code_commune"]: row for row in indicators.to_dict("records")}

    features = []
    for feat in geometries.get("features", []):
        code = str(feat["properties"].get("code_commune"))
        ind = by_code.get(code)
        props = {
            "code_commune": code,
            "nom_commune": feat["properties"].get("nom_commune"),
        }
        if ind is not None:
            props.update(
                {
                    "prix_m2": ind["prix_m2"],
                    "obs_count": ind["obs_count"],
                    "periode": ind["periode"],
                    "confidence_score": ind["confidence_score"],
                    "confidence_level": ind["confidence_level"],
                    "source": ind["source"],
                    "millesime": ind["millesime"],
                    "derniere_maj": ind["derniere_maj"],
                    "is_estimated": ind["is_estimated"],
                    "has_data": True,
                }
            )
        else:
            props["has_data"] = False  # zone sans donnée exploitable (RG-Z1)
        features.append(
            {"type": "Feature", "properties": props, "geometry": feat["geometry"]}
        )

    return {
        "type": "FeatureCollection",
        "name": "communes_prix_m2",
        "features": features,
    }
