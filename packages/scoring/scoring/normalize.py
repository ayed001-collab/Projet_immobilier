"""Normalisation comparable entre territoires (docs/05 §2).

Normalisation par rang percentile : robuste aux valeurs extrêmes et comparable
d'une zone à l'autre. Le sens de l'indicateur est géré explicitement
(`higher_better` vs `lower_better`).
"""
from __future__ import annotations


def percentile_ranks(values: dict[str, float], direction: str) -> dict[str, float]:
    """Rang percentile ∈ [0,100] pour chaque zone.

    Formule de type « Hazen » avec gestion des ex æquo : une valeur médiane rend
    ~50. Pour `lower_better`, l'échelle est inversée (une petite valeur = meilleur
    = score élevé).
    """
    items = [(z, v) for z, v in values.items() if v is not None]
    n = len(items)
    out: dict[str, float] = {}
    if n == 0:
        return out
    if n == 1:
        # une seule zone : pas de distribution → score neutre.
        out[items[0][0]] = 50.0
        return out

    vals = [v for _, v in items]
    for zone, v in items:
        below = sum(1 for x in vals if x < v)
        equal = sum(1 for x in vals if x == v)
        pct = (below + 0.5 * equal) / n * 100.0
        if direction == "lower_better":
            pct = 100.0 - pct
        out[zone] = round(pct, 1)
    return out
