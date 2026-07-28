/* =========================================================================
   admin.js — Espace admin : gestion des vidéos des thèmes "Fondamentaux".
   Contexte : application statique (sans backend). La configuration des vidéos
   est persistée dans le navigateur (localStorage) et vient surcharger le
   référentiel. Deux modes d'ajout :
     1) URL hébergée (YouTube, Vimeo, ou lien direct .mp4) — utilisable de suite.
     2) Upload d'un fichier local — lu via la File API et jouable pendant la
        session ; pour une mise en ligne permanente, déposer le fichier dans
        assets/videos/ puis exporter la configuration vers curriculum.json.
   ========================================================================= */
window.FC = window.FC || {};

FC.admin = (function () {
  const E = (s) => FC.ui.esc(s);

  function render(container) {
    const fondamentaux = FC.data.themes().filter((t) => t.niveau === "conceptuel");

    container.innerHTML = `
      <main class="container fiche">
        <nav class="breadcrumb"><a href="#/fondamentaux">Catalogue</a><span class="sep">›</span><span class="current">Espace admin — Vidéos</span></nav>

        <header class="fiche__header">
          <div class="badges"><span class="badge badge--pilote">Admin</span></div>
          <h1>🎬 Gestion des vidéos de formation</h1>
          <div class="meta"><span>Associez une vidéo aux thèmes du parcours « Les fondamentaux de l'assurance ».</span></div>
        </header>

        <div class="admin-note">
          <strong>Application statique (sans serveur).</strong>
          Les vidéos configurées ici sont enregistrées dans <em>ce navigateur</em> et prennent effet immédiatement.
          Un fichier <em>uploadé</em> depuis votre poste est lisible pendant la session. Pour une diffusion permanente et
          partagée, déposez le fichier dans <code>assets/videos/</code> puis reportez la configuration dans
          <code>data/curriculum.json</code> (bouton <em>Exporter</em> ci-dessous).
        </div>

        <div class="admin-toolbar">
          <button class="btn btn--primary" id="export">⬇︎ Exporter la configuration (JSON)</button>
          <button class="btn" id="reset">↺ Réinitialiser (vider les surcharges locales)</button>
        </div>

        <div id="admin-list"></div>

        <span class="fiche__back" id="back">← Retour au catalogue</span>
      </main>`;

    renderList(container.querySelector("#admin-list"), fondamentaux);

    container.querySelector("#back").addEventListener("click", () => { location.hash = "#/fondamentaux"; });
    container.querySelector("#export").addEventListener("click", exportConfig);
    container.querySelector("#reset").addEventListener("click", () => {
      if (confirm("Vider toutes les vidéos configurées dans ce navigateur ?")) {
        Object.keys(FC.data.getOverrides()).forEach((id) => FC.data.saveOverride(id, null));
        renderList(container.querySelector("#admin-list"), fondamentaux);
      }
    });
  }

  function renderList(el, themes) {
    el.innerHTML = themes.map(row).join("");
    themes.forEach((t) => wireRow(el, t));
  }

  function row(t) {
    const v = FC.data.getVideo(t);
    const status = v
      ? `<span class="admin-status admin-status--on">Vidéo configurée${v.type ? ` · ${E(labelType(v))}` : ""}</span>`
      : `<span class="admin-status admin-status--off">Aucune vidéo</span>`;
    return `
      <section class="admin-card" data-id="${E(t.id)}">
        <div class="admin-card__head">
          <div>
            <h3>${E(t.titre)}</h3>
            <div class="card__crumb">${E((FC.data.domaineById(t.domaine) || {}).nom || "")}</div>
          </div>
          ${status}
        </div>

        <div class="admin-grid">
          <label>Titre de la vidéo
            <input type="text" data-f="titre" value="${E(v && v.titre || "")}" placeholder="Ex : Comprendre l'assurance-vie en 5 minutes" />
          </label>
          <label>Durée
            <input type="text" data-f="duree" value="${E(v && v.duree || "")}" placeholder="Ex : 8 min" />
          </label>
        </div>

        <div class="admin-source">
          <label class="admin-source__url">Lien vidéo (YouTube, Vimeo ou .mp4)
            <input type="url" data-f="src" value="${E(v && !isBlob(v) && v.src || "")}" placeholder="https://…" />
          </label>
          <div class="admin-source__sep">ou</div>
          <label class="admin-source__file">Fichier vidéo (local)
            <input type="file" data-f="file" accept="video/*" />
          </label>
        </div>

        <div class="admin-card__actions">
          <button class="btn btn--primary" data-a="save">Enregistrer</button>
          <button class="btn" data-a="preview">▶ Prévisualiser</button>
          <button class="btn btn--ghost" data-a="remove">Retirer</button>
        </div>
      </section>`;
  }

  function wireRow(el, t) {
    const card = el.querySelector(`.admin-card[data-id="${cssEscape(t.id)}"]`);
    if (!card) return;
    const get = (f) => card.querySelector(`[data-f="${f}"]`);

    card.querySelector('[data-a="save"]').addEventListener("click", () => {
      const titre = get("titre").value.trim();
      const duree = get("duree").value.trim();
      const url = get("src").value.trim();
      const fileInput = get("file");
      const file = fileInput.files && fileInput.files[0];

      if (file) {
        // Lecture locale via File API : jouable cette session (blob).
        const blobUrl = URL.createObjectURL(file);
        FC.data.setSessionBlob(t.id, blobUrl);
        FC.data.saveOverride(t.id, {
          type: "fichier",
          src: "assets/videos/" + file.name, // chemin cible pour une diffusion permanente
          titre, duree, pendingUpload: true,
        });
        toast(card, "Fichier chargé pour cette session. Déposez-le dans assets/videos/ puis exportez la configuration.");
      } else if (url) {
        FC.data.saveOverride(t.id, { type: detectType(url), src: url, titre, duree });
        toast(card, "Vidéo enregistrée.");
      } else {
        toast(card, "Renseignez un lien vidéo ou sélectionnez un fichier.", true);
        return;
      }
      renderList(el, FC.data.themes().filter((x) => x.niveau === "conceptuel"));
    });

    card.querySelector('[data-a="preview"]').addEventListener("click", () => {
      if (!FC.data.getVideo(t)) { toast(card, "Enregistrez d'abord une vidéo.", true); return; }
      location.hash = "#/video/" + t.id;
    });

    card.querySelector('[data-a="remove"]').addEventListener("click", () => {
      FC.data.saveOverride(t.id, null);
      renderList(el, FC.data.themes().filter((x) => x.niveau === "conceptuel"));
    });
  }

  /** Exporte les surcharges au format prêt à coller dans curriculum.json. */
  function exportConfig() {
    const ov = FC.data.getOverrides();
    // Nettoyage : on n'exporte que les champs pérennes.
    const out = {};
    Object.keys(ov).forEach((id) => {
      const v = ov[id];
      out[id] = { type: v.type, src: v.src };
      if (v.titre) out[id].titre = v.titre;
      if (v.duree) out[id].duree = v.duree;
    });
    const payload = {
      _comment: "Reporter chaque entrée dans le thème correspondant de curriculum.json, sous la clé \"video\". Déposer les fichiers dans assets/videos/.",
      videos: out,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "videos-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* --------------------------------------------------------------- utils */
  const isBlob = (v) => v && v.pendingUpload;
  function detectType(url) {
    if (/youtu\.?be/.test(url)) return "youtube";
    if (/vimeo\.com/.test(url)) return "vimeo";
    return "url";
  }
  function labelType(v) {
    if (v.pendingUpload) return "fichier (session)";
    return { youtube: "YouTube", vimeo: "Vimeo", url: "lien direct", fichier: "fichier" }[v.type] || v.type;
  }
  function cssEscape(s) { return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
  function toast(card, msg, isError) {
    let t = card.querySelector(".admin-toast");
    if (!t) { t = document.createElement("div"); t.className = "admin-toast"; card.appendChild(t); }
    t.textContent = msg;
    t.classList.toggle("admin-toast--err", !!isError);
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 4000);
  }

  return { render };
})();
