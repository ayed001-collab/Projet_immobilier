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
  let _view = null;                 // conteneur principal, pour re-rendre après (dé)connexion
  let _adminView = "formations";    // "formations" | "news"

  const STATUS_LABEL = { visible: "Visible", hidden: "Masquée", deleted: "Supprimée" };

  function render(container, view) {
    _view = container;
    if (view) _adminView = view;
    const connected = FC.data.isConnected();

    // Mode connecté avec authentification exigée : écran de connexion préalable.
    if (connected && FC.data.authRequired() && !FC.data.isAuthed()) {
      return renderLogin(container);
    }

    const note = connected
      ? `<div class="admin-note admin-note--ok">
           <strong>Mode connecté (backend actif).</strong>
           Les modifications sont <em>enregistrées sur le serveur</em> et <em>visibles par tous les utilisateurs</em>.
         </div>`
      : `<div class="admin-note">
           <strong>Mode local (sans backend).</strong>
           Les modifications sont enregistrées dans <em>ce navigateur</em> uniquement.
           Pour une diffusion permanente et partagée, lancez le backend (<code>server/app.py</code>).
         </div>`;

    const modeBadge = connected
      ? `<span class="admin-status admin-status--on">● Connecté</span>`
      : `<span class="admin-status admin-status--off">○ Local</span>`;

    const isNews = _adminView === "news";
    const subnav = `
      <nav class="tabs admin-subnav" role="tablist">
        <a class="tab ${!isNews ? "active" : ""}" href="#/admin">Formations</a>
        <a class="tab ${isNews ? "active" : ""}" href="#/admin/actualites">Gestion des actualités</a>
      </nav>`;

    container.innerHTML = `
      <main class="container fiche">
        <nav class="breadcrumb"><a href="#/fondamentaux">Catalogue</a><span class="sep">›</span><span class="current">Espace admin</span></nav>

        <header class="fiche__header">
          <div class="badges"><span class="badge badge--pilote">Admin</span> ${modeBadge}</div>
          <h1>🛠️ Espace administrateur</h1>
          <div class="meta"><span>${isNews
            ? "Gérer les articles de la veille sectorielle (ajout, modification, publication)."
            : "Masquer, supprimer ou restaurer une formation, et gérer les vidéos des fondamentaux."}</span></div>
        </header>

        ${note}
        ${subnav}

        <div class="admin-toolbar">
          ${(!connected && !isNews) ? `<button class="btn" id="export">⬇︎ Exporter les vidéos (JSON)</button>` : ""}
          ${connected && FC.data.isAuthed() ? `<span class="admin-toolbar__spacer"></span><button class="btn btn--ghost" id="logout">Se déconnecter</button>` : ""}
        </div>

        <div id="admin-body"></div>

        <span class="fiche__back" id="back">← Retour au catalogue</span>
      </main>`;

    const body = container.querySelector("#admin-body");
    if (isNews) renderNewsAdmin(body); else renderList(body);

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
      ? `<div class="card__crumb" style="margin-top:4px">Source vidéo : ${E(shortSrc(v.src))}</div>` : "";

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

    // Boutons de format affichés aux utilisateurs (fondamentaux, hors supprimé)
    const formatsRow = (isFondamental && !deleted) ? `
      <div class="admin-formats">
        <span class="admin-visibility__label">Boutons affichés aux utilisateurs :</span>
        <button class="btn" data-a="toggle-video">${FC.data.videoButtonVisible(t) ? "🙈 Masquer le bouton Vidéo" : "👁 Afficher le bouton Vidéo"}</button>
        <button class="btn" data-a="toggle-page">${FC.data.pageButtonVisible(t) ? "🙈 Masquer la page de formation" : "👁 Afficher la page de formation"}</button>
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
        ${formatsRow}

        <div class="admin-visibility">
          <span class="admin-visibility__label">Visibilité de la formation :</span>
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
      let duree = get("duree").value.trim();
      const url = get("src").value.trim();
      const file = get("file").files && get("file").files[0];
      const btn = card.querySelector('[data-a="save"]');
      try {
        setBusy(btn, true);
        if (file) {
          // Durée non saisie -> lue automatiquement dans le fichier chargé.
          if (!FC.ui.isRealDuree(duree)) {
            const tmp = URL.createObjectURL(file);
            duree = await FC.ui.detectDuration(tmp);
            URL.revokeObjectURL(tmp);
          }
          await FC.data.uploadVideoFile(t.id, file, { titre, duree });
          toast(card, FC.data.isConnected() ? "Vidéo uploadée et enregistrée sur le serveur." : "Fichier chargé pour cette session (mode local).");
        } else if (url) {
          const type = detectType(url);
          // Lien direct (.mp4/.webm) : durée lue automatiquement si non saisie.
          if (!FC.ui.isRealDuree(duree) && type === "url") duree = await FC.ui.detectDuration(url);
          await FC.data.setVideoUrl(t.id, { type, src: url, titre, duree });
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

    // ---- Affichage des boutons de format (fondamentaux) ----
    on('[data-a="toggle-video"]', async () => {
      try { await FC.data.setVideoButtonVisible(t.id, !FC.data.videoButtonVisible(t)); renderList(el); }
      catch (err) { if (err.auth) { relogin(); return; } toast(card, err.message || "Erreur.", true); }
    });
    on('[data-a="toggle-page"]', async () => {
      try { await FC.data.setPageButtonVisible(t.id, !FC.data.pageButtonVisible(t)); renderList(el); }
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

  /* ============================================================ ACTUALITÉS */
  let _newsEditingId = null;

  function renderNewsAdmin(body) {
    const canFetch = FC.data.metadataAvailable();
    body.innerHTML = `
      <section class="admin-card news-form">
        <h3 id="news-form-title">Ajouter un article</h3>
        <div class="admin-source" style="border:0;padding:0;margin:0">
          <label class="admin-source__url" style="flex:1">URL de l'article
            <input type="url" data-nf="url" placeholder="https://…" autocomplete="off" />
          </label>
          <div class="admin-source__sep">&nbsp;</div>
          <label class="admin-source__file" style="align-self:end">
            <button class="btn" type="button" data-na="fetch"${canFetch ? "" : ' title="Backend requis — saisie manuelle en mode local"'}>⤓ Récupérer les infos</button>
          </label>
        </div>
        ${canFetch ? "" : `<p class="schema-note" style="margin-top:8px">Mode local : la récupération automatique n'est pas disponible — renseignez les champs manuellement (la source est pré-remplie depuis l'URL).</p>`}

        <div class="admin-grid" style="margin-top:14px">
          <label>Titre <input type="text" data-nf="title" placeholder="Titre de l'article" /></label>
          <label>Source <input type="text" data-nf="source" placeholder="Ex : France Assureurs" /></label>
        </div>
        <label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600;color:var(--cap-navy);margin-bottom:12px">Description
          <textarea data-nf="description" rows="2" placeholder="Courte description…" style="font:inherit;font-weight:400;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:#fbfcfe;resize:vertical"></textarea>
        </label>
        <div class="admin-grid">
          <label>Image (URL) <input type="url" data-nf="imageUrl" placeholder="https://…/image.jpg" /></label>
          <label>Date de publication <input type="date" data-nf="publishedAt" /></label>
        </div>
        <div class="news-img-preview" id="news-img-preview"></div>
        <label class="news-pub"><input type="checkbox" data-nf="isPublished" /> Publier l'article (visible par les utilisateurs)</label>

        <div class="admin-card__actions" style="margin-top:14px">
          <button class="btn btn--primary" data-na="save">Ajouter l'article</button>
          <button class="btn btn--ghost" data-na="cancel" style="display:none">Annuler</button>
        </div>
        <div class="admin-toast" id="news-toast"></div>
      </section>

      <div id="news-admin-list"><div class="empty" style="margin-top:16px">Chargement…</div></div>`;

    wireNewsForm(body);
    renderNewsAdminList(body);
  }

  function nf(body, k) { return body.querySelector(`[data-nf="${k}"]`); }

  function readForm(body) {
    return {
      url: nf(body, "url").value.trim(),
      title: nf(body, "title").value.trim(),
      source: nf(body, "source").value.trim(),
      description: nf(body, "description").value.trim(),
      imageUrl: nf(body, "imageUrl").value.trim(),
      publishedAt: nf(body, "publishedAt").value.trim(),
      isPublished: nf(body, "isPublished").checked,
    };
  }
  function fillForm(body, a) {
    nf(body, "url").value = a.url || "";
    nf(body, "title").value = a.title || "";
    nf(body, "source").value = a.source || "";
    nf(body, "description").value = a.description || "";
    nf(body, "imageUrl").value = a.imageUrl || "";
    nf(body, "publishedAt").value = (a.publishedAt || "").slice(0, 10);
    nf(body, "isPublished").checked = !!a.isPublished;
    updateImgPreview(body);
  }

  /** Aperçu de l'image saisie/récupérée (repli si l'image ne charge pas). */
  function updateImgPreview(body) {
    const box = body.querySelector("#news-img-preview");
    if (!box) return;
    const u = nf(body, "imageUrl").value.trim();
    if (!u) { box.innerHTML = ""; return; }
    box.innerHTML = `<span class="news-img-preview__label">Aperçu</span><img src="${E(u)}" alt="aperçu" referrerpolicy="no-referrer" /><span class="news-img-preview__err" style="display:none">Image indisponible à cette URL.</span>`;
    const img = box.querySelector("img");
    img.addEventListener("error", () => {
      img.style.display = "none";
      box.querySelector(".news-img-preview__err").style.display = "";
    }, { once: true });
  }
  function resetForm(body) {
    _newsEditingId = null;
    fillForm(body, {});
    body.querySelector("#news-form-title").textContent = "Ajouter un article";
    body.querySelector('[data-na="save"]').textContent = "Ajouter l'article";
    body.querySelector('[data-na="cancel"]').style.display = "none";
  }
  function newsToast(body, msg, err) {
    const t = body.querySelector("#news-toast");
    t.textContent = msg; t.classList.toggle("admin-toast--err", !!err); t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 4000);
  }

  function wireNewsForm(body) {
    body.querySelector('[data-na="fetch"]').addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const url = nf(body, "url").value.trim();
      if (!FC.data.isValidHttpUrl(url)) { newsToast(body, "URL invalide : elle doit commencer par http:// ou https://.", true); return; }
      try {
        setBusy(btn, true);
        const m = await FC.data.newsFetchMetadata(url);
        if (m.title) nf(body, "title").value = m.title;
        if (m.description) nf(body, "description").value = m.description;
        if (m.imageUrl) nf(body, "imageUrl").value = m.imageUrl;
        if (m.source) nf(body, "source").value = m.source;
        if (m.publishedAt) nf(body, "publishedAt").value = (m.publishedAt || "").slice(0, 10);
        updateImgPreview(body);
        newsToast(body, m.imageUrl ? "Informations récupérées (image comprise) — vérifiez puis publiez."
                                   : "Infos récupérées. Aucune image trouvée : ajoutez une URL d'image si besoin.");
      } catch (err) {
        if (err.auth) { relogin(); return; }
        // Repli : pré-remplir au moins la source depuis l'URL, saisie manuelle.
        try { if (!nf(body, "source").value) nf(body, "source").value = new URL(url).hostname.replace("www.", ""); } catch (e2) {}
        newsToast(body, err.noBackend ? "Récupération auto indisponible (mode local) : saisie manuelle." : (err.message || "Récupération impossible : saisie manuelle."), true);
      } finally { setBusy(btn, false); }
    });

    body.querySelector('[data-na="save"]').addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const data = readForm(body);
      if (!FC.data.isValidHttpUrl(data.url)) { newsToast(body, "URL invalide : elle doit commencer par http:// ou https://.", true); return; }
      try {
        setBusy(btn, true);
        if (_newsEditingId) { await FC.data.newsUpdate(_newsEditingId, data); newsToast(body, "Article modifié."); }
        else { await FC.data.newsCreate(data); newsToast(body, "Article ajouté."); }
        resetForm(body);
        renderNewsAdminList(body);
      } catch (err) {
        if (err.auth) { relogin(); return; }
        newsToast(body, err.message || "Enregistrement impossible.", true);
      } finally { setBusy(btn, false); }
    });

    body.querySelector('[data-na="cancel"]').addEventListener("click", () => resetForm(body));
    nf(body, "imageUrl").addEventListener("input", () => updateImgPreview(body));
  }

  async function renderNewsAdminList(body) {
    const listEl = body.querySelector("#news-admin-list");
    let items = [];
    try { items = await FC.data.newsAll(); }
    catch (err) { if (err.auth) { relogin(); return; } listEl.innerHTML = `<div class="empty">Chargement impossible.</div>`; return; }

    if (!items.length) { listEl.innerHTML = `<div class="empty" style="margin-top:16px">Aucun article pour le moment. Ajoutez-en un ci-dessus.</div>`; return; }

    listEl.innerHTML = `<h3 style="margin:22px 0 12px;color:var(--cap-navy)">Articles (${items.length})</h3>` +
      items.map(newsRow).join("");

    // Repli d'image sur les vignettes (image externe indisponible).
    listEl.querySelectorAll("img[data-fallback]").forEach((im) => {
      im.addEventListener("error", () => { if (im.src !== FC.news.FALLBACK_IMG) im.src = FC.news.FALLBACK_IMG; }, { once: true });
    });

    items.forEach((a) => {
      const card = listEl.querySelector(`.news-admin-card[data-id="${cssEscape(a.id)}"]`);
      if (!card) return;
      card.querySelector('[data-na="toggle"]').addEventListener("click", async () => {
        try { await FC.data.newsUpdate(a.id, { isPublished: !a.isPublished }); renderNewsAdminList(body); }
        catch (err) { if (err.auth) { relogin(); return; } newsToast(body, err.message || "Erreur.", true); }
      });
      card.querySelector('[data-na="edit"]').addEventListener("click", () => {
        _newsEditingId = a.id; fillForm(body, a);
        body.querySelector("#news-form-title").textContent = "Modifier l'article";
        body.querySelector('[data-na="save"]').textContent = "Enregistrer les modifications";
        body.querySelector('[data-na="cancel"]').style.display = "";
        body.querySelector(".news-form").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      card.querySelector('[data-na="del"]').addEventListener("click", async () => {
        if (!confirm(`Supprimer l'article « ${a.title || a.url} » ?`)) return;
        try { await FC.data.newsDelete(a.id); renderNewsAdminList(body); }
        catch (err) { if (err.auth) { relogin(); return; } newsToast(body, err.message || "Erreur.", true); }
      });
    });
  }

  function newsRow(a) {
    const img = a.imageUrl ? E(a.imageUrl) : FC.news.FALLBACK_IMG;
    const status = a.isPublished
      ? `<span class="admin-status admin-status--visible">Publié</span>`
      : `<span class="admin-status admin-status--hidden">Brouillon</span>`;
    const meta = [a.source ? E(a.source) : "", (a.publishedAt || "").slice(0, 10)].filter(Boolean).join(" · ");
    return `
      <section class="news-admin-card" data-id="${E(a.id)}">
        <img class="news-admin-card__thumb" src="${img}" alt="" referrerpolicy="no-referrer" data-fallback="1" />
        <div class="news-admin-card__body">
          <div class="admin-card__head" style="margin:0">
            <div>
              <h4 style="margin:0 0 3px;color:var(--cap-navy)">${E(a.title || "(Sans titre)")}</h4>
              <div class="card__crumb">${meta || "&nbsp;"}</div>
              <div class="card__crumb" style="margin-top:2px">${E(a.url)}</div>
            </div>
            ${status}
          </div>
          <div class="admin-visibility" style="margin-top:10px;padding-top:10px">
            <button class="btn ${a.isPublished ? "" : "btn--primary"}" data-na="toggle">${a.isPublished ? "Dépublier" : "Publier"}</button>
            <button class="btn" data-na="edit">Modifier</button>
            <button class="btn btn--ghost" data-na="del">Supprimer</button>
          </div>
        </div>
      </section>`;
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
  /** Affiche une source lisible (les data-URI et liens très longs sont abrégés). */
  function shortSrc(src) {
    src = String(src || "");
    if (src.startsWith("data:")) {
      const m = src.match(/^data:([^;,]+)/);
      return (m ? m[1] : "data") + " (fichier intégré)";
    }
    return src.length > 80 ? src.slice(0, 77) + "…" : src;
  }
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
