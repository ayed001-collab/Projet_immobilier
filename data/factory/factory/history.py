"""Historisation append-only — étape [6] (Silver).

Ne jamais écraser (RG-D4) : chaque (zone, indicateur, millésime) est conservé.
Ré-exécuter le pipeline ne crée pas de fraîcheur artificielle (RG-D5) : la date
de première collecte est préservée ; seule `last_seen_at` bouge. La valeur n'est
mise à jour que si la source publie une valeur différente pour ce millésime
(correction légitime).
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from . import config

HISTORY_COLS = [
    "zone_id", "nom_commune", "indicator", "millesime", "value", "unit",
    "source", "nature", "is_estimated", "obs_count",
    "first_collected_at", "last_seen_at", "is_current",
]


def _history_path(silver_dir: Path) -> Path:
    return silver_dir / "indicator_history.csv"


def load_history(silver_dir: Path | None = None) -> pd.DataFrame:
    silver_dir = silver_dir or config.SILVER_DIR
    path = _history_path(silver_dir)
    if path.exists():
        return pd.read_csv(path, dtype={"zone_id": str, "millesime": str})
    return pd.DataFrame(columns=HISTORY_COLS)


def merge(incoming: pd.DataFrame, silver_dir: Path | None = None) -> pd.DataFrame:
    """Fusionne les valeurs du run dans l'historique append-only.

    Retourne l'historique complet à jour (toutes années conservées).
    """
    silver_dir = silver_dir or config.SILVER_DIR
    silver_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    hist = load_history(silver_dir)
    hist_by_key = {
        (r["zone_id"], r["indicator"], r["millesime"]): r
        for r in hist.to_dict("records")
    }

    for row in incoming.to_dict("records"):
        key = (str(row["zone_id"]), row["indicator"], str(row["millesime"]))
        if key in hist_by_key:
            existing = hist_by_key[key]
            existing["last_seen_at"] = now  # RG-D5 : first_collected_at inchangé
            existing["value"] = row["value"]  # correction éventuelle de la source
            existing["obs_count"] = row.get("obs_count")
        else:
            hist_by_key[key] = {
                "zone_id": str(row["zone_id"]),
                "nom_commune": row.get("nom_commune"),
                "indicator": row["indicator"],
                "millesime": str(row["millesime"]),
                "value": row["value"],
                "unit": row.get("unit"),
                "source": row.get("source"),
                "nature": row.get("nature"),
                "is_estimated": row.get("is_estimated"),
                "obs_count": row.get("obs_count"),
                "first_collected_at": now,
                "last_seen_at": now,
                "is_current": False,
            }

    merged = pd.DataFrame(list(hist_by_key.values()), columns=HISTORY_COLS)

    # Recalcule le millésime courant par (zone, indicateur).
    merged["is_current"] = False
    idx = merged.groupby(["zone_id", "indicator"])["millesime"].idxmax()
    merged.loc[idx, "is_current"] = True

    merged.sort_values(["zone_id", "indicator", "millesime"]).to_csv(
        _history_path(silver_dir), index=False
    )
    return merged


def current(history: pd.DataFrame) -> pd.DataFrame:
    """Valeurs du millésime courant (ce que sert l'API par défaut)."""
    return history[history["is_current"]].reset_index(drop=True)
