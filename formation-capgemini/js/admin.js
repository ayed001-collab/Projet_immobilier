/* =========================================================================
   admin.js — Espace admin.

   Deux volets par formation :
     • Visibilité : masquer / réafficher / supprimer une formation dans
       l'espace utilisateur — sur LES DEUX parcours (Fondamentaux et Expert).
     • Vidéo (fondamentaux uniquement) : associer une vidéo (URL ou upload).

   Deux modes, détectés automatiquement (voir data.js) :
     • MODE CONNECTÉ (backend) : changements persistés sur le serveur et
       partagés entre tous les utilisateurs.
     • MODE LOCAL (repli) : changements en localStorage (ce navigateur).
   ========================================================================= */
window.FC = window.FC || {};

FC.admin = (function () {
  const E = (s) => FC.ui.esc(s);
  let _view = null; // conteneur principal, pour re-rendre après (dé)connexion

  const STATUS_LABEL = { visible: "Visible", hidden: "Masquée", deleted: "Supprimée" };

  function render(container) {
    _view = container;
    const connected = FC.data.isConnected();

    // Mode connecté avec authentification exigée : écran de connexion préalable.
    if (connected && FC.data.authRequired() && !FC.data.isAuthed()) {
      return renderLogin(container);
    }

    const note = connected
      ? `<div class="admin-note admin-note--ok">
           <strong>Mode connecté (backend actif).</strong>
           Les modifications (visibilité des formations et vidéos) sont <em>enregistrées sur le
           serveur</em> et <em>visibles par tous les utilisateurs</em>.
         </div>`
      : `<div class="admin-note">
           <strong>Mode local (sans backend).</strong>
           Les modifications sont enregistrées dans <em>ce navigateur</em> uniquement.
           Pour une diffusion permanente et partagée, lancez le backend (<code>server/app.py</code>).
         </div>`;

    const modeBadge = connected
      ? `<span class="admin-status admin-status--on">● Connecté</span>`
      : `<span class="admin-status admin-status--off">○ Local</span>`;

    container.innerHTML = `
      <main class="container fiche">
        <nav class="breadcrumb"><a href="#/fondamentaux">Catalogue</a><span class="sep">›</span><span class="current">Espace admin</span></nav>

        <header class="fiche__header">
          <div class="badges"><span class="badge badge--pilote">Admin</span> ${modeBadge}</div>
          <h1>🛠️ Gestion des formations</h1>
          <div class="meta"><span>Masquer, supprimer ou restaurer une formation dans l'espace utilisateur, et gérer les vidéos des fondamentaux.</span></div>
        </header>

        ${note}

        <div class="admin-toolbar">
          ${connected ? "" : `<button class="btn" id="export">⬇︎ Exporter les vidéos (JSON)</button>`}
          ${connected && FC.data.isAuthed() ? `<span class="admin-toolbar__spacer"></span><button class="btn btn--ghost" id="logout">Se déconnecter</button>` : ""}
        </div>

        <div id="admin-list"></div>

        <span class="fiche__back" id="back">← Retour au catalogue</span>
      </main>`;

    renderList(container.querySelector("#admin-list"));
    container.querySelector("#back").addEventListener("click", () => { location.hash = "#/fondamentaux"; });
    const exp = container.querySelector("#export");
    if (exp) exp.addEventListener("click", exportConfig);
    const logoutBtn = container.querySelector("#logout");
    if (logoutBtn) logoutBtn.addEventListener("click", () => { FC.data.logout(); render(container); });
  }

  /** Écran de connexion (mode connecté). Le vrai contrôle est côté serveur. */
  function renderLogin(container) {
    container.innerHTML = `
      <main class="container fiche">
        <nav class="breadcrumb"><a href="#/fondamentaux">Catalogue</a><span class="sep">›</span><span class="current">Espace admin</span></nav>
        <header class="fiche__header">
          <div class="badges"><span class="badge badge--pilote">Admin</span> <span class="admin-status admin-status--on">● Connecté</span></div>
          <h1>🔒 Connexion administrateur</h1>
          <div class="meta"><span>La gestion des formations est réservée aux administrateurs.</span></div>
        </header>
        <section class="section login-card">
          <form id="login-form" autocomplete="on">
            <label class="login-field">Mot de passe administrateur
              <input type="password" id="pw" autocomplete="current-password" required placeholder="••••••••" />
            </label>
            <div class="login-error" id="login-error"></div>
            <button class="btn btn--primary" type="submit" id="login-btn">Se connecter</button>
          </form>
          <p class="schema-note" style="margin-top:14px">Le mot de passe est défini par la variable d'environnement
            <code>FORMATION_ADMIN_PASSWORD</code> côté serveur (ou généré et affiché dans la console au démarrage).</p>
          <span class="fiche__back" id="back">← Retour au catalogue</span>
        </section>
      </main>`;

    container.querySelector("#back").addEventListener("click", () => { location.hash = "#/fondamentaux"; });
    const form = container.querySelector("#login-form");
    const errEl = container.querySelector("#login-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = container.querySelector("#login-btn");
      errEl.textContent = "";
      try {
        setBusy(btn, true);
        await FC.data.login(container.querySelector("#pw").value);
        render(container); // authentifié -> vue de gestion
      } catch (err) {
        errEl.textContent = err.message || "Connexion refusée.";
        setBusy(btn, false);
      }
    });
  }

  /** Recharge l'écran approprié après expiration de session (401). */
  function relogin() { if (_view) render(_view); }

  /** Liste toutes les formations, regroupées par parcours. */
  function renderList(el) {
    const html = FC.data.parcours().map((p) => {
      const themes = FC.data.themes().filter((t) => t.niveau === p.niveau);
      if (!themes.length) return "";
      return `
        <section class="admin-parcours">
          <div class="domain-block__head"><span class="dot"></span><div><h3>${E(p.libelle)}</h3></div></div>
          ${themes.map(row).join("")}
        </section>`;
    }).join("");
    el.innerHTML = html;
    FC.data.themes().forEach((t) => wireRow(el, t));
  }

  function row(t) {
    const status = FC.data.themeStatus(t);
    const isFondamental = t.niveau === "conceptuel";
    const deleted = status === "deleted";
    const v = FC.data.getVideo(t);
    const isFile = v && v.type === "fichier";

    const visBadge = `<span class="admin-status admin-status--${status}">${E(STATUS_LABEL[status])}</span>`;
    const videoBadge = isFondamental
      ? (v ? `<span class="admin-status admin-status--on">Vidéo · ${E(labelType(v))}</span>`
           : `<span class="admin-status admin-status--off">Aucune vidéo</span>`)
      : "";
    const srcLine = (isFondamental && v && !deleted)
      ? `<div class="card__crumb" style="margin-top:4px">Source vidéo : ${E(v.src)}</div>` : "";

    // Bloc de gestion vidéo (fondamentaux, hors supprimé)
    const videoBlock = (isFondamental && !deleted) ? `
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
        <button class="btn btn--primary" data-a="save">Enregistrer la vidéo</button>
        <button class="btn" data-a="preview-video">▶ Prévisualiser</button>
        <button class="btn btn--ghost" data-a="remove-video">Retirer la vidéo</button>
      </div>` : "";

    return `
      <section class="admin-card admin-card--${status}" data-id="${E(t.id)}">
        <div class="admin-card__head">
          <div>
            <h3>${E(t.titre)}</h3>
            <div class="card__crumb">${E((FC.data.domaineById(t.domaine) || {}).nom || "")}</div>
            ${srcLine}
          </div>
          <div class="admin-badges">${visBadge}${videoBadge}</div>
        </div>

        ${videoBlock}

        <div class="admin-visibility">
          <span class="admin-visibility__label">Visibilité :</span>
          ${visibilityButtons(status)}
        </div>
      </section>`;
  }

  /** Boutons de visibilité selon le statut courant. */
  function visibilityButtons(status) {
    if (status === "deleted") {
      return `<button class="btn btn--primary" data-a="restore">↩ Restaurer</button>`;
    }
    const toggle = status === "hidden"
      ? `<button class="btn btn--primary" data-a="show">👁 Réafficher</button>`
      : `<button class="btn" data-a="hide">🙈 Masquer</button>`;
    return `${toggle}
      <button class="btn" data-a="preview-fiche">Voir la fiche</button>
      <button class="btn btn--ghost" data-a="delete">🗑 Supprimer</button>`;
  }

  function wireRow(el, t) {
    const card = el.querySelector(`.admin-card[data-id="${cssEscape(t.id)}"]`);
    if (!card) return;
    const get = (f) => card.querySelector(`[data-f="${f}"]`);
    const on = (sel, fn) => { const b = card.querySelector(sel); if (b) b.addEventListener("click", fn); };

    // ---- Vidéo (fondamentaux) ----
    on('[data-a="save"]', async () => {
      const titre = get("titre").value.trim();
      const duree = get("duree").value.trim();
      const url = get("src").value.trim();
      const file = get("file").files && get("file").files[0];
      const btn = card.querySelector('[data-a="save"]');
      try {
        setBusy(btn, true);
        if (file) {
          await FC.data.uploadVideoFile(t.id, file, { titre, duree });
          toast(card, FC.data.isConnected() ? "Vidéo uploadée et enregistrée sur le serveur." : "Fichier chargé pour cette session (mode local).");
        } else if (url) {
          await FC.data.setVideoUrl(t.id, { type: detectType(url), src: url, titre, duree });
          toast(card, "Vidéo enregistrée.");
        } else {
          toast(card, "Renseignez un lien vidéo ou sélectionnez un fichier.", true); return;
        }
        renderList(el);
      } catch (err) {
        if (err.auth) { relogin(); return; }
        toast(card, err.message || "Erreur lors de l'enregistrement.", true);
      } finally { setBusy(btn, false); }
    });
    on('[data-a="preview-video"]', () => {
      if (!FC.data.getVideo(t)) { toast(card, "Enregistrez d'abord une vidéo.", true); return; }
      location.hash = "#/video/" + t.id;
    });
    on('[data-a="remove-video"]', async () => {
      try { await FC.data.removeVideo(t.id); renderList(el); }
      catch (err) { if (err.auth) { relogin(); return; } toast(card, err.message || "Erreur.", true); }
    });

    // ---- Visibilité (tous les parcours) ----
    const changeStatus = async (status, confirmMsg) => {
      if (confirmMsg && !confirm(confirmMsg)) return;
      try { await FC.data.setFormationStatus(t.id, status); renderList(el); }
      catch (err) { if (err.auth) { relogin(); return; } toast(card, err.message || "Erreur.", true); }
    };
    on('[data-a="hide"]', () => changeStatus("hidden"));
    on('[data-a="show"]', () => changeStatus("visible"));
    on('[data-a="restore"]', () => changeStatus("visible"));
    on('[data-a="delete"]', () => changeStatus("deleted",
      `Supprimer « ${t.titre} » ? Elle disparaîtra de l'espace utilisateur (restaurable depuis l'admin).`));
    on('[data-a="preview-fiche"]', () => { location.hash = "#/theme/" + t.id; });
  }

  /** Export (mode local) : configuration vidéo prête à coller dans curriculum.json. */
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
