"""Moteur de scoring partagé (Home / Investment) — docs/05."""
from .config import CRITERIA, DEFAULT_WEIGHTS, PROFILES, SCORING_VERSION
from .engine import compute_subscores, rank, score_zone, weights_for
from .normalize import percentile_ranks

__all__ = [
    "SCORING_VERSION", "CRITERIA", "DEFAULT_WEIGHTS", "PROFILES",
    "compute_subscores", "score_zone", "rank", "weights_for", "percentile_ranks",
]
