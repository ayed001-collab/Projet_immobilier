/* =========================================================================
   video.js — Vue lecteur : lecture de la vidéo de formation d'un thème.
   Supporte : fichier / URL directe (<video>), YouTube et Vimeo (iframe).
   ========================================================================= */
window.FC = window.FC || {};

FC.video = (function () {
  const E = (s) => FC.ui.esc(s);

  function render(container, theme) {
    const bc = FC.data.breadcrumb(theme);
    const v = FC.data.getVideo(theme);
    const hasPage = FC.data.hasPage(theme);

    container.innerHTML = `
      <main class="container fiche">
        <nav class="breadcrumb" aria-label="Fil d'Ariane">
          <a href="#/fondamentaux">Les fondamentaux</a><span class="sep">›</span>
          <span>${E(bc.domaine)}</span><span class="sep">›</span>
          <span class="current">${E(bc.theme)}</span>
        </nav>

        <header class="fiche__header">
          <div class="badges">${FC.ui.badges(theme)}</div>
          <h1>🎬 ${E(theme.titre)}</h1>
          <div class="meta"><span>Vidéo de formation${v && v.duree ? ` · ${E(v.duree)}` : ""}</span></div>
        </header>

        <section class="section">
          <div class="video-frame">${player(v)}</div>
          ${v && v.titre ? `<p class="schema-note" style="margin-top:12px">${E(v.titre)}</p>` : ""}
          <div class="video-actions">
            ${hasPage ? `<button class="fmt fmt--page" id="go-page"><span class="fmt__ico">📄</span><span class="fmt__txt">Consulter aussi la page de formation</span></button>` : ""}
            <span class="fiche__back" id="back">← Retour aux fondamentaux</span>
          </div>
        </section>
      </main>`;

    const back = container.querySelector("#back");
    if (back) back.addEventListener("click", () => { location.hash = "#/fondamentaux"; });
    const goPage = container.querySelector("#go-page");
    if (goPage) goPage.addEventListener("click", () => { location.hash = "#/theme/" + theme.id; });
  }

  /** Construit le lecteur selon le type de source. */
  function player(v) {
    if (!v || !v.playSrc) {
      return `<div class="empty" style="margin:0">Aucune vidéo n'est encore associée à ce thème.
        Un administrateur peut l'ajouter depuis l'<a href="#/admin">espace admin</a>.</div>`;
    }
    const src = v.playSrc;
    const type = detectType(v, src);

    if (type === "youtube") {
      const id = youtubeId(src);
      return `<iframe class="video-embed" src="https://www.youtube-nocookie.com/embed/${E(id)}"
        title="Vidéo de formation" frameborder="0" allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
    }
    if (type === "vimeo") {
      const id = vimeoId(src);
      return `<iframe class="video-embed" src="https://player.vimeo.com/video/${E(id)}"
        title="Vidéo de formation" frameborder="0" allowfullscreen
        allow="autoplay; fullscreen; picture-in-picture"></iframe>`;
    }
    // Fichier local (blob / assets/videos) ou URL directe .mp4
    return `<video class="video-embed" controls preload="metadata" src="${E(src)}"></video>`;
  }

  function detectType(v, src) {
    if (v.type === "youtube" || /youtu\.?be/.test(src)) return "youtube";
    if (v.type === "vimeo" || /vimeo\.com/.test(src)) return "vimeo";
    return "fichier";
  }
  function youtubeId(url) {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
    return m ? m[1] : url;
  }
  function vimeoId(url) {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : url;
  }

  return { render };
})();
