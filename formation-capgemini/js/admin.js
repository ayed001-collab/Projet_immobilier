/* =========================================================================
   admin.js — Espace admin : gestion des vidéos des thèmes "Fondamentaux".

   Deux modes, détectés automatiquement (voir data.js) :
     • MODE CONNECTÉ (backend lancé) : upload et configuration persistés sur
       le serveur (assets/videos/ + storage/videos.json), partagés entre tous
       les utilisateurs.
     • MODE LOCAL (repli) : configuration en localStorage, fichier jouable le
       temps de la session, export JSON pour report manuel dans curriculum.json.
   ========================================================================= */
window.FC = window.FC || {};

FC.admin = (function () {
  const E = (s) => FC.ui.esc(s);
  const fond = () => FC.data.themes().filter((t) => t.niveau === "conceptuel");

  function render(container) {
    const connected = FC.data.isConnected();
    const note = connected
      ? `<div class="admin-note admin-note--ok">
           <strong>Mode connecté (backend actif).</strong>
           Les vidéos ajoutées ici sont <em>uploadées et stockées sur le serveur</em>
           (<code>assets/videos/</code>) et <em>visibles par tous les utilisateurs</em>.
           La persistance est réelle : aucune étape manuelle n'est nécessaire.
         </div>`
      : `<div class="admin-note">
           <strong>Mode local (sans backend).</strong>
           Les vidéos configurées ici sont enregistrées dans <em>ce navigateur</em>.
           Un fichier uploadé est lisible pendant la session. Pour une diffusion permanente,
           lancez le backend (<code>server/app.py</code>) ou déposez le fichier dans
           <code>assets/videos/</code> puis exportez la configuration.
         </div>`;

    const modeBadge = connected
      ? `<span class="admin-status admin-status--on">● Connecté</span>`
      : `<span class="admin-status admin-status--off">○ Local</span>`;

    container.innerHTML = `
      <main class="container fiche">
        <nav class="breadcrumb"><a href="#/fondamentaux">Catalogue</a><span class="sep">›</span><span class="current">Espace admin — Vidéos</span></nav>

        <header class="fiche__header">
          <div class="badges"><span class="badge badge--pilote">Admin</span> ${modeBadge}</div>
          <h1>🎬 Gestion des vidéos de formation</h1>
          <div class="meta"><span>Associez une vidéo aux thèmes du parcours « Les fondamentaux de l'assurance ».</span></div>
        </header>

        ${note}

        <div class="admin-toolbar">
          ${connected ? "" : `<button class="btn btn--primary" id="export">⬇︎ Exporter la configuration (JSON)</button>`}
          <button class="btn" id="reset">↺ Réinitialiser (tout retirer)</button>
        </div>

        <div id="admin-list"></div>

        <span class="fiche__back" id="back">← Retour au catalogue</span>
      </main>`;

    renderList(container.querySelector("#admin-list"));
    container.querySelector("#back").addEventListener("click", () => { location.hash = "#/fondamentaux"; });
    const exp = container.querySelector("#export");
    if (exp) exp.addEventListener("click", exportConfig);
    container.querySelector("#reset").addEventListener("click", async () => {
      if (!confirm("Retirer toutes les vidéos configurées ?")) return;
      const ids = Object.keys(FC.data.getOverrides());
      for (const id of ids) { try { await FC.data.removeVideo(id); } catch (e) {} }
      renderList(container.querySelector("#admin-list"));
    });
  }

  function renderList(el) {
    const themes = fond();
    el.innerHTML = themes.map(row).join("");
    themes.forEach((t) => wireRow(el, t));
  }

  function row(t) {
    const v = FC.data.getVideo(t);
    const isFile = v && v.type === "fichier";
    const status = v
      ? `<span class="admin-status admin-status--on">Vidéo configurée · ${E(labelType(v))}</span>`
      : `<span class="admin-status admin-status--off">Aucune vidéo</span>`;
    const currentSrc = v ? `<div class="card__crumb" style="margin-top:4px">Source : ${E(v.src)}</div>` : "";
    return `
      <section class="admin-card" data-id="${E(t.id)}">
        <div class="admin-card__head">
          <div>
            <h3>${E(t.titre)}</h3>
            <div class="card__crumb">${E((FC.data.domaineById(t.domaine) || {}).nom || "")}</div>
            ${currentSrc}
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
            <input type="url" data-f="src" value="${E(v && !isFile && v.src || "")}" placeholder="https://…" />
          </label>
          <div class="admin-source__sep">ou</div>
          <label class="admin-source__file">Fichier vidéo (.mp4, .webm…)
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

    card.querySelector('[data-a="save"]').addEventListener("click", async () => {
      const titre = get("titre").value.trim();
      const duree = get("duree").value.trim();
      const url = get("src").value.trim();
      const fileInput = get("file");
      const file = fileInput.files && fileInput.files[0];
      const btn = card.querySelector('[data-a="save"]');

      try {
        setBusy(btn, true);
        if (file) {
          await FC.data.uploadVideoFile(t.id, file, { titre, duree });
          toast(card, FC.data.isConnected()
            ? "Vidéo uploadée et enregistrée sur le serveur."
            : "Fichier chargé pour cette session (mode local).");
        } else if (url) {
          await FC.data.setVideoUrl(t.id, { type: detectType(url), src: url, titre, duree });
          toast(card, "Vidéo enregistrée.");
        } else {
          toast(card, "Renseignez un lien vidéo ou sélectionnez un fichier.", true);
          return;
        }
        renderList(el);
      } catch (err) {
        toast(card, err.message || "Erreur lors de l'enregistrement.", true);
      } finally {
        setBusy(btn, false);
      }
    });

    card.querySelector('[data-a="preview"]').addEventListener("click", () => {
      if (!FC.data.getVideo(t)) { toast(card, "Enregistrez d'abord une vidéo.", true); return; }
      location.hash = "#/video/" + t.id;
    });

    card.querySelector('[data-a="remove"]').addEventListener("click", async () => {
      try { await FC.data.removeVideo(t.id); renderList(el); }
      catch (err) { toast(card, err.message || "Erreur.", true); }
    });
  }

  /** Export (mode local) : configuration prête à coller dans curriculum.json. */
  function exportConfig() {
    const ov = FC.data.getOverrides();
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
  function setBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = busy;
    if (busy) { btn.dataset._t = btn.textContent; btn.textContent = "…"; }
    else if (btn.dataset._t) { btn.textContent = btn.dataset._t; }
  }
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
