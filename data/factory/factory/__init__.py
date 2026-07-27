"""Data Factory multi-sources (Incrément 1).

Chaîne : Sources → Collecte → Indicateurs (+ dérivés) → Historisation append-only
→ Data Quality → Confiance → Publication. Voir docs/08 & docs/09.
"""
from .pipeline import run_pipeline

__all__ = ["run_pipeline"]
