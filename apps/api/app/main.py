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

from . import config, data, finance

app = FastAPI(
    title="Copilote immobilier — API (Incrément 1)",
    version="0.2.0",
    description="Indicateurs immobiliers et territoriaux par commune, sourcés, "
    "datés et assortis d'un niveau de confiance.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET", "POST"],
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


class FinanceRequest(BaseModel):
    revenus_mensuels: float
    apport: float = 0.0
    taux_annuel: float = 3.5
    duree_annees: int = 25
    taux_endettement: float = finance.DEFAULT_ENDETTEMENT
    bien_neuf: bool = False


@app.post("/api/finance")
def finance_endpoint(req: FinanceRequest) -> dict:
    """Capacité d'emprunt & budget d'achat (estimation indicative — RG-B)."""
    if req.revenus_mensuels < 0 or req.apport < 0:
        raise HTTPException(status_code=400, detail="Revenus et apport doivent être positifs.")
    res = finance.compute(
        revenus_mensuels=req.revenus_mensuels, apport=req.apport,
        taux_annuel=req.taux_annuel, duree_annees=req.duree_annees,
        taux_endettement=req.taux_endettement, bien_neuf=req.bien_neuf,
    )
    return {**res.to_dict(), "hypotheses": {
        "taux_annuel": req.taux_annuel, "duree_annees": req.duree_annees,
        "taux_endettement": req.taux_endettement,
        "avertissement": "Estimation indicative — ne vaut pas accord de prêt.",
    }}


class ScoreRequest(BaseModel):
    profile: str = "home"
    weights: dict[str, float] | None = None  # pondérations personnalisées (optionnel)
    budget: float | None = None   # budget d'achat max (prix du bien)
    surface: float | None = None  # surface cible du bien-type (m²)


@app.post("/api/score")
def score(req: ScoreRequest) -> dict:
    """Classement personnalisé : recalcul dynamique selon les pondérations (RG-S1).

    Rapide : réutilise les sous-scores normalisés déjà publiés ; seule la
    pondération est appliquée à la demande. Si `budget` + `surface` sont fournis,
    calcule le prix du bien-type par zone et la compatibilité budget (recherche
    inversée « Où puis-je acheter ? ») ; les zones compatibles remontent en tête
    (RG-R2).
    """
    if req.profile not in PROFILES:
        raise HTTPException(status_code=400, detail=f"Profil inconnu : {req.profile}.")
    subs = _guard(data.subscores)
    names = _guard(data.name_by_zone)
    props_by_zone = {
        f["properties"]["code_commune"]: f["properties"]
        for f in _guard(data.geojson)["features"]
    }
    ranked = rank(subs, req.profile, req.weights)
    budget_mode = req.budget is not None and req.surface is not None
    for r in ranked:
        p = props_by_zone.get(r["zone_id"], {})
        r["nom_commune"] = names.get(r["zone_id"])
        r["confidence_score"] = p.get("confidence_score")
        prix_m2 = (p.get("indicators", {}).get("prix_m2") or {}).get("value")
        if budget_mode and prix_m2:
            bien_price = round(prix_m2 * req.surface)
            r["bien_type_price"] = bien_price
            r["within_budget"] = bien_price <= req.budget
        elif budget_mode:
            r["bien_type_price"] = None
            r["within_budget"] = None

    if budget_mode:
        # Compatibles budget d'abord, puis meilleur score (RG-R2).
        ranked.sort(key=lambda r: (r.get("within_budget") is True, r["score"]), reverse=True)
        for i, r in enumerate(ranked, 1):
            r["rank"] = i

    return {
        "profile": req.profile,
        "scoring_version": SCORING_VERSION,
        "weights_applied": (req.weights or DEFAULT_WEIGHTS[req.profile]),
        "budget": req.budget,
        "surface": req.surface,
        "results": ranked,
    }


# --- Comparateur (écran 5) ------------------------------------------------

class CompareRequest(BaseModel):
    codes: list[str]  # 2 à 4 codes commune
    profile: str = "home"


# Badges automatiques : (clé, libellé, fonction de score à maximiser).
def _qol(subs: dict) -> float:
    parts = [subs[k] for k in ("education", "transports", "revenu") if k in subs]
    return sum(parts) / len(parts) if parts else 0.0


@app.post("/api/compare")
def compare(req: CompareRequest) -> dict:
    """Compare 2 à 4 zones et désigne le gagnant par catégorie (badges auto)."""
    if not 2 <= len(req.codes) <= 4:
        raise HTTPException(status_code=400, detail="Comparer entre 2 et 4 zones.")
    if req.profile not in PROFILES:
        raise HTTPException(status_code=400, detail=f"Profil inconnu : {req.profile}.")

    props_by_zone = {
        f["properties"]["code_commune"]: f["properties"]
        for f in _guard(data.geojson)["features"]
    }
    all_scores = _guard(data.scores)

    zones = []
    for code in req.codes:
        p = props_by_zone.get(str(code))
        if p is None or not p.get("has_data"):
            raise HTTPException(status_code=404, detail=f"Zone {code} indisponible.")
        sc = all_scores.get(str(code), {})
        zones.append({
            "code_commune": str(code),
            "nom_commune": p.get("nom_commune"),
            "confidence_score": p.get("confidence_score"),
            "home_score": p.get("home_score"),
            "investment_score": p.get("investment_score"),
            "indicators": p.get("indicators", {}),
            "subscores": sc.get("subscores", {}),
        })

    def _val(z, ind):
        return (z["indicators"].get(ind) or {}).get("value")

    def _winner(fn):
        best, best_v = None, None
        for z in zones:
            v = fn(z)
            if v is None:
                continue
            if best_v is None or v > best_v:
                best, best_v = z["code_commune"], v
        return best

    profile_key = f"{req.profile}_score"
    badges = {
        "meilleur_profil": _winner(lambda z: z.get(profile_key)),
        "meilleur_rapport_qualite_prix": _winner(
            lambda z: (z.get("home_score") / _val(z, "prix_m2"))
            if z.get("home_score") and _val(z, "prix_m2") else None
        ),
        "meilleur_potentiel": _winner(lambda z: _val(z, "tendance_prix_1an")),
        "meilleure_qualite_vie": _winner(lambda z: _qol(z["subscores"])),
        "meilleur_rendement": _winner(lambda z: _val(z, "rendement_brut")),
    }
    badge_labels = {
        "meilleur_profil": "Meilleur choix pour votre profil",
        "meilleur_rapport_qualite_prix": "Meilleur rapport qualité/prix",
        "meilleur_potentiel": "Meilleur potentiel",
        "meilleure_qualite_vie": "Meilleure qualité de vie",
        "meilleur_rendement": "Meilleur rendement",
    }
    return {
        "profile": req.profile,
        "scoring_version": SCORING_VERSION,
        "zones": zones,
        "badges": badges,
        "badge_labels": badge_labels,
    }
