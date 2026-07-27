"""Supervision des sources (back-office data — Épic 9 / docs/15).

Agrège, par famille de source, l'état d'exploitation : indicateurs produits,
dernière donnée disponible (millésime), dernière collecte, prochaine collecte
estimée (selon la fréquence attendue), DQ et statut. Publié dans admin_sources.json.
"""
from __future__ import annotations

from datetime import date

import pandas as pd

from . import config
from .model import INDICATOR_REGISTRY

# Regroupement des indicateurs par famille de source (producteur).
SOURCE_FAMILIES: dict[str, list[str]] = {
    "DVF (DGFiP/Etalab)": ["prix_m2", "tendance_prix_1an"],
    "INSEE": ["population", "revenu_median"],
    "Carte des loyers": ["loyer_m2"],
    "Rendement (calcul interne)": ["rendement_brut"],
    "Éducation (MEN)": ["ips_moyen"],
    "Transports (OSM/OSRM)": ["temps_gare_min"],
}

# Fréquence attendue → intervalle indicatif avant la prochaine collecte (jours).
FREQUENCY_DAYS = {"semestrial": 182, "annual": 365, "monthly": 30, "continuous": 30}
FREQUENCY_LABEL = {
    "semestrial": "semestrielle", "annual": "annuelle",
    "monthly": "mensuelle", "continuous": "continue",
}


def _next_collection(base: date, frequency: str) -> str:
    from datetime import timedelta
    return (base + timedelta(days=FREQUENCY_DAYS.get(frequency, 365))).isoformat()


def build(current: pd.DataFrame, dq_report: dict, collected_at: str) -> list[dict]:
    per_ind = dq_report.get("per_indicator", {})
    cur_by_ind = {
        code: grp for code, grp in current.groupby("indicator")
    }
    today = config.TODAY

    rows = []
    for family, codes in SOURCE_FAMILIES.items():
        present = [c for c in codes if c in cur_by_ind]
        if not present:
            continue
        freq = INDICATOR_REGISTRY[present[0]].expected_frequency
        dq_scores = [per_ind[c]["dq_score"] for c in present if c in per_ind]
        freshness = [per_ind[c]["freshness"] for c in present if c in per_ind]
        dq = round(sum(dq_scores) / len(dq_scores), 1) if dq_scores else None
        fresh = min(freshness) if freshness else 1.0
        millesimes = sorted({str(cur_by_ind[c]["millesime"].max()) for c in present})

        if dq is None:
            status, status_label = "unknown", "Inconnu"
        elif fresh < 0.7:
            status, status_label = "warning", "Données anciennes"
        elif dq < 70:
            status, status_label = "warning", "Qualité à surveiller"
        else:
            status, status_label = "ok", "OK"

        rows.append({
            "source": family,
            "indicators": present,
            "frequency": freq,
            "frequency_label": FREQUENCY_LABEL.get(freq, freq),
            "last_millesime": millesimes[-1] if millesimes else None,
            "millesimes": millesimes,
            "last_collection": collected_at,
            "next_collection": _next_collection(today, freq),
            "dq_score": dq,
            "freshness": round(fresh, 2),
            "status": status,
            "status_label": status_label,
        })
    return rows
