#!/usr/bin/env python3
"""Point d'entrée CLI de la Data Factory (Incrément 0).

Usage:
    python run.py

Variables d'env utiles (config-driven, voir dvf_pipeline/config.py) :
    DVF_SOURCE_URL   URL geo-dvf réelle (sinon fixture hors-ligne)
    COMMUNES_GEOJSON contours communaux (sinon fixture)
    DATABASE_URL     charge aussi PostGIS si défini
"""
from __future__ import annotations

import json
import sys

from dvf_pipeline import run_pipeline


def main() -> int:
    result = run_pipeline()
    print("=== Data Factory DVF — run terminé ===")
    print(f"Communes scorées : {result['communes_scored']}")
    print(f"DQ score         : {result['dq_report']['dq_score']}")
    if result["dq_report"]["warnings"]:
        print("Avertissements   :")
        for w in result["dq_report"]["warnings"]:
            print(f"  - {w}")
    print("Sorties (Gold)   :")
    print(json.dumps(result["outputs"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
