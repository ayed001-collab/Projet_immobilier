"""Accès aux données de service (Gold) — Incrément 1.

Lit les sorties de la Data Factory : GeoJSON multi-indicateurs, métadonnées des
couches, historique par zone, rapport DQ / manifeste. Cache mémoire simple.
"""
from __future__ import annotations

import json
from functools import lru_cache

from . import config


class DataUnavailable(Exception):
    """Sortie Gold absente : lancer d'abord la Data Factory (data/factory/run.py)."""


def _read(name: str) -> dict | list:
    path = config.GOLD_DIR / name
    if not path.exists():
        raise DataUnavailable(f"Fichier de service introuvable : {path}.")
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def geojson() -> dict:
    return _read("communes_indicators.geojson")  # type: ignore[return-value]


@lru_cache(maxsize=1)
def layers() -> list:
    return _read("layers.json")  # type: ignore[return-value]


@lru_cache(maxsize=1)
def history() -> dict:
    return _read("history.json")  # type: ignore[return-value]


@lru_cache(maxsize=1)
def manifest() -> dict:
    return _read("manifest.json")  # type: ignore[return-value]


@lru_cache(maxsize=1)
def scores() -> dict:
    return _read("communes_scores.json")  # type: ignore[return-value]


def subscores() -> dict:
    """{zone: {critère: sous-score}} pour le recalcul dynamique (API)."""
    return {z: s.get("subscores", {}) for z, s in scores().items()}


def name_by_zone() -> dict:
    return {
        str(f["properties"]["code_commune"]): f["properties"].get("nom_commune")
        for f in geojson().get("features", [])
    }


def reload_cache() -> None:
    for fn in (geojson, layers, history, manifest, scores):
        fn.cache_clear()


def get_commune(code: str) -> dict | None:
    for feat in geojson().get("features", []):
        if str(feat["properties"].get("code_commune")) == str(code):
            props = dict(feat["properties"])
            props["history"] = history().get(str(code), {})
            return props
    return None


def get_meta() -> dict:
    fc = geojson()
    man = manifest()
    with_data = [f for f in fc["features"] if f["properties"].get("has_data")]
    return {
        "communes_total": len(fc["features"]),
        "communes_with_data": len(with_data),
        "indicators": man.get("indicators", []),
        "departement": man.get("departement"),
        "dvf_millesimes": man.get("dvf_millesimes"),
        "global_dq_score": man.get("dq_report", {}).get("global_dq_score"),
        "run_finished": man.get("run_finished"),
        "avertissement": "Aide à la décision — chiffres sourcés, datés et "
        "assortis d'un niveau de confiance. L'utilisateur reste décisionnaire.",
    }
