"""API de lecture — copilote immobilier (Incrément 0).

Expose l'indicateur prix_m2 par commune (produit par la Data Factory) sous
forme GeoJSON pour la carte, plus les métadonnées de traçabilité (source,
période, dernière mise à jour) — exigence de transparence (docs/09).
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config, data

app = FastAPI(
    title="Copilote immobilier — API (Incrément 0)",
    version="0.1.0",
    description="Chaîne DVF → carte : prix au m² par commune, sourcé et daté.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/meta")
def meta() -> dict:
    """Métadonnées de traçabilité de l'indicateur (source, date, méthode)."""
    try:
        return data.get_meta()
    except data.DataUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/communes")
def communes() -> dict:
    """FeatureCollection GeoJSON des communes + prix_m2 (pour la carte)."""
    try:
        return data.get_feature_collection()
    except data.DataUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/communes/{code}")
def commune(code: str) -> dict:
    """Fiche synthétique d'une commune (valeur + traçabilité)."""
    try:
        feat = data.get_commune(code)
    except data.DataUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if feat is None:
        raise HTTPException(status_code=404, detail=f"Commune {code} inconnue.")
    return feat["properties"]
