"""Tests du moteur de scoring (normalisation, pondération, décomposition, non-régression)."""
from scoring import (
    CRITERIA, compute_subscores, percentile_ranks, rank, score_zone, weights_for,
)


def test_percentile_direction():
    vals = {"a": 10, "b": 20, "c": 30}
    hi = percentile_ranks(vals, "higher_better")
    lo = percentile_ranks(vals, "lower_better")
    assert hi["c"] > hi["a"]          # grande valeur = meilleur
    assert lo["a"] > lo["c"]          # petite valeur = meilleur (inversé)
    assert hi["a"] + lo["a"] == 100   # symétrie


def test_single_zone_is_neutral():
    assert percentile_ranks({"a": 5}, "higher_better") == {"a": 50.0}


def test_subscores_use_indicators():
    inds = {
        "z1": {"ips_moyen": 118, "prix_m2": 3700, "temps_gare_min": 25},
        "z2": {"ips_moyen": 98, "prix_m2": 4800, "temps_gare_min": 5},
    }
    subs = compute_subscores(inds)
    # z1 meilleure éducation ; z2 meilleur transport et prix plus élevé (moins bon prix)
    assert subs["z1"]["education"] > subs["z2"]["education"]
    assert subs["z2"]["transports"] > subs["z1"]["transports"]
    assert subs["z1"]["prix"] > subs["z2"]["prix"]  # prix bas = meilleur


def test_weights_renormalized_over_available():
    # revenu absent → son poids est redistribué (RG-S4).
    subs = {"education": 80.0, "transports": 60.0, "prix": 40.0}
    res = score_zone(subs, weights_for("home"))
    assert 0 <= res["score"] <= 100
    assert abs(sum(b["weight"] for b in res["breakdown"]) - 1.0) < 1e-6


def test_breakdown_sums_to_score():
    subs = {"education": 80.0, "transports": 60.0, "prix": 40.0, "revenu": 50.0}
    res = score_zone(subs, weights_for("home"))
    assert abs(sum(b["contribution"] for b in res["breakdown"]) - res["score"]) <= 1.0


def test_monotonicity_increasing_weight_raises_score():
    # Non-régression : augmenter le poids d'un critère fort augmente le score.
    subs = {"education": 90.0, "transports": 30.0, "prix": 30.0, "revenu": 30.0}
    low = score_zone(subs, {"education": 0.1, "transports": 0.3, "prix": 0.3, "revenu": 0.3})
    high = score_zone(subs, {"education": 0.7, "transports": 0.1, "prix": 0.1, "revenu": 0.1})
    assert high["score"] > low["score"]


def test_rank_orders_zones():
    subs = {
        "z1": {"education": 90.0, "transports": 80.0, "prix": 70.0, "revenu": 60.0},
        "z2": {"education": 20.0, "transports": 20.0, "prix": 20.0, "revenu": 20.0},
    }
    ranked = rank(subs, "home")
    assert ranked[0]["zone_id"] == "z1" and ranked[0]["rank"] == 1
    assert ranked[1]["zone_id"] == "z2"
