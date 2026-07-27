"""Projet immobilier persistant (docs/01 différenciateur, docs/15 F1.4).

Persistance légère via SQLite (stdlib, sans service externe). Un projet reçoit un
identifiant partageable ; il stocke les critères de l'utilisateur et un **snapshot**
du classement au moment de la sauvegarde. Au rechargement, on recalcule le
classement courant et on expose le **delta** par zone — socle du suivi dans le
temps et des futures alertes (RG-A).

Volontairement sans authentification lourde à ce stade : l'identifiant fait office
de clé d'accès (création de compte prévue en incrément ultérieur, docs/16).
"""
from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import data, ranking

DB_PATH = Path(os.getenv("PROJECTS_DB", str(Path(__file__).resolve().parents[1] / "projects.db")))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute(
        """CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            created_at TEXT, updated_at TEXT,
            payload TEXT, snapshot TEXT, snapshot_at TEXT, millesime_ref TEXT
        )"""
    )
    return con


def _millesime_ref() -> str | None:
    try:
        return data.manifest().get("run_finished")
    except Exception:
        return None


def _prix_by_zone() -> dict:
    return {
        f["properties"]["code_commune"]: (f["properties"].get("indicators", {}).get("prix_m2") or {}).get("value")
        for f in data.geojson()["features"]
    }


def _snapshot(payload: dict) -> list[dict]:
    """Classement figé à la sauvegarde (avec prix, pour expliquer les évolutions)."""
    ranked = ranking.compute(
        payload.get("profile", "home"), payload.get("weights"),
        payload.get("budget"), payload.get("surface"),
    )
    prix = _prix_by_zone()
    return [
        {
            "zone_id": r["zone_id"], "nom_commune": r["nom_commune"],
            "rank": r["rank"], "score": r["score"],
            "prix_m2": prix.get(r["zone_id"]),
            "bien_type_price": r.get("bien_type_price"),
            "within_budget": r.get("within_budget"),
        }
        for r in ranked
    ]


def create(payload: dict) -> dict:
    pid = uuid.uuid4().hex[:12]
    now = _now()
    snap = _snapshot(payload)
    with _conn() as con:
        con.execute(
            "INSERT INTO projects VALUES (?,?,?,?,?,?,?)",
            (pid, now, now, json.dumps(payload), json.dumps(snap), now, _millesime_ref()),
        )
    return get(pid)


def update(pid: str, payload: dict) -> dict | None:
    if _row(pid) is None:
        return None
    now = _now()
    snap = _snapshot(payload)  # nouvelle sauvegarde = nouvelle référence
    with _conn() as con:
        con.execute(
            "UPDATE projects SET updated_at=?, payload=?, snapshot=?, snapshot_at=?, millesime_ref=? WHERE id=?",
            (now, json.dumps(payload), json.dumps(snap), now, _millesime_ref(), pid),
        )
    return get(pid)


def _row(pid: str):
    with _conn() as con:
        cur = con.execute("SELECT * FROM projects WHERE id=?", (pid,))
        return cur.fetchone()


def get(pid: str) -> dict | None:
    row = _row(pid)
    if row is None:
        return None
    _, created_at, updated_at, payload_s, snap_s, snap_at, mref = row
    payload = json.loads(payload_s)
    snapshot = json.loads(snap_s)
    snap_by_zone = {s["zone_id"]: s for s in snapshot}

    # Classement courant + delta vs snapshot (suivi dans le temps).
    current = ranking.compute(
        payload.get("profile", "home"), payload.get("weights"),
        payload.get("budget"), payload.get("surface"),
    )
    for r in current:
        base = snap_by_zone.get(r["zone_id"])
        r["score_delta"] = (r["score"] - base["score"]) if base else None
        r["rank_delta"] = (base["rank"] - r["rank"]) if base else None  # + = progression

    return {
        "id": pid,
        "created_at": created_at,
        "updated_at": updated_at,
        "payload": payload,
        "snapshot": snapshot,
        "snapshot_at": snap_at,
        "millesime_ref": mref,
        "current_millesime": _millesime_ref(),
        "results": current,
    }


# Seuils de significativité des alertes (RG-A3 : anti-bruit).
SCORE_ALERT = 3       # points
PRICE_ALERT_PCT = 2.0  # %


def alerts(pid: str) -> dict | None:
    """Alertes expliquées : compare le snapshot du projet au classement courant.

    Détecte les évolutions significatives de prix, de score, de rang et de
    compatibilité budget (RG-A). Chaque alerte explique le facteur déclencheur.
    """
    row = _row(pid)
    if row is None:
        return None
    _, _, _, payload_s, snap_s, snap_at, mref = row
    payload = json.loads(payload_s)
    snapshot = {s["zone_id"]: s for s in json.loads(snap_s)}

    current = ranking.compute(
        payload.get("profile", "home"), payload.get("weights"),
        payload.get("budget"), payload.get("surface"),
    )
    prix_now = _prix_by_zone()
    profil = "résidence principale" if payload.get("profile") == "home" else "investissement"

    events: list[dict] = []
    for r in current:
        s = snapshot.get(r["zone_id"])
        if not s:
            continue
        nom = r["nom_commune"]

        # Évolution du prix
        p0, p1 = s.get("prix_m2"), prix_now.get(r["zone_id"])
        pct = round((p1 - p0) / p0 * 100, 1) if p0 and p1 else None
        if pct is not None and abs(pct) >= PRICE_ALERT_PCT:
            sign = "+" if pct > 0 else ""
            events.append({
                "type": "prix", "zone_id": r["zone_id"], "nom_commune": nom,
                "severity": abs(pct),
                "message": f"Prix à {nom} : {sign}{pct} % ({round(p0)} → {round(p1)} €/m²)",
            })

        # Évolution du score
        d = r["score"] - s["score"]
        if abs(d) >= SCORE_ALERT:
            sign = "+" if d > 0 else ""
            factor = ""
            if pct is not None and abs(pct) >= PRICE_ALERT_PCT:
                factor = f" — porté par l'évolution du prix ({'+' if pct > 0 else ''}{pct} %)"
            events.append({
                "type": "score", "zone_id": r["zone_id"], "nom_commune": nom,
                "severity": abs(d) + 5,  # priorité un peu supérieure au prix seul
                "message": f"{nom} : score {profil} {sign}{d} ({s['score']} → {r['score']}){factor}",
                "score_delta": d,
            })

        # Évolution du rang (anti-bruit : mouvements notables ou accession au #1)
        if s.get("rank") and r["rank"] != s["rank"]:
            rank_move = abs(s["rank"] - r["rank"])
            notable = rank_move >= 2 or (r["rank"] == 1 and s["rank"] != 1)
            if notable:
                better = r["rank"] < s["rank"]
                events.append({
                    "type": "rang", "zone_id": r["zone_id"], "nom_commune": nom,
                    "severity": rank_move,
                    "message": f"{nom} {'progresse' if better else 'recule'} : #{s['rank']} → #{r['rank']}",
                })

        # Entrée / sortie du budget
        if s.get("within_budget") is not None and r.get("within_budget") is not None \
                and s["within_budget"] != r["within_budget"]:
            entered = r["within_budget"]
            events.append({
                "type": "budget", "zone_id": r["zone_id"], "nom_commune": nom,
                "severity": 100,  # information forte
                "message": f"{nom} {'entre dans' if entered else 'sort de'} votre budget",
            })

    events.sort(key=lambda e: -e["severity"])
    return {
        "id": pid,
        "snapshot_at": snap_at,
        "snapshot_millesime": mref,
        "current_millesime": _millesime_ref(),
        "count": len(events),
        "events": events,
    }
