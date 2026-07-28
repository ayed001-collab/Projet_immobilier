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
  };
})();
