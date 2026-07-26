#!/usr/bin/env python3
"""Point d'entrée CLI de la Data Factory (Incrément 1).

Usage:
    python run.py

Config-driven (voir factory/config.py) :
    DVF_MILLESIMES=2023,2024        millésimes DVF à charger (historisation)
    DVF_SOURCE_URL_TEMPLATE=...     vraie source geo-dvf ({millesime},{dep})
    COMMUNES_GEOJSON=...            contours IGN
    FACTORY_TODAY=YYYY-MM-DD        date de référence pour la fraîcheur
"""
from __future__ import annotations

import json
import sys

from factory import run_pipeline


def main() -> int:
    r = run_pipeline()
    print("=== Data Factory (multi-sources) — run terminé ===")
    print(f"Indicateurs      : {', '.join(r['indicators'])}")
    print(f"Zones avec data  : {r['run_meta']['zones_with_data']}/{r['run_meta']['zones_total']}")
    print(f"Lignes historique: {r['history_rows']} (tous millésimes conservés)")
    print(f"DQ global        : {r['dq_report']['global_dq_score']}")
    print("DQ par indicateur:")
    for code, v in r["dq_report"]["per_indicator"].items():
        tag = " (estimé)" if v["is_estimated"] else ""
        print(f"  - {code:<18} {v['dq_score']:>5}  [{v['nature']}]{tag}")
    print("Sorties (Gold)   :")
    print(json.dumps(r["outputs"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
