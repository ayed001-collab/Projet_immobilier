# Plate-forme de formation — Assurance / Épargne / Retraite

Application web statique (HTML / CSS / JavaScript vanilla, **sans backend ni build**) servant de
**catalogue de formation navigable** pour les acteurs de la Bancassurance, à l'identité visuelle
Capgemini.

Le référentiel de contenus (domaines, thèmes, fiches) est **totalement découplé du code** : il vit
dans un unique fichier de données [`data/curriculum.json`](data/curriculum.json). Enrichir la
formation = éditer ce JSON, **sans toucher au code**.

> 🔗 **Démo en ligne (POC)** : https://ayed001-collab.github.io/Projet_immobilier/
> — lien partageable aux utilisateurs, publié automatiquement sur GitHub Pages.
> Hébergement statique : l'espace admin y fonctionne en **mode local** (les vidéos par URL / YouTube
> se lisent ; l'upload de fichier persistant nécessite le backend, cf. plus bas).
>
> **Version autonome (single-file)** : l'application supporte un *mode embarqué* — si les globals
> `window.FC_EMBEDDED` / `window.FC_EMBEDDED_CURRICULUM` sont définis, le référentiel est lu depuis
> la page (aucun `fetch`), ce qui permet d'empaqueter tout le POC dans un unique fichier HTML
> hors-ligne (utile pour un envoi direct ou un hébergement sans serveur).

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

Depuis l'**espace admin** (lien en en-tête, ou `#/admin`), l'administrateur associe à chaque thème
fondamental une vidéo, de deux manières :

1. **Lien hébergé** : URL **YouTube**, **Vimeo** ou **fichier `.mp4`**.
2. **Upload d'un fichier vidéo** (`.mp4`, `.webm`…).

L'application fonctionne selon **deux modes**, détectés automatiquement (un indicateur ● Connecté /
○ Local est affiché dans l'espace admin) :

| | **Mode connecté** (backend lancé) | **Mode local** (pur statique, repli) |
|---|---|---|
| Upload de fichier | **Persisté sur le serveur** (`assets/videos/`), visible par tous | Jouable **le temps de la session** (File API) |
| Configuration | `server/storage/videos.json` (serveur) | `localStorage` (navigateur) |
| Diffusion permanente | **Automatique** | Déposer le fichier dans `assets/videos/` + exporter la config vers `curriculum.json` |

> **En clair** : pour un **vrai upload persistant et partagé entre utilisateurs**, lancez le backend
> (voir ci-dessous). Sans backend, l'app reste pleinement utilisable pour la consultation et la
> configuration de vidéos par URL, l'upload de fichier étant alors limité à la session.

Dans les deux cas, une vidéo configurée par l'admin **surcharge** celle éventuellement définie dans
`curriculum.json`.

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
- **Backend optionnel et découplé** : le front reste statique ; un petit service FastAPI
  (`server/`) s'ajoute uniquement pour l'**upload persistant** des vidéos, sans modifier le reste.
  Le front bascule automatiquement en mode connecté si l'API répond, sinon il fonctionne en pur
  statique (repli `localStorage`).

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
│   └── videos/             # Fichiers vidéo uploadés (servis par le backend)
├── server/                 # Backend OPTIONNEL (upload persistant)
│   ├── app.py              # API FastAPI + service du front statique
│   ├── requirements.txt
│   └── storage/
│       └── videos.json     # Mapping persistant thème -> vidéo (généré à l'exécution)
└── README.md
```

---

## Lancer l'application en local

L'application charge `data/curriculum.json` via `fetch`, elle doit donc être servie par un
**serveur HTTP** (l'ouverture directe du fichier `index.html` via `file://` est bloquée par les
navigateurs pour des raisons de sécurité). Deux options selon le besoin.

### Option A — Statique (consultation + config par URL)

Depuis le dossier `formation-capgemini/` :

```bash
python3 -m http.server 8080      # ou : npx serve .   |   php -S localhost:8080
```

Puis ouvrir **http://localhost:8080**. L'espace admin fonctionne en **mode local** (voir plus haut).

### Option B — Avec backend (upload persistant + récupération des métadonnées) ⭐

Le backend est nécessaire pour deux fonctions : l'**upload de vidéos persistant** et la
**récupération automatique des métadonnées d'articles** (Actualités), qui se fait côté serveur.

#### Prérequis

| Prérequis | Détail |
|---|---|
| **Python** | 3.9 ou plus récent (testé sur 3.11). C'est le seul prérequis système. |
| **Dépendances** | 3 paquets pip (voir `server/requirements.txt`) : `fastapi`, `uvicorn[standard]`, `python-multipart`. Installés en une commande. |
| **Base de données** | **Aucune.** Les données sont des fichiers JSON dans `server/storage/` (créés automatiquement). |
| **Disque** | Accès en écriture à `server/storage/` et `assets/videos/`. |
| **Réseau** | Accès **HTTPS sortant** depuis le serveur vers les sites d'articles (pour la récupération des métadonnées). Derrière un proxy d'entreprise, définir `HTTPS_PROXY` / `HTTP_PROXY`. |
| **Navigateur** | Aucun prérequis particulier (le front est du HTML/CSS/JS standard). |

> Aucune nouvelle dépendance au-delà de ces 3 paquets ; tout le reste s'appuie sur la bibliothèque
> standard de Python.

#### Lancement

```bash
cd formation-capgemini
pip install -r server/requirements.txt
uvicorn server.app:app --port 8000        # ajouter --reload en développement
```

Ou en **une seule commande** (crée un environnement virtuel, installe et démarre) :

```bash
./server/run.sh                # variables : PORT, FORMATION_ADMIN_PASSWORD…
```

Ou **sans rien installer, avec Docker** (seul prérequis : Docker) :

```bash
cd formation-capgemini
docker build -f server/Dockerfile -t formation-veille .
docker run -p 8000:8000 -e FORMATION_ADMIN_PASSWORD="votre-mdp" \
  -v "$PWD/server/storage:/app/server/storage" -v "$PWD/assets/videos:/app/assets/videos" \
  formation-veille
```

Puis ouvrir **http://localhost:8000**. L'espace admin passe automatiquement en **mode connecté** :
les fichiers uploadés sont stockés dans `assets/videos/`, la configuration dans
`server/storage/` (vidéos, visibilité, actualités).

### Option C — Lien public partageable AVEC backend (déploiement) 🌐

Pour obtenir une **URL publique** (auto-récupération des métadonnées + persistance partagée),
déployez l'image Docker (`server/Dockerfile`) sur un hébergeur. Le conteneur écoute le port injecté
par l'hôte (`$PORT`). Le dépôt étant un monorepo, on pointe l'hébergeur sur le sous-dossier.

**Render (recommandé, offre gratuite)** — depuis le dépôt GitHub :
1. [render.com](https://render.com) → **New +** → **Web Service** → connecter le dépôt
   `ayed001-collab/Projet_immobilier` (branche du POC ou `main`).
2. **Root Directory** : `formation-capgemini` · **Runtime** : `Docker` ·
   **Dockerfile Path** : `server/Dockerfile`.
3. **Environment** → ajouter les variables :
   `FORMATION_ADMIN_PASSWORD` (mot de passe admin), `FORMATION_SECRET` (chaîne aléatoire longue).
4. **Health Check Path** : `/api/health`. Créer le service → URL publique
   `https://<nom>.onrender.com`.

**Railway** (équivalent) : *New Project* → *Deploy from GitHub repo* → **Root Directory**
`formation-capgemini`, build par `server/Dockerfile` ; mêmes variables d'environnement.

> **Persistance** : sur les offres gratuites, le disque est éphémère (les données repartent à zéro
> après un redéploiement / une mise en veille). Pour une démo durable, ajouter un disque persistant
> monté sur `/app/server/storage` **et** `/app/assets/videos` (option payante chez la plupart des hôtes).
>
> **Sécurité** : le service devenant public, **définissez toujours `FORMATION_ADMIN_PASSWORD` et
> `FORMATION_SECRET`** (sinon un mot de passe aléatoire est généré et visible dans les logs). Servez
> derrière HTTPS (fourni par défaut par Render / Railway).
>
> **Sans carte bancaire** : *Hugging Face Spaces* (SDK Docker) fonctionne aussi ; il faut alors placer
> le contenu de `formation-capgemini/` à la racine du dépôt du Space et exposer le port 7860.

**API exposée** (préfixe `/api`) :

| Méthode | Route | Auth | Rôle |
|---|---|:--:|---|
| `GET` | `/api/health` | — | État du service |
| `POST` | `/api/login` | — | Échange mot de passe → jeton de session |
| `GET` | `/api/videos` | — | Configuration des vidéos (lecture, publique) |
| `PUT` | `/api/videos/{themeId}` | 🔒 | Associer une vidéo par URL (YouTube / Vimeo / .mp4) |
| `POST` | `/api/videos/{themeId}/upload` | 🔒 | Uploader un fichier vidéo (multipart) |
| `DELETE` | `/api/videos/{themeId}` | 🔒 | Retirer la vidéo (et supprimer le fichier uploadé) |
| `GET` | `/api/formations` | — | Statut de visibilité des formations (lecture, publique) |
| `PUT` | `/api/formations/{themeId}` | 🔒 | Définir le statut : `visible` / `hidden` / `deleted` |
| `GET` | `/api/news` | — | Articles publiés (page utilisateur), du plus récent au plus ancien |
| `GET` | `/api/admin/news` | 🔒 | Tous les articles (admin) |
| `POST` | `/api/news` | 🔒 | Créer un article (dédup sur l'URL → 409) |
| `PUT` | `/api/news/{id}` | 🔒 | Modifier / (dé)publier un article |
| `DELETE` | `/api/news/{id}` | 🔒 | Supprimer un article |
| `POST` | `/api/news/fetch-metadata` | 🔒 | Récupérer titre/description/image/source depuis une URL (côté serveur) |

### Actualités & Veille du secteur

Onglet **« Veille sectorielle »** (écran d'accueil) : les articles **publiés** s'affichent en cartes
(image, titre, description, source, date, bouton « Lire l'article » ouvrant la source dans un
nouvel onglet). Le contenu de l'article n'est jamais copié dans la plate-forme.

Depuis l'espace admin → **« Gestion des actualités »**, l'administrateur ajoute un article à partir
de son **URL** : en mode connecté, le serveur récupère les métadonnées Open Graph
(`og:title`, `og:description`, `og:image`, `og:site_name`, avec repli sur les balises HTML) —
**côté serveur pour éviter les problèmes de CORS**. Les champs restent **toujours modifiables**
avant publication, et la saisie manuelle reste possible si la récupération échoue.

- **Sécurité** : URLs `http(s)` uniquement, timeout, taille limitée, blocage des cibles internes
  (localhost / IP privées) avant toute requête serveur ; le JavaScript du site externe n'est jamais
  exécuté.
- **Images** : seule l'URL de l'`og:image` est stockée (pas de téléchargement) ; une image générique
  « Actualités Assurance » sert de repli si l'image est absente ou indisponible.
- **Performance** : les métadonnées ne sont récupérées qu'à l'ajout ; l'affichage lit ensuite la base.
- **Mode local** (sans backend) : stockage `localStorage` et saisie manuelle (la récupération auto
  nécessite le backend).

### Visibilité des formations (masquer / supprimer)

Depuis l'espace admin, chaque formation (des **deux parcours**) dispose de contrôles de visibilité :

- **Masquer / Réafficher** : retire la formation de l'espace utilisateur sans la perdre (réversible).
- **Supprimer / Restaurer** : la formation disparaît de l'espace utilisateur *et* n'est plus
  accessible par lien direct ; l'admin peut la **restaurer** (suppression réversible, non
  destructive du référentiel `curriculum.json`).

Les statuts sont persistés **côté serveur** (mode connecté, valable pour tous les utilisateurs) ou
en **localStorage** (mode local). Une formation `hidden` reste atteignable par lien direct
(non listée) ; une formation `deleted` est bloquée aussi en accès direct.

Pour les thèmes **Fondamentaux** (à double format), l'admin peut en plus **afficher/masquer
indépendamment** chaque bouton de restitution proposé aux utilisateurs :

- **bouton « Vidéo de formation »** (drapeau `videoHidden`) ;
- **bouton « Page de formation »** (drapeau `pageHidden`).

Ces drapeaux se combinent avec le statut de visibilité et sont envoyés à
`PUT /api/formations/{themeId}` (fusion des champs fournis).

### Authentification de l'espace admin 🔒

Seules les routes d'**écriture** (upload, association, suppression) sont protégées ; la
**consultation reste publique**. Le contrôle réel est **côté serveur** : l'écran de connexion du
front n'est qu'une commodité (le SPA est public par nature, la sécurité est portée par l'API).

- **Mot de passe** : variable d'environnement `FORMATION_ADMIN_PASSWORD`. Si elle n'est pas
  définie, un mot de passe **aléatoire est généré et affiché dans la console** au démarrage (motif
  « token Jupyter » : sécurisé par défaut, zéro configuration pour essayer).
- **Jetons** : `/api/login` renvoie un **jeton signé HMAC-SHA256** à expiration (8 h par défaut,
  `FORMATION_TOKEN_TTL`). Le front le stocke en `sessionStorage` et l'envoie en `Authorization:
  Bearer …` sur les écritures. Un `401` renvoie automatiquement l'utilisateur à l'écran de connexion.
- **Secret de signature** : `FORMATION_SECRET` (à fixer pour que les sessions survivent aux
  redémarrages et soient valides entre plusieurs workers ; sinon généré aléatoirement par processus).

```bash
# Lancer avec un mot de passe et un secret fixés
export FORMATION_ADMIN_PASSWORD="votre-mot-de-passe"
export FORMATION_SECRET="une-chaine-longue-et-aleatoire"
uvicorn server.app:app --port 8000

# Exemple d'appel authentifié
TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"password":"votre-mot-de-passe"}' http://localhost:8000/api/login | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -H "Authorization: Bearer $TOKEN" -F "file=@formation.mp4" -F "titre=…" \
  http://localhost:8000/api/videos/principes-assurance-vie/upload
```

> Pistes de durcissement pour une mise en production : HTTPS (terminaison TLS en amont), comptes
> multiples / rôles, journalisation des accès, et hachage du mot de passe (bcrypt) si stocké.

> **Évolution vers un stockage objet (S3…)** : seules les fonctions de stockage de
> [`server/app.py`](server/app.py) (`save_config`, écriture dans `VIDEO_DIR`) sont à remplacer par
> des appels au bucket. Le front et le contrat d'API restent inchangés.

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
