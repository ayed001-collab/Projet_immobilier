/* =========================================================================
   fiche.js — GABARIT UNIQUE de fiche de formation.
   Un seul template, rempli dynamiquement depuis un thème du référentiel.
   Chaque section n'est rendue que si elle est présente dans le JSON.
   ========================================================================= */
window.FC = window.FC || {};

FC.fiche = (function () {
  const E = (s) => FC.ui.esc(s);

  // Définition ordonnée des sections : clé JSON -> { titre, icône, moteur de rendu }.
  // Ajouter une section = ajouter une entrée ici + la clé correspondante dans le JSON.
  // Une même clé n'est rendue que si le thème la fournit : le gabarit reste générique.
  const SECTIONS = [
    { key: "definition",       anchor: "definition",   title: "Définition",                         icon: "📘", render: (s) => renderDefinition(s) },
    { key: "conceptsCles",     anchor: "concepts",     title: "Concepts clés",                      icon: "🔑", render: (s) => renderConcepts(s) },
    { key: "conditions",       anchor: "conditions",   title: "Conditions de déclenchement",        icon: "🔑", render: (s) => renderGroupes(s.conditions) },
    { key: "compartiments",    anchor: "compartiments",title: "Les trois compartiments",            icon: "🧩", render: (s) => renderCompartiments(s.compartiments) },
    { key: "optionsSortie",    anchor: "options",      title: "Options de sortie & règles de cumul",icon: "🔀", render: (s) => renderOptions(s.optionsSortie) },
    { key: "objectifs",        anchor: "objectifs",    title: "Objectifs pédagogiques",             icon: "🎯", render: (s) => renderList(s.objectifs) },
    { key: "processus",        anchor: "processus",    title: "Processus de bout en bout",          icon: "🗺️", render: (s) => renderProcessus(s.processus) },
    { key: "etapes",           anchor: "etapes",       title: "Étapes de saisie",                   icon: "🧭", render: (s) => renderSteps(s.etapes) },
    { key: "reglesGestion",    anchor: "regles",       title: "Règles de gestion",                  icon: "⚙️", render: (s) => renderList(s.reglesGestion) },
    { key: "donneesSaisie",    anchor: "donnees",      title: "Données nécessaires à la saisie",    icon: "📋", render: (s) => renderChecklist(s.donneesSaisie) },
    { key: "pieces",           anchor: "pieces",       title: "Pièces justificatives & contrôles",  icon: "📎", render: (s) => renderChecklist(s.pieces) },
    { key: "reglementation",   anchor: "reglementation", title: "Réglementation en vigueur",        icon: "⚖️", render: (s) => renderRefTable(s.reglementation) },
    { key: "fiscalite",        anchor: "fiscalite",    title: "Fiscalité à la sortie",              icon: "💶", render: (s) => renderFiscalite(s.fiscalite) },
    { key: "reglesEssentielles", anchor: "regles-cles", title: "Règles de gestion essentielles",    icon: "⭐", render: (s) => renderReglesNum(s.reglesEssentielles) },
    { key: "vigilance",        anchor: "vigilance",    title: "Points de vigilance",                icon: "⚠️", render: (s) => renderList(s.vigilance, "list--warn") },
    { key: "schemaMermaid",    anchor: "schema",       title: "Schéma du processus",                icon: "🗺️", render: (s) => renderSchema(s.schemaMermaid) },
    { key: "quiz",             anchor: "quiz",         title: "Quiz d'auto-évaluation",             icon: "✅", render: (s) => renderQuiz(s.quiz) },
    { key: "sources",          anchor: "sources",      title: "Sources & références",               icon: "🔗", render: (s) => renderSources(s.sources) },
  ];

  /** Rendu de la fiche complète pour un thème donné. */
  function render(container, theme) {
    const s = theme.sections || {};
    const bc = FC.data.breadcrumb(theme);

    const present = SECTIONS.filter((sec) => {
      if (sec.key === "conceptsCles") return false; // concepts affichés dans "definition"
      const v = s[sec.key];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      return true; // objet non nul (sections structurées)
    });

    const toc = present.map((sec) =>
      `<a href="#/theme/${E(theme.id)}#${sec.anchor}" data-anchor="${sec.anchor}">${E(sec.title)}</a>`
    ).join("");

    const body = present.map((sec) => `
      <section class="section" id="${sec.anchor}">
        <h2><span class="ico">${sec.icon}</span>${E(sec.title)}</h2>
        ${sec.render(s)}
      </section>`).join("");

    container.innerHTML = `
      <main class="container fiche">
        <nav class="breadcrumb" aria-label="Fil d'Ariane">
          <a href="#/">Catalogue</a><span class="sep">›</span>
          <span>${E(bc.domaine)}</span><span class="sep">›</span>
          <span>${E(bc.sousDomaine)}</span><span class="sep">›</span>
          <span class="current">${E(bc.theme)}</span>
        </nav>

        <header class="fiche__header">
          <div class="badges">${FC.ui.badges(theme)}</div>
          <h1>${E(theme.titre)}</h1>
          <div class="meta">
            <span>📂 ${E(bc.domaine)} › ${E(bc.sousDomaine)}</span>
            ${theme.dureeEstimee ? `<span>⏱️ ${E(theme.dureeEstimee)}</span>` : ""}
          </div>
        </header>

        <div class="fiche__layout">
          <aside class="fiche__toc">
            <strong>Sur cette fiche</strong>
            ${toc}
          </aside>
          <div>
            ${body}
            <span class="fiche__back" id="back">← Retour au catalogue</span>
          </div>
        </div>
      </main>
    `;

    container.querySelector("#back").addEventListener("click", () => { location.hash = "#/"; });
    wireToc(container);
    wireQuiz(container);
  }

  /* ------------------------------------------------------------- Helpers */

  /** Note / encadré : ton = info | warn | ok. */
  function noteHTML(label, texte, ton) {
    const l = label ? `<strong>${E(label)} :</strong> ` : "";
    return `<p class="note note--${ton || "info"}">${l}${E(texte)}</p>`;
  }

  /** Tableau / matrice générique. Les cellules ✓ / ✗ / — sont mises en forme. */
  function renderMatrix(entetes, lignes) {
    const cell = (v, first) => {
      if (first) return `<td class="mx-h">${E(v)}</td>`;
      if (v === "✓") return `<td class="mx-ok" aria-label="oui">✓</td>`;
      if (v === "✗") return `<td class="mx-ko" aria-label="non">✗</td>`;
      if (v === "—" || v === "-" || v === "") return `<td class="mx-na">—</td>`;
      return `<td>${E(v)}</td>`;
    };
    return `<div class="table-wrap"><table class="table table--matrix">
      <thead><tr>${entetes.map((h, i) => `<th${i === 0 ? ' class="mx-corner"' : ""}>${E(h)}</th>`).join("")}</tr></thead>
      <tbody>${lignes.map((row) => `<tr>${row.map((c, i) => cell(c, i === 0)).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
  }

  /* ------------------------------------------------------------- Moteurs de rendu */

  function renderDefinition(s) {
    const paras = (Array.isArray(s.definition) ? s.definition : [s.definition])
      .map((p) => `<p>${E(p)}</p>`).join("");
    let out = paras;
    if (s.conceptsCles && s.conceptsCles.length) {
      out += `<dl class="dl" style="margin-top:16px">` + s.conceptsCles.map((c) =>
        `<div class="dl__item"><dt>${E(c.terme)}</dt><dd>${E(c.definition)}</dd></div>`
      ).join("") + `</dl>`;
    }
    return out;
  }

  function renderConcepts(s) {
    return `<dl class="dl">` + s.conceptsCles.map((c) =>
      `<div class="dl__item"><dt>${E(c.terme)}</dt><dd>${E(c.definition)}</dd></div>`
    ).join("") + `</dl>`;
  }

  function renderList(arr, extraClass) {
    if (!arr || !arr.length) return "";
    return `<ul class="list ${extraClass || ""}">` +
      arr.map((x) => `<li>${E(x)}</li>`).join("") + `</ul>`;
  }

  /** Checklist groupée : [{ titre, items:[...] }]. */
  function renderGroupes(groupes) {
    if (!groupes || !groupes.length) return "";
    return `<div class="groupes">` + groupes.map((g) =>
      `<div class="groupe">
         <p class="groupe__titre">${E(g.titre)}</p>
         ${renderList(g.items)}
       </div>`
    ).join("") + `</div>`;
  }

  /** Checklist avec intro éventuelle : { intro?, groupes:[...] } (ou tableau simple). */
  function renderChecklist(data) {
    if (Array.isArray(data)) return renderGroupes(data);
    const intro = data.intro ? `<p class="lead">${E(data.intro)}</p>` : "";
    return intro + renderGroupes(data.groupes);
  }

  /** Les trois compartiments : règle d'or + définitions + matrice + notes. */
  function renderCompartiments(c) {
    let h = `<p class="lead">${E(c.regleOr)}</p>`;
    h += `<dl class="dl">` + c.definitions.map((d) =>
      `<div class="dl__item"><dt>${E(d.terme)}</dt><dd>${E(d.definition)}</dd></div>`
    ).join("") + `</dl>`;
    h += renderMatrix(c.matrice.entetes, c.matrice.lignes);
    if (c.exception) h += noteHTML("Exception « petite rente »", c.exception, "warn");
    if (c.aRetenir) h += noteHTML("À retenir", c.aRetenir, "ok");
    return h;
  }

  /** Options de sortie : listes rente/capital + matrice de cumul + règle clé. */
  function renderOptions(o) {
    let h = renderGroupes([o.rente, o.capital]);
    if (o.matrice) {
      h += `<p class="sub">${E(o.matrice.titre)}</p>` + renderMatrix(o.matrice.entetes, o.matrice.lignes);
    }
    if (o.regleCle) h += noteHTML("Règle clé", o.regleCle, "info");
    return h;
  }

  /** Processus de bout en bout : flux numéroté + boucles de retour. */
  function renderProcessus(pr) {
    let h = renderSteps(pr.etapes);
    if (pr.boucles && pr.boucles.length) {
      h += `<p class="sub">Trois boucles de retour possibles</p>` + renderList(pr.boucles, "list--warn");
    }
    return h;
  }

  /** Flux d'étapes numérotées. Chaque étape : { titre, acteur?, description? | actions?, regle? }. */
  function renderSteps(steps) {
    return `<div class="stepper">` + steps.map((st, i) => `
      <div class="step">
        <div class="step__num">${i + 1}</div>
        <div class="step__body">
          <p class="step__title">${E(st.titre)}${st.acteur ? `<span class="step__actor">${E(st.acteur)}</span>` : ""}</p>
          ${st.description ? `<p class="step__desc">${E(st.description)}</p>` : ""}
          ${st.actions ? `<p class="step__desc">${E(st.actions)}</p>` : ""}
          ${st.regle ? `<p class="step__regle"><strong>Règle de gestion :</strong> ${E(st.regle)}</p>` : ""}
        </div>
      </div>`).join("") + `</div>`;
  }

  function renderRefTable(refs) {
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>Référence</th><th>Portée</th></tr></thead>
      <tbody>${refs.map((r) => `<tr><td>${E(r.reference)}</td><td>${E(r.description)}</td></tr>`).join("")}</tbody>
    </table></div>`;
  }

  /** Fiscalité : tableau (array de {situation, traitement}) ou { lignes, note }. */
  function renderFiscalite(fisc) {
    const rows = Array.isArray(fisc) ? fisc : fisc.lignes;
    const table = `<div class="table-wrap"><table class="table">
      <thead><tr><th>Origine des versements</th><th>Traitement</th></tr></thead>
      <tbody>${rows.map((f) => `<tr><td>${E(f.situation)}</td><td>${E(f.traitement)}</td></tr>`).join("")}</tbody>
    </table></div>`;
    const note = (!Array.isArray(fisc) && fisc.note) ? noteHTML("Pourquoi c'est important en gestion", fisc.note, "info") : "";
    return table + note;
  }

  /** Règles essentielles : cartes numérotées { titre, texte }. */
  function renderReglesNum(items) {
    return `<div class="regles-num">` + items.map((r, i) => `
      <div class="regle-card">
        <div class="regle-card__num">${i + 1}</div>
        <div class="regle-card__body">
          <p class="regle-card__titre">${E(r.titre)}</p>
          <p class="regle-card__txt">${E(r.texte)}</p>
        </div>
      </div>`).join("") + `</div>`;
  }

  function renderSchema(code) {
    return `<p class="schema-note">Logigramme du processus (notation Mermaid, exploitable dans un outil compatible) :</p>
      <pre class="mermaid">${E(code)}</pre>`;
  }

  function renderQuiz(quiz) {
    return quiz.map((q, qi) => `
      <div class="quiz-item" data-answer="${q.reponse}">
        <p class="quiz-q">${qi + 1}. ${E(q.question)}</p>
        <div class="quiz-opts">
          ${q.options.map((o, oi) => `<button class="quiz-opt" data-opt="${oi}">${E(o)}</button>`).join("")}
        </div>
        <p class="quiz-explain">${E(q.explication || "")}</p>
      </div>`).join("");
  }

  function renderSources(sources) {
    return `<ul class="list sources">` + sources.map((s) =>
      s.url ? `<li><a href="${E(s.url)}" target="_blank" rel="noopener">${E(s.libelle)}</a></li>`
            : `<li>${E(s.libelle)}</li>`
    ).join("") + `</ul>`;
  }

  /* ------------------------------------------------------------- Interactions */

  function wireToc(container) {
    container.querySelectorAll(".fiche__toc a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = container.querySelector("#" + a.getAttribute("data-anchor"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function wireQuiz(container) {
    container.querySelectorAll(".quiz-item").forEach((item) => {
      const answer = parseInt(item.getAttribute("data-answer"), 10);
      const explain = item.querySelector(".quiz-explain");
      item.querySelectorAll(".quiz-opt").forEach((btn) => {
        btn.addEventListener("click", () => {
          const chosen = parseInt(btn.getAttribute("data-opt"), 10);
          item.querySelectorAll(".quiz-opt").forEach((b) => { b.classList.remove("correct", "wrong"); b.disabled = false; });
          if (chosen === answer) {
            btn.classList.add("correct");
          } else {
            btn.classList.add("wrong");
            const good = item.querySelector('.quiz-opt[data-opt="' + answer + '"]');
            if (good) good.classList.add("correct");
          }
          explain.classList.add("show");
        });
      });
    });
  }

  return { render };
})();
