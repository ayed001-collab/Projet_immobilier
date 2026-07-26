"""Contrôle qualité de sortie — étape [8] QC (bloquante avant publication).

Contrôles minimaux (Incrément 0). En V+, remplacé/complété par des suites
Great Expectations (docs/09). Un échec bloquant empêche la publication.
"""
from __future__ import annotations

import pandas as pd

from . import config


class DataQualityError(Exception):
    """Levée quand un contrôle bloquant échoue → pas de publication."""


def check_output(indicators: pd.DataFrame) -> dict:
    """Contrôles bloquants + avertissements. Renvoie un rapport DQ."""
    errors: list[str] = []
    warnings: list[str] = []

    if indicators.empty:
        raise DataQualityError("Aucune commune scorée : sortie vide.")

    # Bloquant : valeurs dans les bornes plausibles.
    out_of_bounds = indicators[
        (indicators["prix_m2"] < config.PRICE_M2_HARD_MIN)
        | (indicators["prix_m2"] > config.PRICE_M2_HARD_MAX)
    ]
    if not out_of_bounds.empty:
        errors.append(
            f"{len(out_of_bounds)} commune(s) avec prix_m2 hors bornes plausibles."
        )

    # Bloquant : pas de doublon de commune.
    dups = indicators["code_commune"].duplicated().sum()
    if dups:
        errors.append(f"{dups} code(s) commune en doublon.")

    # Bloquant : champs obligatoires non nuls.
    if indicators["prix_m2"].isna().any():
        errors.append("prix_m2 nul détecté.")

    # Avertissement : faible volume d'observations.
    low = indicators[indicators["obs_count"] < config.CONFIDENCE_MIN_OBS_OK]
    if not low.empty:
        warnings.append(
            f"{len(low)} commune(s) à faible volume (<{config.CONFIDENCE_MIN_OBS_OK} obs) "
            "→ confiance réduite (non bloquant)."
        )

    dq_score = round(
        100 * (indicators["confidence_score"].mean() / 100), 1
    )
    report = {
        "communes_scored": int(len(indicators)),
        "dq_score": dq_score,
        "errors": errors,
        "warnings": warnings,
        "passed": not errors,
    }
    if errors:
        raise DataQualityError("; ".join(errors))
    return report
