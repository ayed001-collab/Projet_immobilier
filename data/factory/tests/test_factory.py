"""Tests de la Data Factory multi-sources (Incrément 1)."""
import pandas as pd
import pytest

from factory import config, confidence, derived, history, quality
from factory.sources import dvf


# --- Nettoyage DVF --------------------------------------------------------
def _dvf(rows):
    cols = ["date_mutation", "nature_mutation", "valeur_fonciere", "code_commune",
            "nom_commune", "type_local", "surface_reelle_bati"]
    return pd.DataFrame(rows, columns=cols)


def test_dvf_price_and_outlier_filter():
    df = _dvf([
        ["2024-01-01", "Vente", 300000, "33063", "B", "Appartement", 60],   # 5000 ok
        ["2024-01-02", "Vente", 500000, "33063", "B", "Appartement", 2],     # 250000 outlier
        ["2024-01-03", "Echange", 300000, "33063", "B", "Appartement", 60],  # non-vente
    ])
    out = dvf.clean(df)
    assert len(out) == 1
    assert out.iloc[0]["prix_m2"] == 5000


# --- Indicateurs dérivés --------------------------------------------------
def _iv(indicator, zone, millesime, value, obs=None):
    return {
        "zone_id": zone, "nom_commune": "X", "indicator": indicator,
        "millesime": millesime, "value": value, "unit": "u", "source": "s",
        "nature": "measure", "is_estimated": False, "collected_at": "t", "obs_count": obs,
    }


def test_rendement_brut():
    df = pd.DataFrame([_iv("prix_m2", "33063", "2024", 4800),
                       _iv("loyer_m2", "33063", "2024", 14.0)])
    out = derived.compute_rendement(df)
    assert len(out) == 1
    # 14 * 12 / 4800 * 100 = 3.5
    assert out[0].value == 3.5
    assert out[0].is_estimated is True  # dépend d'un loyer estimé


def test_trend_uses_two_millesimes():
    df = pd.DataFrame([_iv("prix_m2", "33063", "2023", 4500),
                       _iv("prix_m2", "33063", "2024", 4824)])
    out = derived.compute_trend(df)
    assert len(out) == 1
    assert out[0].value == 7.2  # (4824-4500)/4500*100


def test_trend_needs_consecutive_years():
    df = pd.DataFrame([_iv("prix_m2", "33063", "2021", 4000),
                       _iv("prix_m2", "33063", "2024", 4800)])
    assert derived.compute_trend(df) == []  # écart != 1 an


# --- Historisation append-only -------------------------------------------
def test_history_appends_and_marks_current(tmp_path):
    v2023 = pd.DataFrame([_iv("prix_m2", "33063", "2023", 4500)])
    v2024 = pd.DataFrame([_iv("prix_m2", "33063", "2024", 4824)])
    history.merge(v2023, silver_dir=tmp_path)
    merged = history.merge(v2024, silver_dir=tmp_path)
    # Les deux millésimes sont conservés (RG-D4).
    assert len(merged) == 2
    cur = history.current(merged)
    assert len(cur) == 1 and cur.iloc[0]["millesime"] == "2024"


def test_history_no_artificial_refresh(tmp_path):
    v = pd.DataFrame([_iv("prix_m2", "33063", "2024", 4824)])
    m1 = history.merge(v, silver_dir=tmp_path)
    first = m1.iloc[0]["first_collected_at"]
    m2 = history.merge(v, silver_dir=tmp_path)  # ré-exécution
    assert len(m2) == 1  # pas de doublon
    assert m2.iloc[0]["first_collected_at"] == first  # RG-D5 : date préservée


# --- Data Quality & confiance --------------------------------------------
def test_quality_flags_out_of_bounds(monkeypatch):
    cur = pd.DataFrame([_iv("prix_m2", "33063", "2024", 999999)])  # hors bornes
    with pytest.raises(quality.DataQualityError):
        quality.assess(cur, zones_total=1)


def test_quality_dq_score_reasonable():
    cur = pd.DataFrame([_iv("prix_m2", "33063", "2024", 4800, obs=40)])
    rep = quality.assess(cur, zones_total=1)
    assert rep["passed"] is True
    assert 0 <= rep["per_indicator"]["prix_m2"]["dq_score"] <= 100


def test_confidence_measure_beats_estimate():
    measure = pd.DataFrame([_iv("prix_m2", "33063", "2024", 4800, obs=40)])
    est = pd.DataFrame([{**_iv("loyer_m2", "33069", "2024", 13.0), "nature": "model",
                         "is_estimated": True}])
    cm = confidence.per_zone(measure).iloc[0]["confidence_score"]
    ce = confidence.per_zone(est).iloc[0]["confidence_score"]
    assert cm > ce
