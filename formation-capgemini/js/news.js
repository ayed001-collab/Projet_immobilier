/* =========================================================================
   news.js — Onglet « Actualités & Veille du secteur » (page utilisateur).
   Affiche les articles publiés sous forme de cartes. Les données proviennent
   de la base (serveur en mode connecté, localStorage sinon) : le site source
   n'est jamais recontacté à l'affichage.
   ========================================================================= */
window.FC = window.FC || {};

FC.news = (function () {
  const E = (s) => FC.ui.esc(s);

  // Image générique « Actualités Assurance » (SVG inline, sans dépendance).
  const FALLBACK_IMG =
    "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'>
        <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stop-color='#12406b'/><stop offset='.6' stop-color='#0070AD'/><stop offset='1' stop-color='#12ABDB'/>
        </linearGradient></defs>
        <rect width='640' height='360' fill='url(#g)'/>
        <g fill='none' stroke='#ffffff' stroke-opacity='.9' stroke-width='6'>
          <rect x='210' y='120' width='220' height='150' rx='8'/>
          <line x1='236' y1='150' x2='360' y2='150'/><line x1='236' y1='178' x2='404' y2='178'/>
          <line x1='236' y1='206' x2='404' y2='206'/><line x1='236' y1='234' x2='330' y2='234'/>
        </g>
        <text x='320' y='312' fill='#ffffff' font-family='Segoe UI, Arial, sans-serif' font-size='24' font-weight='700' text-anchor='middle'>Actualités Assurance</text>
      </svg>`);

  function render(container) {
    container.innerHTML = `
      <section class="hero">
        <div class="container">
          <h1>Actualités &amp; Veille du secteur</h1>
          <p>Une sélection d'articles externes sur le secteur de l'assurance, partagés par l'équipe.</p>
        </div>
      </section>

      ${FC.ui.tabsBar("actualites")}

      <main class="container">
        <div class="catalogue-meta">
          <h2>Derniers articles</h2>
          <span class="count" id="news-count"></span>
        </div>
        <div id="news-list"><div class="empty">Chargement…</div></div>
      </main>`;

    load(container);
  }

  async function load(container) {
    const box = container.querySelector("#news-list");
    const countEl = container.querySelector("#news-count");
    let articles = [];
    try {
      articles = await FC.data.newsPublic();
    } catch (e) {
      box.innerHTML = `<div class="empty">Les actualités sont momentanément indisponibles.</div>`;
      return;
    }
    if (countEl) countEl.textContent = articles.length + " article" + (articles.length > 1 ? "s" : "");

    if (!articles.length) {
      box.innerHTML = `<div class="empty">Aucune actualité disponible pour le moment.</div>`;
      return;
    }

    box.innerHTML = `<div class="news-grid">${articles.map(card).join("")}</div>`;

    // Fallback image (wiring JS, pas d'attribut inline -> compatible CSP).
    box.querySelectorAll("img.news-card__img").forEach((img) => {
      img.addEventListener("error", () => {
        if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
      }, { once: true });
    });
  }

  function card(a) {
    const img = a.imageUrl ? E(a.imageUrl) : FALLBACK_IMG;
    const meta = [a.source ? E(a.source) : "", formatDate(a.publishedAt)].filter(Boolean).join(" · ");
    return `
      <article class="news-card">
        <div class="news-card__media">
          <img class="news-card__img" src="${img}" alt="" loading="lazy" referrerpolicy="no-referrer" />
        </div>
        <div class="news-card__body">
          ${meta ? `<div class="news-card__meta">${meta}</div>` : ""}
          <h3 class="news-card__title">${E(a.title || "(Sans titre)")}</h3>
          ${a.description ? `<p class="news-card__desc">${E(a.description)}</p>` : ""}
          <a class="news-card__link" href="${E(a.url)}" target="_blank" rel="noopener noreferrer">Lire l'article →</a>
        </div>
      </article>`;
  }

  /** Formate une date ISO ou "AAAA-MM-JJ" en date française lisible ; "" sinon. */
  function formatDate(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }

  return { render, FALLBACK_IMG };
})();
