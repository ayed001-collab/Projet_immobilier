"""Publication (Gold) — étape [9].

Produit :
- communes_indicators.geojson : géométries + tous les indicateurs courants +
  confiance par commune (consommé par l'API/carte, avec couches commutables) ;
- history.json : séries multi-millésimes par zone/indicateur (fiche + tendance) ;
- layers.json : métadonnées des indicateurs (libellés, unités, sens) pour le front ;
- dq_report.json / manifest.json : qualité et lineage du run.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import config
from .model import INDICATOR_REGISTRY


def _indicators_by_zone(current: pd.DataFrame) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for _, r in current.iterrows():
        meta = INDICATOR_REGISTRY[r["indicator"]]
        out.setdefault(str(r["zone_id"]), {})[r["indicator"]] = {
            "value": r["value"],
            "unit": r["unit"],
            "millesime": str(r["millesime"]),
            "source": r["source"],
            "nature": r["nature"],
            "is_estimated": bool(r["is_estimated"]),
            "label": meta.label,
            "direction": meta.direction,
        }
    return out


def build_geojson(current, confidence, geometries, scores: dict | None = None) -> dict:
    ind_by_zone = _indicators_by_zone(current)
    conf_by_zone = {r["zone_id"]: r for r in confidence.to_dict("records")}
    scores = scores or {}

    features = []
    for feat in geometries.get("features", []):
        code = str(feat["properties"]["code_commune"])
        indicators = ind_by_zone.get(code, {})
        conf = conf_by_zone.get(code)
        sc = scores.get(code, {})
        props = {
            "code_commune": code,
            "nom_commune": feat["properties"].get("nom_commune"),
            "has_data": bool(indicators),
            "confidence_score": conf["confidence_score"] if conf else None,
            "confidence_level": conf["confidence_level"] if conf else None,
            # Scores par défaut (aplatis) pour la coloration directe de la carte.
            "home_score": sc.get("home", {}).get("score"),
            "investment_score": sc.get("investment", {}).get("score"),
            "scores": sc,  # sous-scores + décomposition (fiche explicable)
            "indicators": indicators,
        }
        features.append(
            {"type": "Feature", "properties": props, "geometry": feat["geometry"]}
        )
    return {"type": "FeatureCollection", "name": "communes_indicators", "features": features}


def build_history(history: pd.DataFrame) -> dict:
    out: dict[str, dict] = {}
    for _, r in history.sort_values("millesime").iterrows():
        out.setdefault(str(r["zone_id"]), {}).setdefault(r["indicator"], []).append(
            {"millesime": str(r["millesime"]), "value": r["value"]}
        )
    return out


def build_layers() -> list[dict]:
    return [
        {
            "code": code, "label": m.label, "unit": m.unit, "category": m.category,
            "nature": m.nature, "direction": m.direction, "is_estimated": m.is_estimated,
            "source": m.source,
        }
        for code, m in INDICATOR_REGISTRY.items()
    ]


def write_gold(
    geojson, history_json, dq_report, run_meta, scores: dict | None = None,
    gold_dir: Path | None = None,
) -> dict:
    gold_dir = gold_dir or config.GOLD_DIR
    gold_dir.mkdir(parents=True, exist_ok=True)

    def _w(name, obj):
        p = gold_dir / name
        p.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
        return str(p)

    written = {
        "geojson": _w("communes_indicators.geojson", geojson),
        "history": _w("history.json", history_json),
        "layers": _w("layers.json", build_layers()),
        "scores": _w("communes_scores.json", scores or {}),
        "dq_report": _w("dq_report.json", dq_report),
    }
    manifest = {**run_meta, "dq_report": dq_report, "outputs": written}
    written["manifest"] = _w("manifest.json", manifest)
    return written
