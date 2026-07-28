"""
Backend d'upload persistant — Plate-forme de formation Capgemini.

Rôle :
  • servir le front statique (index.html, css, js, data, assets) ;
  • exposer une API de gestion des vidéos de formation ;
  • stocker durablement les fichiers uploadés dans assets/videos/ et la
    configuration (thème -> vidéo) dans server/storage/videos.json.

Ce backend est OPTIONNEL : le front fonctionne aussi en pur statique (repli
localStorage). Lorsqu'il est lancé, le front bascule automatiquement en
« mode connecté » : les vidéos uploadées sont persistées et partagées entre
tous les utilisateurs du serveur.

Lancement :
    cd formation-capgemini
    pip install -r server/requirements.txt
    uvicorn server.app:app --reload --port 8000
    # puis http://localhost:8000

Point d'évolution : remplacer les fonctions de stockage (save_upload / config)
par un backend objet type S3 sans toucher au front.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# --- Chemins -----------------------------------------------------------------
SERVER_DIR = Path(__file__).resolve().parent
FRONTEND_ROOT = SERVER_DIR.parent                     # dossier formation-capgemini/
VIDEO_DIR = FRONTEND_ROOT / "assets" / "videos"       # fichiers servis à assets/videos/<f>
STORAGE_DIR = SERVER_DIR / "storage"
CONFIG_FILE = STORAGE_DIR / "videos.json"             # mapping persistant thème -> vidéo
FORMATIONS_FILE = STORAGE_DIR / "formations.json"     # statut de visibilité par thème

VIDEO_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 500 * 1024 * 1024                  # garde-fou : 500 Mo / fichier
ALLOWED_EXT = {".mp4", ".webm", ".ogg", ".mov", ".m4v"}

_lock = threading.Lock()

# --- Authentification --------------------------------------------------------
# Seules les routes d'ÉCRITURE (upload, association, suppression) sont protégées.
# La consultation (front, vidéos, fichiers servis) reste publique.
#
# Configuration par variables d'environnement (recommandé en production) :
#   FORMATION_ADMIN_PASSWORD  mot de passe de l'espace admin
#   FORMATION_SECRET          secret de signature des jetons (partagé entre workers)
# À défaut, des valeurs aléatoires sont générées au démarrage et affichées.
TOKEN_TTL = int(os.environ.get("FORMATION_TOKEN_TTL", 8 * 3600))  # 8 h par défaut

ADMIN_PASSWORD = os.environ.get("FORMATION_ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    ADMIN_PASSWORD = secrets.token_urlsafe(9)
    print("\n" + "=" * 66)
    print("  ESPACE ADMIN — mot de passe généré (aucun FORMATION_ADMIN_PASSWORD) :")
    print("      " + ADMIN_PASSWORD)
    print("  Définissez FORMATION_ADMIN_PASSWORD pour fixer votre propre mot de passe.")
    print("=" * 66 + "\n")

_secret_env = os.environ.get("FORMATION_SECRET")
SECRET = (_secret_env or secrets.token_urlsafe(32)).encode("utf-8")
if not _secret_env:
    print("  (FORMATION_SECRET non défini : les sessions admin seront invalidées "
          "à chaque redémarrage du serveur.)\n")


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64d(txt: str) -> bytes:
    return base64.urlsafe_b64decode(txt + "=" * (-len(txt) % 4))


def make_token(ttl: int = TOKEN_TTL) -> str:
    """Jeton auto-porté : payload base64 + signature HMAC-SHA256."""
    body = _b64e(json.dumps({"exp": int(time.time()) + ttl}).encode("utf-8"))
    sig = _b64e(hmac.new(SECRET, body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{sig}"


def verify_token(token: str) -> bool:
    try:
        body, sig = token.split(".", 1)
        expected = _b64e(hmac.new(SECRET, body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return False
        return json.loads(_b64d(body)).get("exp", 0) >= int(time.time())
    except (ValueError, KeyError, json.JSONDecodeError):
        return False


def require_auth(authorization: str = Header(default="")) -> None:
    """Dépendance FastAPI : exige un jeton Bearer valide sur les écritures."""
    token = authorization[7:].strip() if authorization[:7].lower() == "bearer " else ""
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Authentification requise.")

# --- Persistance de la configuration ----------------------------------------
def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return {}
    return {}


def save_config(cfg: dict) -> None:
    tmp = CONFIG_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(CONFIG_FILE)  # écriture atomique


def load_formations() -> dict:
    if FORMATIONS_FILE.exists():
        try:
            return json.loads(FORMATIONS_FILE.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return {}
    return {}


def save_formations(cfg: dict) -> None:
    tmp = FORMATIONS_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(FORMATIONS_FILE)  # écriture atomique


def safe_name(theme_id: str, original: str) -> str:
    """Nom de fichier sûr, préfixé par le thème pour éviter les collisions."""
    base = re.sub(r"[^A-Za-z0-9._-]", "_", Path(original).name).strip("._") or "video"
    tid = re.sub(r"[^A-Za-z0-9._-]", "_", theme_id)
    return f"{tid}__{base}"


# --- API ---------------------------------------------------------------------
app = FastAPI(title="Formation Capgemini — API vidéos", version="1.0.0")

# CORS permissif : permet de servir le front sur un autre port en développement.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "connected", "authRequired": True}


@app.post("/api/login")
def login(payload: dict):
    """Échange un mot de passe contre un jeton de session signé."""
    password = (payload or {}).get("password", "")
    if not hmac.compare_digest(str(password), ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect.")
    return {"token": make_token(), "expiresIn": TOKEN_TTL}


@app.get("/api/videos")
def list_videos():
    """Retourne la configuration des vidéos (surcharges serveur). Public (lecture)."""
    return {"videos": load_config(), "authRequired": True}


# --- Visibilité des formations (masquer / supprimer) -------------------------
_ALLOWED_STATUS = {"visible", "hidden", "deleted"}


@app.get("/api/formations")
def list_formations():
    """Statut de visibilité par thème (public : l'espace utilisateur en a besoin)."""
    return {"formations": load_formations(), "authRequired": True}


@app.put("/api/formations/{theme_id}", dependencies=[Depends(require_auth)])
def set_formation_status(theme_id: str, payload: dict):
    """Définit le statut d'une formation : visible / hidden / deleted."""
    status = (payload or {}).get("status", "visible")
    if status not in _ALLOWED_STATUS:
        raise HTTPException(status_code=400, detail="Statut invalide.")
    with _lock:
        cfg = load_formations()
        if status == "visible":
            cfg.pop(theme_id, None)          # visible = état par défaut, pas de surcharge
        else:
            cfg[theme_id] = {"status": status}
        save_formations(cfg)
    return {"status": status}


@app.put("/api/videos/{theme_id}", dependencies=[Depends(require_auth)])
def set_video(theme_id: str, payload: dict):
    """Associe une vidéo par URL (YouTube / Vimeo / lien direct)."""
    src = (payload or {}).get("src", "").strip()
    if not src:
        raise HTTPException(status_code=400, detail="Champ 'src' requis.")
    cfg_entry = {
        "type": payload.get("type") or _detect_type(src),
        "src": src,
        "titre": payload.get("titre", ""),
        "duree": payload.get("duree", ""),
    }
    with _lock:
        cfg = load_config()
        cfg[theme_id] = cfg_entry
        save_config(cfg)
    return cfg_entry


@app.post("/api/videos/{theme_id}/upload", dependencies=[Depends(require_auth)])
async def upload_video(
    theme_id: str,
    file: UploadFile = File(...),
    titre: str = Form(""),
    duree: str = Form(""),
):
    """Upload d'un fichier vidéo -> stockage disque + config persistante."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Extension non autorisée ({ext or 'inconnue'}). Formats: {', '.join(sorted(ALLOWED_EXT))}.",
        )

    dest_name = safe_name(theme_id, file.filename or f"video{ext}")
    dest_path = VIDEO_DIR / dest_name

    # Écriture en flux, avec garde-fou de taille.
    size = 0
    with dest_path.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                dest_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 500 Mo).")
            out.write(chunk)

    cfg_entry = {
        "type": "fichier",
        "src": f"assets/videos/{dest_name}",
        "titre": titre,
        "duree": duree,
    }
    with _lock:
        cfg = load_config()
        # Si une ancienne vidéo uploadée existait pour ce thème, on la supprime.
        _delete_owned_file(cfg.get(theme_id))
        cfg[theme_id] = cfg_entry
        save_config(cfg)
    return cfg_entry


@app.delete("/api/videos/{theme_id}", dependencies=[Depends(require_auth)])
def delete_video(theme_id: str):
    """Retire la vidéo d'un thème (et supprime le fichier s'il a été uploadé)."""
    with _lock:
        cfg = load_config()
        entry = cfg.pop(theme_id, None)
        _delete_owned_file(entry)
        save_config(cfg)
    return JSONResponse({"removed": theme_id, "existed": entry is not None})


def _delete_owned_file(entry) -> None:
    """Supprime le fichier disque uniquement s'il est stocké sous assets/videos/."""
    if not entry:
        return
    src = entry.get("src", "")
    if src.startswith("assets/videos/"):
        target = (FRONTEND_ROOT / src).resolve()
        try:
            if VIDEO_DIR.resolve() in target.parents and target.exists():
                target.unlink()
        except OSError:
            pass


def _detect_type(url: str) -> str:
    if re.search(r"youtu\.?be", url):
        return "youtube"
    if "vimeo.com" in url:
        return "vimeo"
    return "url"


# --- Front statique ----------------------------------------------------------
# Monté en dernier (à la racine) : les routes /api/* définies au-dessus priment.
# Sert index.html, css/, js/, data/, assets/ (dont les vidéos uploadées).
app.mount("/", StaticFiles(directory=str(FRONTEND_ROOT), html=True), name="static")
