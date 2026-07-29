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
import ipaddress
import json
import os
import re
import secrets
import socket
import threading
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

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
NEWS_FILE = STORAGE_DIR / "news.json"                 # articles d'actualité (veille secteur)

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
#   FORMATION_OPEN_ADMIN      si vrai (1/true/oui) : ADMIN OUVERT, aucune auth
#                             (pratique pour une démo ; à NE PAS laisser en prod).
# À défaut, des valeurs aléatoires sont générées au démarrage et affichées.
TOKEN_TTL = int(os.environ.get("FORMATION_TOKEN_TTL", 8 * 3600))  # 8 h par défaut

AUTH_DISABLED = (os.environ.get("FORMATION_OPEN_ADMIN") or "").strip().lower() in (
    "1", "true", "yes", "oui", "on")
AUTH_REQUIRED = not AUTH_DISABLED

ADMIN_PASSWORD = (os.environ.get("FORMATION_ADMIN_PASSWORD") or "").strip()
if AUTH_DISABLED:
    ADMIN_PASSWORD = ADMIN_PASSWORD or secrets.token_urlsafe(9)  # non utilisé en mode ouvert
    print("\n" + "!" * 66)
    print("  ESPACE ADMIN OUVERT — aucune authentification (FORMATION_OPEN_ADMIN).")
    print("  Toute personne accédant au service peut modifier le contenu.")
    print("  Retirez FORMATION_OPEN_ADMIN pour réactiver le mot de passe.")
    print("!" * 66 + "\n")
elif not ADMIN_PASSWORD:
    ADMIN_PASSWORD = secrets.token_urlsafe(9)
    print("\n" + "=" * 66)
    print("  ESPACE ADMIN — mot de passe généré (aucun FORMATION_ADMIN_PASSWORD) :")
    print("      " + ADMIN_PASSWORD)
    print("  Définissez FORMATION_ADMIN_PASSWORD pour fixer votre propre mot de passe.")
    print("=" * 66 + "\n")
else:
    print(f"  Espace admin : mot de passe défini via FORMATION_ADMIN_PASSWORD "
          f"(longueur {len(ADMIN_PASSWORD)}).")

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
    """Dépendance FastAPI : exige un jeton Bearer valide sur les écritures.
       En mode admin ouvert (FORMATION_OPEN_ADMIN), l'authentification est levée."""
    if AUTH_DISABLED:
        return
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


def load_news() -> list:
    if NEWS_FILE.exists():
        try:
            data = json.loads(NEWS_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (ValueError, OSError):
            return []
    return []


def save_news(items: list) -> None:
    tmp = NEWS_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(NEWS_FILE)  # écriture atomique


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
    return {"status": "ok", "mode": "connected", "authRequired": AUTH_REQUIRED}


@app.post("/api/login")
def login(payload: dict):
    """Échange un mot de passe contre un jeton de session signé."""
    password = str((payload or {}).get("password", "")).strip()
    # Comparaison en octets (temps constant) : tolère les accents et évite
    # l'échec silencieux dû à un espace / retour-ligne collé dans la variable.
    if not hmac.compare_digest(password.encode("utf-8"), ADMIN_PASSWORD.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect.")
    return {"token": make_token(), "expiresIn": TOKEN_TTL}


@app.get("/api/videos")
def list_videos():
    """Retourne la configuration des vidéos (surcharges serveur). Public (lecture)."""
    return {"videos": load_config(), "authRequired": AUTH_REQUIRED}


# --- Visibilité des formations (masquer / supprimer) -------------------------
_ALLOWED_STATUS = {"visible", "hidden", "deleted"}


@app.get("/api/formations")
def list_formations():
    """Statut de visibilité par thème (public : l'espace utilisateur en a besoin)."""
    return {"formations": load_formations(), "authRequired": AUTH_REQUIRED}


@app.put("/api/formations/{theme_id}", dependencies=[Depends(require_auth)])
def set_formation_status(theme_id: str, payload: dict):
    """Met à jour (fusion) l'état d'une formation :
       - status : visible / hidden / deleted
       - videoHidden / pageHidden : masquer les boutons de format (fondamentaux)
       Seuls les champs fournis sont modifiés. L'entrée par défaut (visible,
       aucun format masqué) n'est pas stockée."""
    payload = payload or {}
    with _lock:
        cfg = load_formations()
        entry = dict(cfg.get(theme_id, {}))

        if "status" in payload:
            status = payload["status"]
            if status not in _ALLOWED_STATUS:
                raise HTTPException(status_code=400, detail="Statut invalide.")
            if status == "visible":
                entry.pop("status", None)     # visible = défaut
            else:
                entry["status"] = status

        for flag in ("videoHidden", "pageHidden"):
            if flag in payload:
                if payload[flag]:
                    entry[flag] = True
                else:
                    entry.pop(flag, None)     # False = défaut

        if entry:
            cfg[theme_id] = entry
        else:
            cfg.pop(theme_id, None)           # entrée entièrement par défaut -> supprimée
        save_formations(cfg)
    return {"entry": entry}


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


# --- Actualités & veille du secteur ------------------------------------------
FETCH_TIMEOUT = 6          # secondes
FETCH_MAX_BYTES = 1_000_000  # 1 Mo lus au maximum
_UA = "Mozilla/5.0 (compatible; FormationVeilleBot/1.0)"


def _norm_url(u: str) -> str:
    return (u or "").strip().rstrip("/")


def _host_blocked(host: str) -> bool:
    """Bloque localhost et les plages IP privées / internes (anti-SSRF minimal)."""
    if not host:
        return True
    low = host.lower()
    if low == "localhost" or low.endswith(".local") or low.endswith(".internal"):
        return True
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return True
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return True
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                or ip.is_multicast or ip.is_unspecified):
            return True
    return False


def validate_stored_url(u: str):
    """Validation de format pour une URL simplement STOCKÉE (create/update) :
       http/https, hôte présent, pas de localhost ni d'IP interne littérale.
       Ne résout pas le DNS (le stockage ne contacte pas le site)."""
    p = urlparse((u or "").strip())
    if p.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="URL invalide : seuls http:// et https:// sont autorisés.")
    if not p.hostname:
        raise HTTPException(status_code=400, detail="URL invalide.")
    low = p.hostname.lower()
    if low == "localhost" or low.endswith(".local") or low.endswith(".internal"):
        raise HTTPException(status_code=400, detail="URL interne ou non autorisée.")
    try:
        ip = ipaddress.ip_address(p.hostname)  # hôte = adresse IP littérale ?
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                or ip.is_multicast or ip.is_unspecified):
            raise HTTPException(status_code=400, detail="URL interne ou non autorisée.")
    except ValueError:
        pass  # nom d'hôte (pas une IP) : accepté sans résolution DNS
    return p


def validate_public_url(u: str):
    """Validation renforcée avant une REQUÊTE serveur (fetch métadonnées) :
       format + résolution DNS bloquant les cibles internes (anti-SSRF)."""
    p = validate_stored_url(u)
    if _host_blocked(p.hostname):
        raise HTTPException(status_code=400, detail="URL interne ou non autorisée.")
    return p


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    """Revalide chaque redirection (empêche un rebond vers une cible interne)."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        p = urlparse(newurl)
        if p.scheme not in ("http", "https") or _host_blocked(p.hostname or ""):
            raise urllib.error.URLError("redirection bloquée")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class _MetaParser(HTMLParser):
    """Extrait les métadonnées Open Graph + fallbacks HTML classiques."""
    def __init__(self):
        super().__init__()
        self.meta = {}
        self._in_title = False
        self.title_text = ""

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "meta":
            key = (a.get("property") or a.get("name") or "").lower()
            if key and "content" in a and key not in self.meta:
                self.meta[key] = a["content"].strip()
        elif tag == "link":
            rel = (a.get("rel") or "").lower()
            if "image_src" in rel and a.get("href") and "link:image_src" not in self.meta:
                self.meta["link:image_src"] = a["href"].strip()
        elif tag == "title":
            self._in_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title_text += data


def parse_metadata(html: str, url: str) -> dict:
    """Priorité aux balises og:* ; fallback sur <title>, meta description, domaine."""
    p = _MetaParser()
    try:
        p.feed(html)
    except Exception:
        pass
    m = p.meta
    title = m.get("og:title") or m.get("twitter:title") or (p.title_text or "").strip()
    description = m.get("og:description") or m.get("twitter:description") or m.get("description") or ""
    image = (m.get("og:image") or m.get("og:image:url") or m.get("og:image:secure_url")
             or m.get("twitter:image") or m.get("twitter:image:src") or m.get("link:image_src") or "")
    source = m.get("og:site_name") or (urlparse(url).hostname or "").replace("www.", "")
    published = m.get("article:published_time") or m.get("og:article:published_time") or ""
    if image:
        image = urljoin(url, image)  # résout les URL d'image relatives
    return {
        "title": title.strip(),
        "description": description.strip(),
        "imageUrl": image.strip(),
        "source": source.strip(),
        "publishedAt": published.strip(),
    }


def fetch_metadata(url: str) -> dict:
    validate_public_url(url)
    opener = urllib.request.build_opener(_SafeRedirect)
    req = urllib.request.Request(url, headers={"User-Agent": _UA, "Accept": "text/html,*/*"})
    try:
        with opener.open(req, timeout=FETCH_TIMEOUT) as resp:
            ctype = resp.headers.get("Content-Type", "")
            charset = "utf-8"
            if "charset=" in ctype:
                charset = ctype.split("charset=")[-1].split(";")[0].strip() or "utf-8"
            raw = resp.read(FETCH_MAX_BYTES)
    except HTTPException:
        raise
    except (urllib.error.URLError, socket.timeout, ValueError, OSError) as e:
        raise HTTPException(status_code=502, detail=f"Impossible de récupérer la page ({type(e).__name__}).")
    try:
        html = raw.decode(charset, errors="replace")
    except (LookupError, UnicodeDecodeError):
        html = raw.decode("utf-8", errors="replace")
    return parse_metadata(html, url)


def _public_articles(items):
    pub = [a for a in items if a.get("isPublished")]
    pub.sort(key=lambda a: (a.get("publishedAt") or a.get("createdAt") or ""), reverse=True)
    return pub


@app.post("/api/news/fetch-metadata", dependencies=[Depends(require_auth)])
def news_fetch_metadata(payload: dict):
    """Récupère les métadonnées d'un article à partir de son URL (côté serveur)."""
    return fetch_metadata((payload or {}).get("url", ""))


@app.get("/api/news")
def news_public():
    """Articles publiés, du plus récent au plus ancien (public)."""
    return {"articles": _public_articles(load_news())}


@app.get("/api/admin/news", dependencies=[Depends(require_auth)])
def news_all():
    """Tous les articles (admin)."""
    items = load_news()
    items.sort(key=lambda a: a.get("createdAt") or "", reverse=True)
    return {"articles": items}


@app.post("/api/news", dependencies=[Depends(require_auth)])
def news_create(payload: dict):
    payload = payload or {}
    url = _norm_url(payload.get("url"))
    validate_stored_url(url)
    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        items = load_news()
        if any(_norm_url(a.get("url")) == url for a in items):
            raise HTTPException(status_code=409, detail="Cet article a déjà été ajouté.")
        article = {
            "id": uuid.uuid4().hex[:12],
            "title": (payload.get("title") or "").strip(),
            "description": (payload.get("description") or "").strip(),
            "url": url,
            "imageUrl": (payload.get("imageUrl") or "").strip(),
            "source": (payload.get("source") or "").strip(),
            "publishedAt": (payload.get("publishedAt") or "").strip(),
            "isPublished": bool(payload.get("isPublished", False)),
            "createdAt": now,
        }
        items.append(article)
        save_news(items)
    return article


@app.put("/api/news/{article_id}", dependencies=[Depends(require_auth)])
def news_update(article_id: str, payload: dict):
    payload = payload or {}
    with _lock:
        items = load_news()
        art = next((a for a in items if a.get("id") == article_id), None)
        if not art:
            raise HTTPException(status_code=404, detail="Article introuvable.")
        if "url" in payload:
            new_url = _norm_url(payload["url"])
            validate_stored_url(new_url)
            if any(a.get("id") != article_id and _norm_url(a.get("url")) == new_url for a in items):
                raise HTTPException(status_code=409, detail="Cet article a déjà été ajouté.")
            art["url"] = new_url
        for k in ("title", "description", "imageUrl", "source", "publishedAt"):
            if k in payload:
                art[k] = (payload[k] or "").strip()
        if "isPublished" in payload:
            art["isPublished"] = bool(payload["isPublished"])
        save_news(items)
    return art


@app.delete("/api/news/{article_id}", dependencies=[Depends(require_auth)])
def news_delete(article_id: str):
    with _lock:
        items = load_news()
        kept = [a for a in items if a.get("id") != article_id]
        save_news(kept)
    return JSONResponse({"removed": article_id, "existed": len(kept) != len(items)})


# --- Front statique ----------------------------------------------------------
# Monté en dernier (à la racine) : les routes /api/* définies au-dessus priment.
# Sert index.html, css/, js/, data/, assets/ (dont les vidéos uploadées).
app.mount("/", StaticFiles(directory=str(FRONTEND_ROOT), html=True), name="static")
