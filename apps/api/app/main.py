"""API de lecture — copilote immobilier (Incrément 1).

Sert les indicateurs multi-sources par commune (prix, loyer, rendement,
population, revenu, éducation, transports, tendance), la confiance par zone, les
métadonnées des couches et l'historique — avec traçabilité (source, millésime).
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scoring import CRITERIA, DEFAULT_WEIGHTS, PROFILES, SCORING_VERSION, rank

from . import config, data

app = FastAPI(
    title="Copilote immobilier — API (Incrément 1)",
    version="0.2.0",
    description="Indicateurs immobiliers et territoriaux par commune, sourcés, "
    "datés et assortis d'un niveau de confiance.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _guard(fn):
    try:
        return fn()
    except data.DataUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/meta")
def meta() -> dict:
    return _guard(data.get_meta)


@app.get("/api/layers")
def layers() -> list:
    """Couches cartographiques disponibles (indicateurs + métadonnées)."""
    return _guard(data.layers)


@app.get("/api/communes")
def communes() -> dict:
    """FeatureCollection : géométries + tous les indicateurs + confiance."""
    return _guard(data.geojson)


@app.get("/api/communes/{code}")
def commune(code: str) -> dict:
    """Fiche d'une commune : indicateurs, confiance et historique multi-millésimes."""
    feat = _guard(lambda: data.get_commune(code))
    if feat is None:
        raise HTTPException(status_code=404, detail=f"Commune {code} inconnue.")
    return feat


@app.get("/api/weights")
def weights(profile: str = "home") -> dict:
    """Pondérations par défaut d'un profil + libellés des critères (pour l'UI)."""
    if profile not in PROFILES:
        raise HTTPException(status_code=400, detail=f"Profil inconnu : {profile}.")
    return {
        "profile": profile,
        "scoring_version": SCORING_VERSION,
        "weights": DEFAULT_WEIGHTS[profile],
        "criteria": {c.code: {"label": c.label, "indicator": c.indicator,
                              "direction": c.direction} for c in CRITERIA.values()},
    }


class ScoreRequest(BaseModel):
    profile: str = "home"
    weights: dict[str, float] | None = None  # pondérations personnalisées (optionnel)


@app.post("/api/score")
def score(req: ScoreRequest) -> dict:
    """Classement personnalisé : recalcul dynamique selon les pondérations (RG-S1).

    Rapide : réutilise les sous-scores normalisés déjà publiés ; seule la
    pondération est appliquée à la demande.
    """
    if req.profile not in PROFILES:
        raise HTTPException(status_code=400, detail=f"Profil inconnu : {req.profile}.")
    subs = _guard(data.subscores)
    names = _guard(data.name_by_zone)
    conf = {
        f["properties"]["code_commune"]: f["properties"].get("confidence_score")
        for f in _guard(data.geojson)["features"]
    }
    ranked = rank(subs, req.profile, req.weights)
    for r in ranked:
        r["nom_commune"] = names.get(r["zone_id"])
        r["confidence_score"] = conf.get(r["zone_id"])
    return {
        "profile": req.profile,
        "scoring_version": SCORING_VERSION,
        "weights_applied": (req.weights or DEFAULT_WEIGHTS[req.profile]),
        "results": ranked,
    }
