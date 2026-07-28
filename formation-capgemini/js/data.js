/* =========================================================================
   data.js — Chargement et indexation du référentiel (curriculum.json)
   Les contenus sont totalement découplés du code : enrichir le JSON suffit.
   ========================================================================= */
window.FC = window.FC || {};

FC.data = (function () {
  let _curriculum = null;      // objet brut du JSON
  const _themeById = {};       // index id -> thème
  const _domaineById = {};     // index id -> domaine
  const _sousDomaineById = {}; // index "domaineId/sousDomaineId" -> sous-domaine

  /** Charge le référentiel une seule fois et construit les index. */
  async function load() {
    if (_curriculum) return _curriculum;
    const res = await fetch("data/curriculum.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("Impossible de charger le référentiel (HTTP " + res.status + ").");
    _curriculum = await res.json();

    _curriculum.domaines.forEach((d) => {
      _domaineById[d.id] = d;
      (d.sousDomaines || []).forEach((sd) => {
        _sousDomaineById[d.id + "/" + sd.id] = sd;
      });
    });
    _curriculum.themes.forEach((t) => { _themeById[t.id] = t; });

    // Détection du mode (backend connecté ou repli localStorage) + cache vidéos.
    await loadVideoConfig();
    return _curriculum;
  }

  const meta = () => _curriculum.meta;
  const themes = () => _curriculum.themes;
  const domaines = () => _curriculum.domaines;
  const themeById = (id) => _themeById[id] || null;
  const domaineById = (id) => _domaineById[id] || null;
  const sousDomaineById = (domaineId, sdId) => _sousDomaineById[domaineId + "/" + sdId] || null;

  const niveauLibelle = (id) =>
    (_curriculum.niveaux.find((n) => n.id === id) || { libelle: id }).libelle;
  const typeLibelle = (id) =>
    (_curriculum.types.find((t) => t.id === id) || { libelle: id }).libelle;

  /* ---------------------------------------------------------------------
     PARCOURS (onglets du catalogue)
     Deux parcours, dérivés directement du niveau des thèmes :
       - "fondamentaux" : Les fondamentaux de l'assurance (niveau conceptuel)
       - "expert"       : Parcours Expert (niveau spécialisé)
     --------------------------------------------------------------------- */
  const PARCOURS = [
    { id: "fondamentaux", libelle: "Les fondamentaux de l'assurance", niveau: "conceptuel",
      accroche: "Le socle de connaissances générales. Chaque thème est proposé en deux formats : une vidéo de formation ou une page web structurée." },
    { id: "expert", libelle: "Parcours Expert", niveau: "specialise",
      accroche: "Les actes de gestion opérationnels : parcours détaillés, règles de gestion, réglementation et points de vigilance." },
  ];
  const parcours = () => PARCOURS;
  const parcoursById = (id) => PARCOURS.find((p) => p.id === id) || PARCOURS[0];
  /** Parcours auquel appartient un thème (via son niveau). */
  const parcoursOfTheme = (theme) =>
    (PARCOURS.find((p) => p.niveau === theme.niveau) || PARCOURS[0]).id;

  /* ---------------------------------------------------------------------
     VIDÉOS — deux modes, transparents pour le reste de l'application :

     • MODE CONNECTÉ : si le backend (server/app.py) répond sur `api/videos`,
       les surcharges vidéo sont lues et écrites côté serveur. Les fichiers
       uploadés sont stockés sur disque (assets/videos/) et servis à tous :
       persistance réelle, partagée entre utilisateurs.

     • MODE LOCAL (repli) : sans backend, les surcharges sont persistées dans
       le navigateur (localStorage) et un fichier uploadé est jouable le temps
       de la session (blob), en attendant son dépôt manuel dans assets/videos/.

     Dans les deux cas, une surcharge prime sur la vidéo définie dans
     curriculum.json. Le cache `_overrides` est chargé une fois au démarrage.
     --------------------------------------------------------------------- */
  const API_BASE = "api";
  const LS_KEY = "fc.videos.overrides";
  const TOKEN_KEY = "fc.admin.token";
  const _sessionBlobs = {};   // themeId -> objectURL (fichiers uploadés, mode local)
  let _apiAvailable = false;   // le backend répond-il ?
  let _authRequired = false;   // le backend exige-t-il une authentification pour écrire ?
  let _overrides = {};         // cache des surcharges (serveur ou localStorage)

  const readLocal = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) { return {}; }
  };
  const writeLocal = () => localStorage.setItem(LS_KEY, JSON.stringify(_overrides));

  /** Détecte le mode et initialise le cache des surcharges. */
  async function loadVideoConfig() {
    try {
      const res = await fetch(API_BASE + "/videos", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        _apiAvailable = true;
        _authRequired = !!data.authRequired;
        _overrides = data.videos || {};
        return;
      }
    } catch (e) { /* backend absent -> repli */ }
    _apiAvailable = false;
    _authRequired = false;
    _overrides = readLocal();
  }

  const isConnected = () => _apiAvailable;
  function getOverrides() { return _overrides; }
  function setSessionBlob(themeId, objectUrl) { _sessionBlobs[themeId] = objectUrl; }
  function sessionBlob(themeId) { return _sessionBlobs[themeId] || null; }

  /* ---- Authentification admin (mode connecté) ---------------------------- */
  const authRequired = () => _authRequired;
  function getToken() { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  const isAuthed = () => !!getToken();
  function logout() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function authHeaders() { const t = getToken(); return t ? { Authorization: "Bearer " + t } : {}; }

  /** Échange un mot de passe contre un jeton de session. */
  async function login(password) {
    const res = await fetch(API_BASE + "/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw await httpError(res, "Échec de la connexion");
    const data = await res.json();
    try { sessionStorage.setItem(TOKEN_KEY, data.token); } catch (e) {}
    return true;
  }

  /** Construit une erreur ; sur 401, purge le jeton et marque err.auth. */
  async function httpError(res, fallback) {
    const err = new Error(await errText(res, fallback));
    if (res.status === 401) { logout(); err.auth = true; }
    return err;
  }

  /** Enregistre une vidéo par URL (YouTube / Vimeo / lien direct). */
  async function setVideoUrl(themeId, cfg) {
    if (_apiAvailable) {
      const res = await fetch(API_BASE + "/videos/" + encodeURIComponent(themeId), {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw await httpError(res, "Échec de l'enregistrement");
      _overrides[themeId] = await res.json();
    } else {
      _overrides[themeId] = { type: cfg.type, src: cfg.src, titre: cfg.titre, duree: cfg.duree };
      writeLocal();
    }
  }

  /** Upload d'un fichier vidéo. Mode connecté = persistance serveur ; sinon session. */
  async function uploadVideoFile(themeId, file, meta) {
    if (_apiAvailable) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("titre", (meta && meta.titre) || "");
      fd.append("duree", (meta && meta.duree) || "");
      const res = await fetch(API_BASE + "/videos/" + encodeURIComponent(themeId) + "/upload", {
        method: "POST", headers: authHeaders(), body: fd,
      });
      if (!res.ok) throw await httpError(res, "Échec de l'upload");
      _overrides[themeId] = await res.json();
      delete _sessionBlobs[themeId]; // le serveur sert désormais le fichier
    } else {
      _sessionBlobs[themeId] = URL.createObjectURL(file);
      _overrides[themeId] = {
        type: "fichier", src: "assets/videos/" + file.name,
        titre: (meta && meta.titre) || "", duree: (meta && meta.duree) || "", pendingUpload: true,
      };
      writeLocal();
    }
  }

  /** Retire la vidéo d'un thème. */
  async function removeVideo(themeId) {
    if (_apiAvailable) {
      const res = await fetch(API_BASE + "/videos/" + encodeURIComponent(themeId), {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) throw await httpError(res, "Échec de la suppression");
    }
    delete _overrides[themeId];
    delete _sessionBlobs[themeId];
    if (!_apiAvailable) writeLocal();
  }

  async function errText(res, fallback) {
    try { const j = await res.json(); return j.detail || `${fallback} (${res.status})`; }
    catch (e) { return `${fallback} (${res.status})`; }
  }

  /**
   * Vidéo effective d'un thème : surcharge (serveur ou local) si présente,
   * sinon la vidéo du référentiel. Retourne null si aucune vidéo.
   */
  function getVideo(theme) {
    const ov = _overrides[theme.id];
    const base = ov || theme.video || null;
    if (!base) return null;
    const v = Object.assign({}, base);
    // En mode local, un fichier uploadé cette session prime pour la lecture.
    const blob = sessionBlob(theme.id);
    v.playSrc = blob || v.src;
    return v;
  }

  /** Formats de restitution disponibles pour un thème. */
  function formats(theme) {
    return {
      page: hasPage(theme),
      video: !!getVideo(theme),
    };
  }
  /** Un thème a une "page" structurée dès qu'il possède au moins une section de contenu. */
  function hasPage(theme) {
    const s = theme.sections || {};
    return Object.keys(s).some((k) => {
      const v = s[k];
      return v != null && !(Array.isArray(v) && v.length === 0);
    });
  }

  /**
   * Filtre les thèmes selon les critères actifs.
   * @param {{q:string, domaine:string, niveau:string, type:string}} f
   */
  function filter(f) {
    const q = (f.q || "").trim().toLowerCase();
    return themes().filter((t) => {
      if (f.domaine && t.domaine !== f.domaine) return false;
      if (f.niveau && t.niveau !== f.niveau) return false;
      if (f.type && t.type !== f.type) return false;
      if (q) {
        const hay = (t.titre + " " + (t.resume || "") + " " +
          (domaineById(t.domaine) || {}).nom + " " +
          niveauLibelle(t.niveau) + " " + typeLibelle(t.type)).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  /** Fil d'Ariane textuel Domaine > Sous-domaine > Thème. */
  function breadcrumb(theme) {
    const d = domaineById(theme.domaine);
    const sd = sousDomaineById(theme.domaine, theme.sousDomaine);
    return {
      domaine: d ? d.nom : theme.domaine,
      sousDomaine: sd ? sd.nom : theme.sousDomaine,
      theme: theme.titre,
    };
  }

  return {
    load, meta, themes, domaines, themeById, domaineById, sousDomaineById,
    niveauLibelle, typeLibelle, filter, breadcrumb,
    parcours, parcoursById, parcoursOfTheme,
    getVideo, formats, hasPage,
    isConnected, getOverrides, setVideoUrl, uploadVideoFile, removeVideo,
    authRequired, isAuthed, login, logout,
  };
})();
