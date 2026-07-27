"""Configuration de l'API de lecture (Gold)."""
from __future__ import annotations

import os
from pathlib import Path

GOLD_DIR = Path(
    os.getenv(
        "GOLD_DIR",
        str(Path(__file__).resolve().parents[3] / "data" / "factory" / "gold"),
    )
)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
