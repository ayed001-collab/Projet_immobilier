"""Tests du nettoyage DVF (déterministes, sur mini-jeux contrôlés)."""
import pandas as pd

from dvf_pipeline import clean


def _df(rows):
    cols = [
        "date_mutation", "nature_mutation", "valeur_fonciere", "code_commune",
        "nom_commune", "type_local", "surface_reelle_bati",
    ]
    return pd.DataFrame(rows, columns=cols)


def test_computes_price_per_m2():
    df = _df([["2024-01-01", "Vente", 300000, "33063", "Bordeaux", "Appartement", 60]])
    out = clean.clean(df)
    assert len(out) == 1
    assert out.iloc[0]["prix_m2"] == 5000  # 300000 / 60


def test_drops_non_sale_and_non_residential():
    df = _df([
        ["2024-01-01", "Echange", 300000, "33063", "B", "Appartement", 60],
        ["2024-01-02", "Vente", 300000, "33063", "B", "Local industriel", 60],
    ])
    assert clean.clean(df).empty


def test_drops_missing_or_zero_values():
    df = _df([
        ["2024-01-01", "Vente", None, "33063", "B", "Appartement", 60],
        ["2024-01-02", "Vente", 300000, "33063", "B", "Appartement", 0],
        ["2024-01-03", "Vente", 300000, "33063", "B", "Appartement", None],
    ])
    assert clean.clean(df).empty


def test_drops_hard_outliers():
    df = _df([
        ["2024-01-01", "Vente", 500000, "33063", "B", "Appartement", 2],   # 250000 €/m²
        ["2024-01-02", "Vente", 6000, "33063", "B", "Appartement", 60],    # 100 €/m²
        ["2024-01-03", "Vente", 300000, "33063", "B", "Appartement", 60],  # 5000 €/m² OK
    ])
    out = clean.clean(df)
    assert len(out) == 1
    assert out.iloc[0]["prix_m2"] == 5000


def test_missing_column_raises(tmp_path):
    # Schéma cassé (rupture de source) → erreur explicite au chargement.
    bad = tmp_path / "bad.csv"
    bad.write_text("valeur_fonciere,code_commune\n300000,33063\n", encoding="utf-8")
    import pytest

    with pytest.raises(ValueError):
        clean.load_raw(bad)
