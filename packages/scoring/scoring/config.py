"""Configuration versionnée du scoring (docs/05 §8).

Tout est en configuration (pas codé en dur dans l'algorithme) : critères,
mapping vers indicateurs, sens, pondérations par défaut. Un changement de
méthodologie ⇒ nouvelle SCORING_VERSION (les scores historisés restent lisibles
avec la version qui les a produits).
"""
from __future__ import annotations

from dataclasses import dataclass

SCORING_VERSION = "1.0.0"


@dataclass(frozen=True)
class Criterion:
    code: str
    indicator: str  # indicateur source (registre de la Data Factory)
    direction: str  # higher_better | lower_better
    label: str


# Un critère = un indicateur normalisé, avec un sens explicite.
CRITERIA: dict[str, Criterion] = {
    "education": Criterion("education", "ips_moyen", "higher_better", "Éducation"),
    "transports": Criterion("transports", "temps_gare_min", "lower_better", "Transports"),
    "prix": Criterion("prix", "prix_m2", "lower_better", "Prix (accessibilité)"),
    "rendement": Criterion("rendement", "rendement_brut", "higher_better", "Rendement locatif"),
    "valorisation": Criterion("valorisation", "tendance_prix_1an", "higher_better", "Potentiel de valorisation"),
    "revenu": Criterion("revenu", "revenu_median", "higher_better", "Niveau de vie"),
}

# Pondérations par défaut par profil (modifiables par l'utilisateur — RG-S1).
# Elles seront renormalisées à somme 1 sur les critères réellement disponibles.
DEFAULT_WEIGHTS: dict[str, dict[str, float]] = {
    "home": {"education": 0.30, "transports": 0.25, "prix": 0.30, "revenu": 0.15},
    "investment": {"rendement": 0.40, "valorisation": 0.25, "prix": 0.20, "revenu": 0.15},
}

PROFILES = tuple(DEFAULT_WEIGHTS.keys())
