"""Tests de l'agrégation par commune."""
import pandas as pd

from dvf_pipeline import aggregate


def _obs(code, prices, nom="X"):
    return pd.DataFrame(
        {
            "date_mutation": ["2024-01-01"] * len(prices),
            "code_commune": [code] * len(prices),
            "nom_commune": [nom] * len(prices),
            "prix_m2": prices,
        }
    )


def test_median_per_commune():
    df = _obs("33063", [4000, 5000, 6000])
    out = aggregate.aggregate(df, collected_at="2024-07-26T00:00:00Z")
    row = out[out["code_commune"] == "33063"].iloc[0]
    assert row["prix_m2"] == 5000
    assert row["obs_count"] == 3
    assert bool(row["is_estimated"]) is False


def test_confidence_levels():
    assert aggregate.confidence_from_obs(40)[1] == "Élevée"
    assert aggregate.confidence_from_obs(15)[1] == "Correcte"
    assert aggregate.confidence_from_obs(3)[1] == "Limitée"


def test_empty_input_gives_empty_frame():
    out = aggregate.aggregate(
        pd.DataFrame(columns=["date_mutation", "code_commune", "nom_commune", "prix_m2"]),
        collected_at="2024-07-26T00:00:00Z",
    )
    assert out.empty


def test_metadata_present():
    out = aggregate.aggregate(_obs("33069", [3000, 4000]), collected_at="t")
    row = out.iloc[0]
    assert row["source"].startswith("DVF")
    assert row["periode"].startswith("transactions")
    assert row["derniere_maj"] == "t"
