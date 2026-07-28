/* =========================================================================
   catalogue.js — Page d'accueil : catalogue navigable, filtres, recherche
   ========================================================================= */
window.FC = window.FC || {};

FC.catalogue = (function () {
  const esc = () => FC.ui.esc;

  // État courant des filtres (reflété partiellement dans l'URL via la recherche libre).
  const state = { q: "", domaine: "", niveau: "", type: "" };

  /** Rendu complet de la vue catalogue dans le conteneur #view. */
  function render(container) {
    const meta = FC.data.meta();
    container.innerHTML = `
      <section class="hero">
        <div class="container">
          <h1>${FC.ui.esc(meta.titre)}</h1>
          <p>${FC.ui.esc(meta.description)}</p>
        </div>
      </section>

      <main class="container">
        <div class="toolbar">
          <div class="toolbar__search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="search" type="search" placeholder="Rechercher un thème, un acte de gestion, un domaine…" aria-label="Recherche" />
          </div>
          <div class="filters" id="filters"></div>
        </div>

        <div class="catalogue-meta">
          <h2>Référentiel de formation</h2>
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

  /** Barre de filtres à puces (domaine / niveau / type). */
  function renderFilters(el) {
    const domaines = FC.data.domaines();
    const niveaux = [
      { id: "conceptuel", libelle: "Conceptuel" },
      { id: "specialise", libelle: "Spécialisé" },
    ];
    const types = [
      { id: "connaissance-generale", libelle: "Connaissance générale" },
      { id: "acte-de-gestion", libelle: "Acte de gestion" },
    ];

    const group = (label, key, items) => `
      <div class="filter-group">
        <label>${label}</label>
        <div class="chips" data-key="${key}">
          <button class="chip ${state[key] === "" ? "active" : ""}" data-val="">Tous</button>
          ${items.map((i) => `<button class="chip ${state[key] === i.id ? "active" : ""}" data-val="${FC.ui.esc(i.id)}">${FC.ui.esc(i.libelle || i.nom)}</button>`).join("")}
        </div>
      </div>`;

    el.innerHTML =
      group("Domaine", "domaine", domaines.map((d) => ({ id: d.id, libelle: d.nom }))) +
      group("Niveau", "niveau", niveaux) +
      group("Type", "type", types);

    el.querySelectorAll(".chips").forEach((chips) => {
      const key = chips.getAttribute("data-key");
      chips.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip");
        if (!btn) return;
        state[key] = btn.getAttribute("data-val");
        chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        renderResults(document.getElementById("view"));
      });
    });
  }

  /** Rendu des résultats, regroupés par domaine. */
  function renderResults(container) {
    const results = FC.data.filter(state);
    const countEl = container.querySelector("#count");
    const box = container.querySelector("#results");
    if (countEl) countEl.textContent = results.length + " thème" + (results.length > 1 ? "s" : "");

    if (!results.length) {
      box.innerHTML = `<div class="empty">Aucun thème ne correspond à votre recherche. Ajustez les filtres ou la recherche.</div>`;
      return;
    }

    // Regroupement par domaine, dans l'ordre du référentiel.
    const html = FC.data.domaines().map((d) => {
      const items = results.filter((t) => t.domaine === d.id);
      if (!items.length) return "";
      return `
        <section class="domain-block">
          <div class="domain-block__head">
            <span class="dot"></span>
            <div>
              <h3>${FC.ui.esc(d.nom)}</h3>
              <p>${FC.ui.esc(d.description || "")}</p>
            </div>
          </div>
          <div class="grid">
            ${items.map(card).join("")}
          </div>
        </section>`;
    }).join("");

    box.innerHTML = html;

    // Navigation vers la fiche au clic sur une carte.
    box.querySelectorAll(".card").forEach((c) => {
      c.addEventListener("click", () => { location.hash = "#/theme/" + c.getAttribute("data-id"); });
    });
  }

  /** Gabarit d'une carte de thème. */
  function card(t) {
    const bc = FC.data.breadcrumb(t);
    return `
      <article class="card" data-id="${FC.ui.esc(t.id)}" role="link" tabindex="0">
        <div class="card__badges">${FC.ui.badges(t)}</div>
        <div class="card__crumb">${FC.ui.esc(bc.domaine)} › ${FC.ui.esc(bc.sousDomaine)}</div>
        <h4 class="card__title">${FC.ui.esc(t.titre)}</h4>
        <p class="card__resume">${FC.ui.esc(t.resume || "")}</p>
        <div class="card__foot">
          <span>⏱️ ${FC.ui.esc(t.dureeEstimee || "—")}</span>
          <span class="card__link">Consulter la fiche →</span>
        </div>
      </article>`;
  }

  return { render };
})();
