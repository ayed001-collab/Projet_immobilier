/* =========================================================================
   ui.js — Helpers de rendu partagés (échappement, badges, icônes)
   ========================================================================= */
window.FC = window.FC || {};

FC.ui = (function () {
  /** Échappe le HTML pour éviter toute injection depuis le contenu JSON. */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /** Badge de niveau (conceptuel / spécialisé). */
  function badgeNiveau(niveau) {
    return `<span class="badge badge--${esc(niveau)}">${esc(FC.data.niveauLibelle(niveau))}</span>`;
  }

  /** Badge de type (connaissance générale / acte de gestion). */
  function badgeType(type) {
    return `<span class="badge badge--${esc(type)}">${esc(FC.data.typeLibelle(type))}</span>`;
  }

  /** Ensemble des badges d'un thème (+ pastille "thème pilote" éventuelle). */
  function badges(theme) {
    let html = badgeNiveau(theme.niveau) + badgeType(theme.type);
    if (theme.sections && theme.sections.quiz) {
      // rien
    }
    if (theme.themePilote) {
      html += `<span class="badge badge--pilote">Fiche modèle</span>`;
    }
    return html;
  }

  return { esc, badgeNiveau, badgeType, badges };
})();
