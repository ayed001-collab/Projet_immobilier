"""Modèle d'indicateurs générique (aligné sur docs/10).

Un `IndicatorValue` = une mesure datée et sourcée, rattachée à une zone et à un
millésime. Le `INDICATOR_REGISTRY` décrit chaque indicateur (libellé, unité,
nature, sens, source, fréquence attendue, bornes de plausibilité) : il pilote la
DQ, la confiance et l'affichage front.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict


@dataclass
class IndicatorMeta:
    code: str
    label: str
    unit: str
    category: str
    nature: str  # measure | calc | model | editorial | forecast
    direction: str  # higher_better | lower_better | context
    source: str
    expected_frequency: str  # annual | semestrial | monthly | continuous
    valid_min: float
    valid_max: float
    is_estimated: bool = False


@dataclass
class IndicatorValue:
    zone_id: str
    nom_commune: str
    indicator: str
    millesime: str
    value: float
    unit: str
    source: str
    nature: str
    is_estimated: bool
    collected_at: str
    obs_count: int | None = None
    extra: dict = field(default_factory=dict)

    def to_row(self) -> dict:
        d = asdict(self)
        d.pop("extra")
        return d


# Fréquence attendue → âge maximal « frais » (années) avant pénalité (docs/09).
FRESHNESS_GRACE_YEARS = {
    "semestrial": 1.0,
    "annual": 2.0,   # INSEE : millésimes décalés de 2–3 ans, toléré
    "monthly": 0.25,
    "continuous": 0.25,
}

INDICATOR_REGISTRY: dict[str, IndicatorMeta] = {
    "prix_m2": IndicatorMeta(
        "prix_m2", "Prix au m²", "€/m²", "marche", "measure", "lower_better",
        "DVF — Demandes de Valeurs Foncières", "semestrial", 500, 20000),
    "tendance_prix_1an": IndicatorMeta(
        "tendance_prix_1an", "Évolution des prix sur 1 an", "%", "marche", "calc",
        "higher_better", "DVF (calcul inter-millésimes)", "semestrial", -50, 50),
    "loyer_m2": IndicatorMeta(
        "loyer_m2", "Loyer au m²", "€/m²/mois", "locatif", "model", "context",
        "Carte des loyers (modélisée)", "annual", 3, 60, is_estimated=True),
    "rendement_brut": IndicatorMeta(
        "rendement_brut", "Rendement locatif brut", "%", "locatif", "calc",
        "higher_better", "DVF + Loyers (calcul)", "annual", 0.5, 25),
    "population": IndicatorMeta(
        "population", "Population", "habitants", "socio", "measure", "context",
        "INSEE — Recensement", "annual", 0, 3_000_000),
    "revenu_median": IndicatorMeta(
        "revenu_median", "Revenu médian", "€/an", "socio", "measure", "context",
        "INSEE — Filosofi", "annual", 5000, 80000),
    "ips_moyen": IndicatorMeta(
        "ips_moyen", "Indice de position sociale (éducation)", "indice", "education",
        "measure", "higher_better", "MEN — IPS", "annual", 50, 160),
    "temps_gare_min": IndicatorMeta(
        "temps_gare_min", "Temps vers la gare de Bordeaux", "min", "transports",
        "calc", "lower_better", "OSM/OSRM (calcul)", "continuous", 0, 240),
}
