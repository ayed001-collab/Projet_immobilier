/* =========================================================================
   app.js — Bootstrap & routing SPA (hash-based, sans dépendance)
   Routes :  #/                -> catalogue
             #/theme/<id>      -> fiche de formation
   ========================================================================= */
window.FC = window.FC || {};

(function () {
  const view = document.getElementById("view");

  /** Résout la route courante à partir du hash et rend la vue adéquate. */
  function route() {
    const hash = location.hash || "#/";
    const parts = hash.replace(/^#\//, "").split("/"); // ex: ["theme", "id"]
    const head = parts[0];

    // Fiche structurée : #/theme/<id>
    if (head === "theme" && parts[1]) {
      const theme = FC.data.themeById(decodeURIComponent(parts[1]));
      if (theme) {
        document.title = theme.titre + " — Formation Capgemini";
        FC.fiche.render(view, theme);
        window.scrollTo(0, 0);
        return;
      }
    }

    // Lecteur vidéo : #/video/<id>
    if (head === "video" && parts[1]) {
      const theme = FC.data.themeById(decodeURIComponent(parts[1]));
      if (theme) {
        document.title = "Vidéo — " + theme.titre;
        FC.video.render(view, theme);
        window.scrollTo(0, 0);
        return;
      }
    }

    // Espace admin : #/admin
    if (head === "admin") {
      document.title = "Espace admin — Vidéos";
      FC.admin.render(view);
      window.scrollTo(0, 0);
      return;
    }

    // Catalogue par parcours : #/fondamentaux | #/expert (défaut : fondamentaux)
    const tab = (head === "expert" || head === "fondamentaux") ? head : "fondamentaux";
    document.title = "Catalogue de formation — Capgemini";
    FC.catalogue.render(view, tab);
    window.scrollTo(0, 0);
  }

  /** Démarrage : charge le référentiel puis active le routing. */
  async function start() {
    try {
      await FC.data.load();
    } catch (err) {
      view.innerHTML = `
        <main class="container">
          <div class="empty" style="margin-top:40px">
            <h2>Référentiel indisponible</h2>
            <p>${FC.ui.esc(err.message)}</p>
            <p>Cette application charge <code>data/curriculum.json</code> : elle doit être servie via un serveur HTTP local
            (par exemple <code>python3 -m http.server</code>) et non ouverte directement depuis le système de fichiers.</p>
          </div>
        </main>`;
      return;
    }

    // En-tête : le clic sur le logo ramène au catalogue.
    const brand = document.querySelector(".brand");
    if (brand) brand.addEventListener("click", () => { location.hash = "#/"; });

    // Version dans l'en-tête.
    const v = document.querySelector(".version");
    if (v) v.textContent = "v" + FC.data.meta().version;

    window.addEventListener("hashchange", route);
    route();
  }

  start();
})();
