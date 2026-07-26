"""Accès aux données de service (Gold).

Incrément 0 : lecture du GeoJSON produit par la Data Factory, avec cache
mémoire simple. Le chemin PostGIS est prévu pour V+ (non requis ici).
"""
from __future__ import annotations

import json
from functools import lru_cache

from . import config


class DataUnavailable(Exception):
    """Levée quand le GeoJSON de service n'a pas encore été publié."""


@lru_cache(maxsize=1)
def _load() -> dict:
    if not config.GOLD_GEOJSON.exists():
        raise DataUnavailable(
            f"GeoJSON de service introuvable : {config.GOLD_GEOJSON}. "
            "Lancer d'abord la Data Factory (data/factory/run.py)."
        )
    return json.loads(config.GOLD_GEOJSON.read_text(encoding="utf-8"))


def reload_cache() -> None:
    _load.cache_clear()


def get_feature_collection() -> dict:
    return _load()


def get_commune(code: str) -> dict | None:
    for feat in _load().get("features", []):
        if str(feat["properties"].get("code_commune")) == str(code):
            return feat
    return None


def get_meta() -> dict:
    fc = _load()
    with_data = [f for f in fc["features"] if f["properties"].get("has_data")]
    sample = with_data[0]["properties"] if with_data else {}
    return {
        "indicator": "prix_m2",
        "communes_total": len(fc["features"]),
        "communes_with_data": len(with_data),
        "source": sample.get("source"),
        "millesime": sample.get("millesime"),
        "periode": sample.get("periode"),
        "derniere_maj": sample.get("derniere_maj"),
        "nature": "measure",
        "methode": "médiane des prix au m² des ventes de logements (DVF), "
        "après filtrage des valeurs aberrantes",
        "avertissement": "Aide à la décision — chiffres sourcés et datés, "
        "l'utilisateur reste décisionnaire.",
    }
