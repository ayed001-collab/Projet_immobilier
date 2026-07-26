"""API de lecture — copilote immobilier (Incrément 1).

Sert les indicateurs multi-sources par commune (prix, loyer, rendement,
population, revenu, éducation, transports, tendance), la confiance par zone, les
métadonnées des couches et l'historique — avec traçabilité (source, millésime).
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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
