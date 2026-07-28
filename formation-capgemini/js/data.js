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
     VIDÉOS
     L'application étant statique (sans backend), la configuration des vidéos
     gérée par l'admin est persistée côté navigateur (localStorage) et vient
     surcharger la vidéo éventuellement définie dans curriculum.json.
     Les fichiers uploadés en local sont lus via la File API et jouables le
     temps de la session (blob), en attendant leur dépôt dans assets/videos/.
     --------------------------------------------------------------------- */
  const LS_KEY = "fc.videos.overrides";
  const _sessionBlobs = {}; // themeId -> objectURL (fichiers uploadés cette session)

  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveOverride(themeId, cfg) {
    const all = getOverrides();
    if (cfg == null) delete all[themeId]; else all[themeId] = cfg;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }
  function setSessionBlob(themeId, objectUrl) { _sessionBlobs[themeId] = objectUrl; }
  function sessionBlob(themeId) { return _sessionBlobs[themeId] || null; }

  /**
   * Vidéo effective d'un thème : surcharge admin (localStorage) si présente,
   * sinon la vidéo du référentiel. Retourne null si aucune vidéo.
   */
  function getVideo(theme) {
    const ov = getOverrides()[theme.id];
    const base = ov || theme.video || null;
    if (!base) return null;
    const v = Object.assign({}, base);
    // Un fichier uploadé cette session prime pour la lecture immédiate.
    const blob = sessionBlob(theme.id);
    if (blob) v.playSrc = blob; else v.playSrc = v.src;
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
    getOverrides, saveOverride, setSessionBlob, sessionBlob,
  };
})();
