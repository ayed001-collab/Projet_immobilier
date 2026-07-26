"""Configuration de l'API de lecture (Gold)."""
from __future__ import annotations

import os
from pathlib import Path

# Par défaut, l'API lit le GeoJSON de service produit par la Data Factory.
# En production, on branchera PostGIS via DATABASE_URL (chemin prévu, non requis
# pour l'Incrément 0).
DEFAULT_GOLD = (
    Path(__file__).resolve().parents[3]
    / "data" / "factory" / "gold" / "communes_prix_m2.geojson"
)
GOLD_GEOJSON = Path(os.getenv("GOLD_GEOJSON", str(DEFAULT_GOLD)))
DATABASE_URL = os.getenv("DATABASE_URL", "")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
