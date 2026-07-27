"""Calcul de classement personnalisé — factorisé (réutilisé par /api/score et les projets).

Réutilise les sous-scores normalisés publiés par la Data Factory ; applique la
pondération à la demande (recalcul dynamique) et, si un budget + une surface sont
fournis, calcule le prix du bien-type par zone et la compatibilité budget.
"""
from __future__ import annotations

from scoring import rank

from . import data


def compute(
    profile: str,
    weights: dict | None = None,
    budget: float | None = None,
    surface: float | None = None,
) -> list[dict]:
    subs = data.subscores()
    names = data.name_by_zone()
    props_by_zone = {
        f["properties"]["code_commune"]: f["properties"]
        for f in data.geojson()["features"]
    }
    ranked = rank(subs, profile, weights)
    budget_mode = budget is not None and surface is not None
    for r in ranked:
        p = props_by_zone.get(r["zone_id"], {})
        r["nom_commune"] = names.get(r["zone_id"])
        r["confidence_score"] = p.get("confidence_score")
        prix_m2 = (p.get("indicators", {}).get("prix_m2") or {}).get("value")
        if budget_mode and prix_m2:
            bien_price = round(prix_m2 * surface)
            r["bien_type_price"] = bien_price
            r["within_budget"] = bien_price <= budget
        elif budget_mode:
            r["bien_type_price"] = None
            r["within_budget"] = None

    if budget_mode:
        # Compatibles budget d'abord, puis meilleur score (RG-R2).
        ranked.sort(key=lambda r: (r.get("within_budget") is True, r["score"]), reverse=True)
        for i, r in enumerate(ranked, 1):
            r["rank"] = i
    return ranked
