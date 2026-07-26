"""Data Factory — pipeline DVF (Incrément 0).

Chaîne data-aware : Bronze → Silver → Gold, alignée sur docs/08.
"""
from .pipeline import run_pipeline

__all__ = ["run_pipeline"]
