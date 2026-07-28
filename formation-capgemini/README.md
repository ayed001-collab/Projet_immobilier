# Plate-forme de formation — Assurance / Épargne / Retraite

Application web statique (HTML / CSS / JavaScript vanilla, **sans backend ni build**) servant de
**catalogue de formation navigable** pour les acteurs de la Bancassurance, à l'identité visuelle
Capgemini.

Le référentiel de contenus (domaines, thèmes, fiches) est **totalement découplé du code** : il vit
dans un unique fichier de données [`data/curriculum.json`](data/curriculum.json). Enrichir la
formation = éditer ce JSON, **sans toucher au code**.

---

## Sommaire

- [Aperçu fonctionnel](#aperçu-fonctionnel)
- [Choix d'architecture](#choix-darchitecture)
- [Arborescence du projet](#arborescence-du-projet)
- [Lancer l'application en local](#lancer-lapplication-en-local)
- [Schéma du référentiel (`curriculum.json`)](#schéma-du-référentiel-curriculumjson)
- [Ajouter un nouveau thème](#ajouter-un-nouveau-thème-en-5-minutes)
- [Le gabarit de fiche](#le-gabarit-de-fiche)

---

## Aperçu fonctionnel

Le catalogue est organisé en **deux parcours présentés en onglets**, qui séparent les formations
générales des formations spécialisées :

| Onglet (parcours) | Contenu | Niveau |
|---|---|---|
| **Les fondamentaux de l'assurance** | Connaissances générales / socle | Conceptuel |
| **Parcours Expert** | Actes de gestion opérationnels | Spécialisé |

1. **Onglet « Les fondamentaux de l'assurance »** : chaque thème est une **carte à double format de
   restitution** :
   - **▶ Vidéo de formation** → lecteur vidéo dédié (`#/video/<id>`) ;
   - **📄 Page de formation** → fiche web structurée (`#/theme/<id>`).

   Un thème sans vidéo affiche l'état *« Vidéo à venir »* ; la vidéo s'ajoute depuis l'espace admin.
2. **Onglet « Parcours Expert »** : chaque carte mène directement à la **fiche de formation**
   structurée (l'acte de gestion détaillé).
3. **Recherche plein texte** et **filtre par domaine** dans chaque onglet (le niveau est porté par
   l'onglet lui-même).
4. **Fiche de formation** : un **gabarit unique** rempli dynamiquement depuis le JSON — fil
   d'Ariane, badges, sommaire ancré, et sections standardisées (définition, objectifs, parcours de
   l'acte de gestion, règles de gestion, réglementation, fiscalité, points de vigilance, logigramme,
   quiz, sources).
5. **Espace admin** (`#/admin`) : gestion des **vidéos** des thèmes fondamentaux (voir plus bas).

Exemples de thèmes fournis :

| Parcours | Thèmes d'exemple |
|---|---|
| Fondamentaux | *Principes de l'assurance-vie*, *Fiscalité de l'assurance-vie*, *Cadre réglementaire de la retraite* |
| Expert | *Liquidation retraite (PERO)*, *Rachat partiel*, *Arbitrage*, *Transfert Loi Pacte* |

> La fiche **« Liquidation retraite (PERO) »** est entièrement renseignée et sert de **modèle de
> référence** (badge « Fiche modèle » dans le catalogue).

### Formats de restitution & espace admin (vidéos)

L'application est **statique (sans backend)**. La gestion des vidéos est donc conçue en conséquence :

- Depuis l'**espace admin** (lien en en-tête, ou `#/admin`), l'administrateur associe à chaque thème
  fondamental une vidéo, de deux manières :
  1. **Lien hébergé** : URL **YouTube**, **Vimeo** ou **fichier `.mp4`** — pris en compte
     immédiatement.
  2. **Upload d'un fichier local** : lu via la **File API** et jouable **le temps de la session**.
- La configuration est **persistée dans le navigateur** (`localStorage`) et **surcharge** la vidéo
  éventuellement définie dans `curriculum.json`.
- Pour une **diffusion permanente et partagée**, deux étapes :
  1. déposer le fichier vidéo dans [`assets/videos/`](assets/videos/) ;
  2. cliquer **« Exporter la configuration (JSON) »** et reporter chaque entrée sous la clé `video`
     du thème concerné dans `data/curriculum.json`.

> Une évolution avec backend / stockage objet permettrait l'upload persistant et multi-utilisateurs ;
> l'architecture actuelle (contenu piloté par JSON) s'y prête sans refonte.

---

## Choix d'architecture

**SPA légère en JavaScript vanilla avec routing par hash**, préférée à React ou à une génération de
pages HTML statiques. Justification :

- **Aucun build, aucune dépendance** : l'application se lance en servant simplement le dossier ;
  elle est 100 % offline et compatible avec des politiques de sécurité strictes (CSP).
- **Contenu découplé** : un seul gabarit de fiche, rempli à la volée depuis le JSON. Ajouter un
  thème n'ajoute **aucune page** ni **aucun code** — contrairement à des pages HTML statiques qui
  dupliqueraient le gabarit et complexifieraient l'enrichissement.
- **URL par thème** (`#/theme/<id>`) : partage et navigation directs, sans framework.
- React n'apporterait aucun bénéfice à cette échelle tout en imposant une chaîne d'outillage.

---

## Arborescence du projet

```
formation-capgemini/
├── index.html              # Shell de l'application (en-tête, conteneur de vue, pied de page)
├── css/
│   └── styles.css          # Design system Capgemini (bleu #0070AD), responsive
├── js/
│   ├── data.js             # Chargement + indexation du référentiel, filtres, parcours, vidéos
│   ├── ui.js               # Helpers de rendu partagés (échappement, badges)
│   ├── catalogue.js        # Vue catalogue : onglets parcours, cartes, filtres, recherche
│   ├── fiche.js            # GABARIT UNIQUE de fiche (rendu dynamique des sections)
│   ├── video.js            # Vue lecteur vidéo (fichier / URL / YouTube / Vimeo)
│   ├── admin.js            # Espace admin : gestion / upload des vidéos
│   └── app.js              # Bootstrap + routeur SPA (hash)
├── data/
│   └── curriculum.json     # ► LE RÉFÉRENTIEL : domaines, taxonomie, thèmes et contenus
├── assets/
│   ├── favicon.svg
│   └── videos/             # Fichiers vidéo déposés pour diffusion permanente
└── README.md
```

---

## Lancer l'application en local

L'application charge `data/curriculum.json` via `fetch`, elle doit donc être servie par un
**serveur HTTP local** (l'ouverture directe du fichier `index.html` via `file://` est bloquée par
les navigateurs pour des raisons de sécurité).

Au choix, depuis le dossier `formation-capgemini/` :

```bash
# Python (présent par défaut sur la plupart des postes)
python3 -m http.server 8080

# ou Node.js
npx serve .

# ou PHP
php -S localhost:8080
```

Puis ouvrir **http://localhost:8080** dans le navigateur.

---

## Schéma du référentiel (`curriculum.json`)

```jsonc
{
  "meta":     { "titre", "sousTitre", "version", "description", "avertissement" },
  "niveaux":  [ { "id": "conceptuel|specialise", "libelle", "description" } ],
  "types":    [ { "id": "connaissance-generale|acte-de-gestion", "libelle", "description" } ],

  "domaines": [
    {
      "id": "assurance-vie",
      "nom": "Assurance-vie",
      "description": "…",
      "sousDomaines": [ { "id": "socle-av", "nom": "Socle & principes" } ]
    }
  ],

  "themes": [
    {
      "id": "liquidation-retraite-pero",   // identifiant unique (sert d'URL)
      "titre": "Liquidation retraite (PERO)",
      "domaine": "retraite-collective",    // -> domaines[].id
      "sousDomaine": "pero",               // -> domaines[].sousDomaines[].id
      "niveau": "specialise",              // -> niveaux[].id
      "type": "acte-de-gestion",           // -> types[].id
      "resume": "…",
      "dureeEstimee": "45 min",
      "themePilote": true,                 // (optionnel) affiche le badge "Fiche modèle"
      "video": {                           // (optionnel) vidéo de formation (parcours Fondamentaux)
        "type": "url",                     //   "url" | "youtube" | "vimeo" | "fichier"
        "src": "https://…/video.mp4",      //   URL, ou "assets/videos/xxx.mp4" pour un fichier
        "titre": "…",
        "duree": "8 min"
      },
      "sections": { /* voir ci-dessous */ }
    }
  ]
}
```

### Sections d'une fiche (toutes optionnelles)

Une section absente n'est **simplement pas affichée**. Le même gabarit s'adapte à toutes les fiches.

| Clé | Type | Rendu |
|---|---|---|
| `definition` | `string[]` | Paragraphes d'introduction |
| `conceptsCles` | `[{ terme, definition }]` | Glossaire (affiché sous la définition) |
| `objectifs` | `string[]` | Liste à puces |
| `etapes` | `[{ titre, acteur?, description }]` | **Logigramme / stepper** numéroté (fiches spécialisées) |
| `reglesGestion` | `string[]` | Liste à puces |
| `reglementation` | `[{ reference, description }]` | Tableau |
| `fiscalite` | `[{ situation, traitement }]` | Tableau |
| `vigilance` | `string[]` | Liste à puces (accent rouge) |
| `schemaMermaid` | `string` | Code du logigramme (notation Mermaid) |
| `quiz` | `[{ question, options[], reponse, explication }]` | Quiz interactif auto-corrigé |
| `sources` | `[{ libelle, url? }]` | Liste de références |

---

## Ajouter un nouveau thème (en 5 minutes)

1. Ouvrir [`data/curriculum.json`](data/curriculum.json).
2. *(Si besoin)* Vérifier que le **domaine** et le **sous-domaine** visés existent dans `domaines`.
   Sinon, les ajouter.
3. Dans le tableau `themes`, **dupliquer un thème existant** (par ex. `rachat-partiel`) et adapter :
   - `id` : un identifiant **unique** (minuscules, tirets) — il devient l'URL `#/theme/<id>` ;
   - `titre`, `domaine`, `sousDomaine`, `niveau`, `type`, `resume`, `dureeEstimee` ;
   - le contenu de `sections` (ne garder que les sections utiles).
4. Enregistrer le fichier, **rafraîchir le navigateur**. Le thème apparaît automatiquement dans le
   catalogue, filtrable et consultable. **Aucune modification de code n'est nécessaire.**

Exemple minimal :

```json
{
  "id": "versement-programme",
  "titre": "Versement programmé",
  "domaine": "assurance-vie",
  "sousDomaine": "gestion-av",
  "niveau": "specialise",
  "type": "acte-de-gestion",
  "resume": "Mettre en place des versements automatiques réguliers sur un contrat.",
  "dureeEstimee": "15 min",
  "sections": {
    "definition": ["Le versement programmé consiste à…"],
    "objectifs": ["Paramétrer un versement récurrent", "Contrôler le mandat de prélèvement"],
    "etapes": [
      { "titre": "1. Recueil du mandat", "acteur": "Gestionnaire", "description": "…" }
    ],
    "sources": [{ "libelle": "Procédure interne", "url": "" }]
  }
}
```

> **Astuce qualité** : après édition, valider le JSON avec
> `python3 -c "import json;json.load(open('data/curriculum.json'));print('OK')"`.

---

## Le gabarit de fiche

Le gabarit unique est implémenté dans [`js/fiche.js`](js/fiche.js). L'ordre, le titre et l'icône de
chaque section y sont déclarés dans le tableau `SECTIONS`. Pour **ajouter un nouveau type de
section** au gabarit : ajouter une entrée dans `SECTIONS` (clé, ancre, titre, icône, fonction de
rendu) et renseigner la clé correspondante dans le JSON. Le sommaire ancré et la navigation se
mettent à jour automatiquement.

---

*Contenus à visée pédagogique. Les seuils, taux et références réglementaires (Loi Pacte, CGI, Code
des assurances…) sont donnés à titre indicatif et doivent être confrontés aux textes officiels et
aux procédures internes en vigueur avant toute application opérationnelle.*
