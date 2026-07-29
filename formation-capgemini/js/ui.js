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

  /**
   * Barre d'onglets principale de l'écran d'accueil, partagée entre le
   * catalogue et la page Veille : deux parcours + « Veille sectorielle ».
   * @param {string} active - id de l'onglet actif : parcours id ou "actualites".
   */
  function tabsBar(active) {
    const items = FC.data.parcours().map((p) => ({ href: "#/" + p.id, id: p.id, label: p.libelle }));
    items.push({ href: "#/actualites", id: "actualites", label: "Veille sectorielle" });
    return `<div class="tabs-bar"><div class="container">
      <nav class="tabs" role="tablist">
        ${items.map((it) => `<a class="tab ${it.id === active ? "active" : ""}" role="tab" href="${esc(it.href)}">${esc(it.label)}</a>`).join("")}
      </nav>
    </div></div>`;
  }

  /* ----------------------------------------------------------- Durées vidéo */

  /** Formate une durée en secondes -> "M:SS" ou "H:MM:SS". "" si invalide. */
  function fmtDuration(sec) {
    if (!isFinite(sec) || sec <= 0) return "";
    const s = Math.round(sec);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
  }

  /** Une durée saisie est-elle réelle (non vide, non nulle du type "0:00") ? */
  function isRealDuree(d) {
    if (!d) return false;
    const t = String(d).trim();
    return t !== "" && !/^0+([:.]0+)*$/.test(t);
  }

  /** Type de vidéo dont on peut lire la durée côté client (fichier / lien direct). */
  function isDetectable(v) {
    if (!v) return false;
    if (v.type === "youtube" || v.type === "vimeo") return false; // API tierce requise
    return true;
  }

  /**
   * Lit la durée d'un média (fichier/URL directe) via ses métadonnées.
   * Résout une chaîne formatée, ou "" si indisponible (garde-fou 8 s).
   */
  function detectDuration(src) {
    return new Promise((resolve) => {
      if (!src) return resolve("");
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      let done = false;
      const finish = (val) => {
        if (done) return; done = true;
        try { v.removeAttribute("src"); v.load(); } catch (e) {}
        resolve(val);
      };
      v.onloadedmetadata = () => finish(fmtDuration(v.duration));
      v.onerror = () => finish("");
      setTimeout(() => finish(""), 8000);
      v.src = src;
    });
  }

  return { esc, badgeNiveau, badgeType, badges, tabsBar, fmtDuration, isRealDuree, isDetectable, detectDuration };
})();
