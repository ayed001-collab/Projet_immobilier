"""Configuration de la Data Factory multi-sources (Incrément 1).

Config-driven : chaque source peut pointer vers sa vraie origine (geo-dvf,
API INSEE, carte des loyers, annuaire éducation, calcul d'isochrones OSRM…)
via variables d'environnement ; à défaut, les fixtures embarquées permettent
une exécution hors-ligne.
"""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path

FACTORY_DIR = Path(__file__).resolve().parent.parent
FIXTURES_DIR = FACTORY_DIR / "fixtures"
BRONZE_DIR = FACTORY_DIR / "bronze"
SILVER_DIR = FACTORY_DIR / "silver"
GOLD_DIR = FACTORY_DIR / "gold"

DEPARTEMENT = os.getenv("DVF_DEPARTEMENT", "33")

# Géométries communales (contours IGN en prod).
COMMUNES_GEOJSON = Path(
    os.getenv("COMMUNES_GEOJSON", str(FIXTURES_DIR / "communes_33_sample.geojson"))
)

# Millésimes DVF à charger (historisation : plusieurs années).
DVF_MILLESIMES = os.getenv("DVF_MILLESIMES", "2023,2024").split(",")
# URL template optionnelle : {millesime} et {dep} sont substitués.
DVF_SOURCE_URL_TEMPLATE = os.getenv("DVF_SOURCE_URL_TEMPLATE", "")

# Date de référence pour la fraîcheur (docs/09). Surchargée en test.
TODAY = date.fromisoformat(os.getenv("FACTORY_TODAY", date.today().isoformat()))

# --- Nettoyage DVF --------------------------------------------------------
MIN_SURFACE_M2 = 9
PRICE_M2_HARD_MIN = 500
PRICE_M2_HARD_MAX = 20000
VALID_TYPES = ("Appartement", "Maison")
VALID_NATURES = ("Vente",)
WINSOR_LOW_PCT = 0.05
WINSOR_HIGH_PCT = 0.95
WINSOR_MIN_OBS = 20

# --- Fiabilité par nature de donnée (docs/05 §6) --------------------------
RELIABILITY_BY_NATURE = {
    "measure": 1.0,
    "calc": 0.9,
    "model": 0.7,
    "editorial": 0.5,
    "forecast": 0.4,
}

# Poids par défaut des indicateurs dans la confiance d'une zone (docs/05 §6).
# (Le scoring Home/Investment pondéré arrive en Incrément 2.)
CONFIDENCE_WEIGHTS = {
    "prix_m2": 0.30,
    "loyer_m2": 0.15,
    "rendement_brut": 0.10,
    "population": 0.10,
    "revenu_median": 0.10,
    "ips_moyen": 0.10,
    "temps_gare_min": 0.10,
    "tendance_prix_1an": 0.05,
}
