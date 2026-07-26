"""Orchestration multi-sources (Incrément 1).

Sources → Collecte (Bronze) → Indicateurs → Dérivés → Historisation (Silver,
append-only) → QC sortie (bloquante) → Confiance → Publication (Gold).
"""
from __future__ import annotations

import pandas as pd

from scoring import SCORING_VERSION

from . import config, confidence, derived, geo, history, publish, quality, scoring_step
from .sources import DVFSource, default_sources
from .sources.base import now_iso


def _collect_all() -> pd.DataFrame:
    values = []
    for src in [DVFSource(), *default_sources()]:
        values.extend(v.to_row() for v in src.extract())
    return pd.DataFrame(values)


def run_pipeline() -> dict:
    run_started = now_iso()

    # [2] Collecte multi-sources → indicateurs bruts
    collected = _collect_all()

    # Dérivés (calc) : rendement brut + tendance des prix
    derived_values = [
        v.to_row() for v in derived.compute_rendement(collected)
    ] + [v.to_row() for v in derived.compute_trend(collected)]
    all_values = pd.concat([collected, pd.DataFrame(derived_values)], ignore_index=True)

    # [6] Historisation append-only (Silver) → conserve tous les millésimes
    hist = history.merge(all_values)
    current = history.current(hist)

    # [8] QC sortie (bloquante)
    geometries = geo.load_geometries()
    zones_total = len(geometries.get("features", []))
    dq_report = quality.assess(current, zones_total=zones_total)

    # Confiance par zone
    conf = confidence.per_zone(current)

    # Scoring (batch) : normalisation + Home/Investment par défaut + sous-scores
    scores = scoring_step.compute(current)

    # [9] Publication (Gold)
    fc = publish.build_geojson(current, conf, geometries, scores)
    history_json = publish.build_history(hist)
    run_meta = {
        "run_started": run_started,
        "run_finished": now_iso(),
        "departement": config.DEPARTEMENT,
        "dvf_millesimes": config.DVF_MILLESIMES,
        "today_ref": config.TODAY.isoformat(),
        "scoring_version": SCORING_VERSION,
        "indicators": sorted(current["indicator"].unique().tolist()),
        "zones_total": zones_total,
        "zones_with_data": int(fc_zone_count(fc)),
    }
    written = publish.write_gold(fc, history_json, dq_report, run_meta, scores)

    return {
        "run_meta": run_meta,
        "dq_report": dq_report,
        "outputs": written,
        "indicators": run_meta["indicators"],
        "history_rows": int(len(hist)),
        "scores": scores,
    }


def fc_zone_count(fc: dict) -> int:
    return sum(1 for f in fc["features"] if f["properties"].get("has_data"))
