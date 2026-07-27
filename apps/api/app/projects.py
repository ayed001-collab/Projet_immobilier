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


def _snapshot(payload: dict) -> list[dict]:
    """Classement au moment de la sauvegarde : {zone_id, nom, rank, score}."""
    ranked = ranking.compute(
        payload.get("profile", "home"), payload.get("weights"),
        payload.get("budget"), payload.get("surface"),
    )
    return [
        {"zone_id": r["zone_id"], "nom_commune": r["nom_commune"], "rank": r["rank"], "score": r["score"]}
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
