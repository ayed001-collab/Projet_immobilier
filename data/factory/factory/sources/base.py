"""Interface commune des connecteurs de source.

Chaque source produit une liste d'`IndicatorValue`. La collecte écrit une copie
brute dans bronze/ (idempotence + lineage). Ajouter une source = ajouter une
classe ici, sans toucher au reste du pipeline (docs/11 §7).
"""
from __future__ import annotations

from datetime import datetime, timezone

from ..model import IndicatorValue


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Source:
    name: str = "source"

    def extract(self) -> list[IndicatorValue]:  # pragma: no cover - interface
        raise NotImplementedError
