"""Moteur de scoring : sous-scores → Home / Investment Score + décomposition.

- `compute_subscores` : à partir des valeurs d'indicateurs par zone, calcule le
  sous-score normalisé (0–100) de chaque critère (dépend de la distribution ⇒
  étape « batch » côté Data Factory).
- `score_zone` / `rank` : pondèrent les sous-scores par le profil utilisateur
  (cheap ⇒ à la demande côté API, recalcul dynamique). Les pondérations sont
  renormalisées sur les critères disponibles (RG-S4) et chaque score expose sa
  décomposition (RG-S2), base de l'explicabilité.
"""
from __future__ import annotations

from .config import CRITERIA, DEFAULT_WEIGHTS, SCORING_VERSION
from .normalize import percentile_ranks


def compute_subscores(
    indicators_by_zone: dict[str, dict[str, float]]
) -> dict[str, dict[str, float]]:
    """Retourne {zone: {critère: sous-score 0–100}}."""
    subscores: dict[str, dict[str, float]] = {z: {} for z in indicators_by_zone}
    for code, crit in CRITERIA.items():
        values = {
            z: inds.get(crit.indicator)
            for z, inds in indicators_by_zone.items()
            if inds.get(crit.indicator) is not None
        }
        ranked = percentile_ranks(values, crit.direction)
        for zone, sub in ranked.items():
            subscores[zone][code] = sub
    return subscores


def _normalize_weights(weights: dict[str, float], available: set[str]) -> dict[str, float]:
    used = {k: v for k, v in weights.items() if k in available and v > 0}
    total = sum(used.values())
    if total <= 0:
        return {}
    return {k: v / total for k, v in used.items()}


def score_zone(
    zone_subscores: dict[str, float], weights: dict[str, float]
) -> dict:
    """Score 0–100 + décomposition pour une zone (RG-S2)."""
    norm = _normalize_weights(weights, set(zone_subscores.keys()))
    breakdown = []
    total = 0.0
    for code, w in sorted(norm.items(), key=lambda kv: -kv[1]):
        sub = zone_subscores[code]
        contribution = round(w * sub, 1)
        total += w * sub
        breakdown.append(
            {
                "criterion": code,
                "label": CRITERIA[code].label,
                "weight": round(w, 3),
                "subscore": round(sub, 1),
                "contribution": contribution,
            }
        )
    return {
        "score": int(round(total)),
        "breakdown": breakdown,
        "scoring_version": SCORING_VERSION,
    }


def weights_for(profile: str, overrides: dict[str, float] | None = None) -> dict[str, float]:
    base = dict(DEFAULT_WEIGHTS[profile])
    if overrides:
        base.update({k: float(v) for k, v in overrides.items() if k in CRITERIA})
    return base


def rank(
    subscores: dict[str, dict[str, float]],
    profile: str,
    overrides: dict[str, float] | None = None,
) -> list[dict]:
    """Classe les zones pour un profil (+ pondérations optionnelles)."""
    weights = weights_for(profile, overrides)
    rows = []
    for zone, subs in subscores.items():
        if not subs:
            continue
        s = score_zone(subs, weights)
        rows.append({"zone_id": zone, **s})
    rows.sort(key=lambda r: r["score"], reverse=True)
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows
