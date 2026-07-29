/* =========================================================================
   catalogue.js — Page d'accueil : deux parcours en onglets, filtres, recherche
     • Onglet "Les fondamentaux de l'assurance" (thèmes conceptuels) :
       cartes à double format de restitution (vidéo / page web structurée).
     • Onglet "Parcours Expert" (actes de gestion) : cartes -> fiche structurée.
   ========================================================================= */
window.FC = window.FC || {};

FC.catalogue = (function () {
  const E = (s) => FC.ui.esc(s);
  // État de la vue. `tab` = id du parcours courant.
  const state = { q: "", domaine: "", tab: "fondamentaux" };

  /** Rendu complet de la vue catalogue pour un parcours donné. */
  function render(container, tab) {
    if (tab) state.tab = tab;
    const meta = FC.data.meta();
    const current = FC.data.parcoursById(state.tab);

    container.innerHTML = `
      <section class="hero">
        <div class="container">
          <h1>${E(meta.titre)}</h1>
          <p>${E(meta.description)}</p>
        </div>
      </section>

      ${FC.ui.tabsBar(state.tab)}

      <main class="container">
        <p class="parcours-accroche">${E(current.accroche)}</p>

        <div class="toolbar">
          <div class="toolbar__search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="search" type="search" placeholder="Rechercher un thème, un domaine…" aria-label="Recherche" />
          </div>
          <div class="filters" id="filters"></div>
        </div>

        <div class="catalogue-meta">
          <h2>${E(current.libelle)}</h2>
          <span class="count" id="count"></span>
        </div>

        <div id="results"></div>
      </main>
    `;

    renderFilters(container.querySelector("#filters"));
    const search = container.querySelector("#search");
    search.value = state.q;
    search.addEventListener("input", (e) => { state.q = e.target.value; renderResults(container); });

    renderResults(container);
  }

  /** Filtre par domaine (le niveau est porté par l'onglet). */
  function renderFilters(el) {
    const domaines = FC.data.domaines();
    el.innerHTML = `
      <div class="filter-group">
        <label>Domaine</label>
        <div class="chips" data-key="domaine">
          <button class="chip ${state.domaine === "" ? "active" : ""}" data-val="">Tous</button>
          ${domaines.map((d) => `<button class="chip ${state.domaine === d.id ? "active" : ""}" data-val="${E(d.id)}">${E(d.nom)}</button>`).join("")}
        </div>
      </div>`;
    const chips = el.querySelector(".chips");
    chips.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state.domaine = btn.getAttribute("data-val");
      chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      renderResults(document.getElementById("view"));
    });
  }

  /** Résultats du parcours courant. */
  function renderResults(container) {
    const current = FC.data.parcoursById(state.tab);
    // Le parcours fixe le niveau ; on réutilise le moteur de filtre existant.
    // Espace utilisateur : on exclut les formations masquées ou supprimées par l'admin.
    const results = FC.data.filter({ q: state.q, domaine: state.domaine, niveau: current.niveau })
      .filter((t) => FC.data.isVisibleToUsers(t));

    const countEl = container.querySelector("#count");
    const box = container.querySelector("#results");
    if (countEl) countEl.textContent = results.length + " thème" + (results.length > 1 ? "s" : "");

    if (!results.length) {
      box.innerHTML = `<div class="empty">Aucun thème ne correspond à votre recherche dans ce parcours.</div>`;
      return;
    }

    const cardFn = state.tab === "fondamentaux" ? cardFondamental : cardExpert;

    // Regroupement par domaine, dans l'ordre du référentiel.
    box.innerHTML = FC.data.domaines().map((d) => {
      const items = results.filter((t) => t.domaine === d.id);
      if (!items.length) return "";
      return `
        <section class="domain-block">
          <div class="domain-block__head">
            <span class="dot"></span>
            <div>
              <h3>${E(d.nom)}</h3>
              <p>${E(d.description || "")}</p>
            </div>
          </div>
          <div class="grid">${items.map(cardFn).join("")}</div>
        </section>`;
    }).join("");

    wireCards(box);
  }

  /* ------------------------------------------------------------- Cartes */

  /** Carte "Parcours Expert" : accès direct à la fiche structurée. */
  function cardExpert(t) {
    const bc = FC.data.breadcrumb(t);
    return `
      <article class="card card--link" data-goto="#/theme/${E(t.id)}" role="link" tabindex="0">
        <div class="card__badges">${FC.ui.badges(t)}</div>
        <div class="card__crumb">${E(bc.domaine)} › ${E(bc.sousDomaine)}</div>
        <h4 class="card__title">${E(t.titre)}</h4>
        <p class="card__resume">${E(t.resume || "")}</p>
        <div class="card__foot">
          <span>⏱️ ${E(t.dureeEstimee || "—")}</span>
          <span class="card__link">Consulter la fiche →</span>
        </div>
      </article>`;
  }

  /** Carte "Fondamentaux" : deux formats de restitution (vidéo / page web).
   *  Chaque bouton peut être masqué indépendamment par l'admin. */
  function cardFondamental(t) {
    const bc = FC.data.breadcrumb(t);
    const f = FC.data.formats(t);
    const video = FC.data.getVideo(t);
    const showVideoBtn = FC.data.videoButtonVisible(t);
    const showPageBtn = FC.data.pageButtonVisible(t);

    let btnVideo = "";
    if (showVideoBtn) {
      if (f.video) {
        const real = FC.ui.isRealDuree(video && video.duree);
        // Durée affichée si réelle ; sinon détection auto à partir du média.
        const durAttr = (!real && FC.ui.isDetectable(video) && video.playSrc)
          ? ` data-detect="${E(video.playSrc)}"` : "";
        const durTxt = real ? ` · ${E(video.duree)}` : "";
        btnVideo = `<button class="fmt fmt--video" data-goto="#/video/${E(t.id)}">
             <span class="fmt__ico">▶</span>
             <span class="fmt__txt">Vidéo de formation<span class="fmt__dur"${durAttr}>${durTxt}</span></span>
           </button>`;
      } else {
        btnVideo = `<span class="fmt fmt--off" title="Vidéo non disponible — à ajouter par l'admin">
             <span class="fmt__ico">▶</span><span class="fmt__txt">Vidéo à venir</span>
           </span>`;
      }
    }

    const btnPage = (f.page && showPageBtn)
      ? `<button class="fmt fmt--page" data-goto="#/theme/${E(t.id)}">
           <span class="fmt__ico">📄</span>
           <span class="fmt__txt">Page de formation</span>
         </button>`
      : "";

    const formatsHtml = (btnVideo || btnPage)
      ? `<div class="formats">
           <span class="formats__label">Formats :</span>
           <div class="formats__btns">${btnVideo}${btnPage}</div>
         </div>`
      : `<div class="formats"><span class="formats__label formats__label--none">Aucun format disponible pour l'instant.</span></div>`;

    return `
      <article class="card card--dual">
        <div class="card__badges">${FC.ui.badges(t)}</div>
        <div class="card__crumb">${E(bc.domaine)} › ${E(bc.sousDomaine)}</div>
        <h4 class="card__title">${E(t.titre)}</h4>
        <p class="card__resume">${E(t.resume || "")}</p>
        <div class="card__foot"><span>⏱️ ${E(t.dureeEstimee || "—")}</span></div>
        ${formatsHtml}
      </article>`;
  }

  /* ------------------------------------------------------------- Interactions */

  function wireCards(box) {
    // Boutons/cartes portant un data-goto -> navigation par hash.
    box.querySelectorAll("[data-goto]").forEach((el) => {
      const handler = (e) => { e.stopPropagation(); location.hash = el.getAttribute("data-goto"); };
      el.addEventListener("click", handler);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") handler(e); });
    });

    // Détection auto de la durée (vidéos sans durée réelle enregistrée).
    box.querySelectorAll(".fmt__dur[data-detect]").forEach((span) => {
      const src = span.getAttribute("data-detect");
      FC.ui.detectDuration(src).then((d) => { if (d) span.textContent = " · " + d; });
    });
  }

  return { render };
})();
