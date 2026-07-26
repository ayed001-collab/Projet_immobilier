"""Configuration du pipeline DVF (Incrément 0).

Config-driven : en production, `DVF_SOURCE_URL` pointe vers geo-dvf
(https://files.data.gouv.fr/geo-dvf/latest/csv/<annee>/departements/<dep>.csv.gz)
et `COMMUNES_GEOJSON` vers les contours IGN Admin Express. Dans l'environnement
hors-ligne (proxy bloquant data.gouv), on retombe sur les fixtures embarquées.
"""
from __future__ import annotations

import os
from pathlib import Path

FACTORY_DIR = Path(__file__).resolve().parent.parent
FIXTURES_DIR = FACTORY_DIR / "fixtures"
BRONZE_DIR = FACTORY_DIR / "bronze"
SILVER_DIR = FACTORY_DIR / "silver"
GOLD_DIR = FACTORY_DIR / "gold"

# --- Source DVF -----------------------------------------------------------
# Si défini, le connecteur tentera de télécharger la vraie source geo-dvf.
DVF_SOURCE_URL = os.getenv("DVF_SOURCE_URL", "")
# Fixture utilisée à défaut (démo hors-ligne).
DVF_FIXTURE = FIXTURES_DIR / "dvf_sample_33.csv"

# --- Géométries communales ------------------------------------------------
COMMUNES_GEOJSON = Path(
    os.getenv("COMMUNES_GEOJSON", str(FIXTURES_DIR / "communes_33_sample.geojson"))
)

# --- Millésime / département ----------------------------------------------
DEPARTEMENT = os.getenv("DVF_DEPARTEMENT", "33")
MILLESIME = os.getenv("DVF_MILLESIME", "2024")

# --- Métadonnées de source (traçabilité — voir docs/09) -------------------
SOURCE_NAME = "DVF — Demandes de Valeurs Foncières"
SOURCE_OWNER = "DGFiP / Etalab (geo-dvf, Cerema)"
SOURCE_LICENSE = "Licence Ouverte / Etalab 2.0"
SOURCE_NATURE = "measure"  # mesure directe (transactions réelles)

# --- Règles de nettoyage (voir docs/05 §2 & docs/09) ----------------------
MIN_SURFACE_M2 = 9  # en-deçà : non résidentiel / erreur de saisie
PRICE_M2_HARD_MIN = 500  # borne dure basse (€/m²)
PRICE_M2_HARD_MAX = 20000  # borne dure haute (€/m²)
VALID_TYPES = ("Appartement", "Maison")
VALID_NATURES = ("Vente",)
WINSOR_LOW_PCT = 0.05  # bornage intra-commune si assez d'observations
WINSOR_HIGH_PCT = 0.95
WINSOR_MIN_OBS = 20  # winsorisation seulement si n >= ce seuil

# --- Confiance simplifiée (préfigure le Data Confidence Score, docs/05 §6) -
CONFIDENCE_MIN_OBS_HIGH = 30  # >= : confiance élevée (volume)
CONFIDENCE_MIN_OBS_OK = 10  # >= : confiance correcte
