# Copilote de décision immobilière — France

> Plateforme intelligente de recherche et d'aide à la décision immobilière : transformer des données publiques actualisées et fiables en recommandations **personnalisées, explicables et actionnables**, pour répondre à une question simple :
>
> **« Où devrais-je acheter un bien immobilier en France, selon mon budget, mon profil et mon objectif ? »**

Deux parcours : 🏠 **Résidence principale** · 📈 **Investissement locatif**.

> 🗺️ **Démo interactive autonome** : [`demos/`](demos/) — carte, scoring personnalisé, comparateur et alertes, sur données réelles du pipeline (échantillon Gironde), sans backend ni installation.

Ce dépôt contient d'abord la **conception produit, data et technique** (ce document et le dossier [`docs/`](docs/)). Le code applicatif viendra ensuite, en suivant la roadmap et le plan de développement définis ici.

---

## Positionnement

Il ne s'agit **pas** d'un énième portail de statistiques immobilières, mais d'un **copilote de décision** :

- il part du **projet de l'utilisateur** (budget, profil, objectif, critères pondérés) ;
- il croise ce projet avec des **données territoriales fiables et datées** ;
- il produit un **classement personnalisé** de villes / quartiers, **expliqué** ;
- il rend **la donnée transparente** : source, date, méthode, niveau de confiance ;
- il fait **vivre le projet dans le temps** (historisation + alertes) : les zones intéressantes évoluent au fil des prix, taux et données territoriales.

## Index de la documentation

| # | Document | Contenu |
|---|----------|---------|
| 00 | [Challenge du concept](docs/00-challenge-concept.md) | Incohérences, risques, données difficiles, angles morts, décisions à trancher |
| 01 | [Vision produit & personas](docs/01-vision-produit.md) | Vision, proposition de valeur, différenciation, personas, parties prenantes |
| 02 | [UX — Customer Journey & User Flows](docs/02-ux-parcours.md) | Journeys, flows, principes UX, progressive disclosure, UX de confiance |
| 03 | [UX — Wireframes](docs/03-ux-wireframes.md) | Wireframes textuels des 7 écrans principaux |
| 04 | [Modèle métier — Concepts & règles](docs/04-modele-metier.md) | Concepts, glossaire, règles de gestion |
| 05 | [Scoring](docs/05-scoring.md) | Home Score, Investment Score, Data Confidence Score, méthodologie |
| 06 | [Moteur de recommandation & recherche inversée](docs/06-recommandation.md) | Ranking, « Où puis-je acheter ? », assistant IA |
| 07 | [Data Strategy — Sources](docs/07-data-sources.md) | Catalogue des sources publiques FR, matrice Sources × Données |
| 08 | [Data Factory — Pipeline & mise à jour](docs/08-data-factory.md) | Architecture ETL/ELT, fréquences, orchestration |
| 09 | [Data Quality, traçabilité & historisation](docs/09-data-quality.md) | DQ score, contrôles, lineage, historisation |
| 10 | [Modèle de données](docs/10-modele-donnees.md) | MCD, data mapping, référentiel géographique |
| 11 | [Architecture fonctionnelle](docs/11-architecture-fonctionnelle.md) | Domaines, services, interactions |
| 12 | [Architecture technique](docs/12-architecture-technique.md) | Stack, cartographie, IA, sécurité, monitoring |
| 13 | [Exigences non fonctionnelles & RGPD](docs/13-nfr-rgpd.md) | Performance, sécurité, conformité |
| 14 | [MVP (MoSCoW)](docs/14-mvp-moscow.md) | Périmètre MVP, priorisation |
| 15 | [Backlog — Epics / Features / User Stories](docs/15-backlog.md) | Backlog avec critères d'acceptation |
| 16 | [Roadmap](docs/16-roadmap.md) | MVP → V1 → V2 → V3 |
| 17 | [Plan de développement & stack](docs/17-plan-developpement.md) | Séquencement concret, stack recommandée |

## Incrément 0 — chaîne data end-to-end (DVF → carte)

Premier incrément **exécutable** du plan de développement ([`docs/17`](docs/17-plan-developpement.md)) :
il prouve la chaîne complète **source → nettoyage → indicateur → API → carte**, avec
traçabilité (source + date + confiance) partout. *(Étendu par l'Incrément 1 ci-dessous ;
le démarrage rapide ci-après reste valable, les sorties Gold sont désormais multi-indicateurs.)*

```
data/factory  ──run.py──▶  gold/*.geojson  ──▶  apps/api (FastAPI)  ──▶  apps/web (Next.js + MapLibre)
  DVF → clean → médiane €/m² par commune     indicateur sourcé & daté     carte choroplèthe + fiche traçable
```

### Démarrage rapide

```bash
# 1) Data Factory : produit l'indicateur prix_m2 par commune (Gold)
cd data/factory && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && pytest -q && python run.py && cd ../..

# 2) API de lecture (port 8000)
cd apps/api && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --port 8000 &  cd ../..

# 3) Front carte (port 3000)
cd apps/web && npm install && API_URL=http://localhost:8000 npm run dev
```

Ou tout en conteneurs : `cd infra && docker compose up --build` (après l'étape 1).

### Périmètre & données de l'Incrément 0

- **Données** : fixtures embarquées (échantillon DVF *synthétique* + géométries
  communales *simplifiées* de Gironde, clairement étiquetées) — le réseau de cet
  environnement bloque data.gouv/IGN. La chaîne est **config-driven** : renseigner
  `DVF_SOURCE_URL` (geo-dvf) et `COMMUNES_GEOJSON` (IGN Admin Express) branche les
  vraies données sans changer le code.
- **Vérifié** : `pytest` (9 tests) ✓ · pipeline end-to-end ✓ · API (health/meta/communes) ✓ · `next build` + typecheck ✓ · intégration API↔web ✓.
- **Structure du dépôt** : `apps/{api,web}`, `data/factory`, `packages/shared`, `infra`, `.github/workflows/ci.yml`.

### Structure

```
apps/
  api/     FastAPI — lecture Gold (prix_m2 + traçabilité)
  web/     Next.js + MapLibre — carte choroplèthe + fiche
data/
  factory/ pipeline DVF (Bronze→Silver→Gold), fixtures, tests
packages/
  shared/  contrat d'API partagé
infra/     docker-compose (PostGIS + api + web), init.sql
```

## Incrément 1 — Data Factory multi-sources + qualité + historisation

Deuxième incrément : passage d'un indicateur unique à un **modèle d'indicateurs
générique multi-sources**, avec historisation, Data Quality structurée et
**couches cartographiques commutables**.

- **8 indicateurs par commune** : `prix_m2`, `tendance_prix_1an`, `loyer_m2`
  (estimé), `rendement_brut`, `population`, `revenu_median`, `ips_moyen`,
  `temps_gare_min` — chacun **sourcé, daté**, marqué mesure / calc / estimé.
- **Sources** : DVF (2 millésimes), INSEE, Carte des loyers, Éducation (IPS),
  Transports — connecteurs enfichables (`data/factory/factory/sources/`).
- **Historisation append-only** (`silver/indicator_history.csv`) : tous les
  millésimes conservés (RG-D4), pas de fraîcheur artificielle (RG-D5) → calcul de
  la **tendance de prix** entre millésimes.
- **Data Quality** : contrôles déclaratifs par indicateur (complétude, validité,
  fraîcheur, volume) → DQ score ; contrôle bloquant avant publication.
- **Data Confidence Score par zone** : agrège la qualité des indicateurs présents.
- **API enrichie** : `/api/layers`, `/api/communes` (tous indicateurs + confiance),
  `/api/communes/{code}` (+ historique).
- **Carte** : sélecteur de couches, légende dynamique, badge de confiance, fiche
  avec sources/millésimes et **sparkline d'évolution des prix**.

**Vérifié** : `pytest` (9 tests : nettoyage DVF, dérivés, historisation append-only,
DQ, confiance) ✓ · pipeline end-to-end (8 indicateurs, 6/6 zones, 54 lignes
d'historique, DQ global 90,1) ✓ · smoke API ✓ · `next build` + typecheck ✓ ·
intégration API↔web ✓.

```bash
cd data/factory && source .venv/bin/activate && python run.py   # (FACTORY_TODAY=2026-07-26 pour un run déterministe)
```

## Incrément 2 — Scoring Engine (Home & Investment Score explicables)

Troisième incrément : un **moteur de scoring** partagé qui transforme les
indicateurs en **Home Score** et **Investment Score** personnalisés, **expliqués**
et **recalculés dynamiquement** selon les pondérations de l'utilisateur.

- **`packages/scoring`** : package pur et versionné (`SCORING_VERSION`), réutilisé
  par la Data Factory (normalisation batch) et l'API (pondération à la demande).
- **Normalisation par rang percentile**, comparable entre zones, avec gestion du
  sens (`higher/lower_better`).
- **Home / Investment Score** = Σ pondérations × sous-scores, poids renormalisés
  sur les critères disponibles (RG-S4) ; chaque score porte sa **décomposition**
  (contribution de chaque critère — RG-S2), base de l'explicabilité.
- **API** : `GET /api/weights`, `POST /api/score` (classement personnalisé,
  **recalcul dynamique** — RG-S1), scores + décomposition embarqués dans les fiches.
- **Carte** : couches « Home Score » / « Investment Score » (échelle 0–100) en tête
  du sélecteur ; fiche avec les deux scores et leurs principaux facteurs.
- **Non-régression** : tests de monotonie (augmenter le poids d'un critère fort
  augmente le score), symétrie de normalisation, décomposition = score.

Exemple de recalcul dynamique (données fixtures) : en pondération par défaut,
**Gradignan** mène le Home Score (71) ; en priorité « 100 % transports »,
**Bordeaux** passe en tête (92) et Gradignan chute (8) — le classement reflète
réellement les priorités déclarées.

**Vérifié** : `pytest` scoring 7/7 + factory 9/9 · pipeline end-to-end (scores +
décomposition publiés) · smoke API (`/api/score`, `/api/weights`, recalcul
dynamique) · `next build` + typecheck · intégration API↔web.

## Incrément 3 — Parcours utilisateur (onboarding, financement, résultats)

Quatrième incrément : la **boucle de valeur complète** côté utilisateur —
*je définis mon projet → la plateforme calcule mon budget → elle classe les zones
compatibles → je comprends pourquoi.*

- **Home** (`/`) : deux portes très visibles — 🏠 résidence principale / 📈 investir.
- **Onboarding progressif** (`/projet`) : budget & **module financement** (capacité
  d'emprunt → **budget d'achat** calculé, frais inclus), surface cible, puis
  **critères pondérés avec curseurs**.
- **Résultats** : top personnalisé (score, confiance, **prix du bien-type**, badge
  « dans le budget »), explication « Surtout : … », et carte du score personnalisé.
- **Recherche inversée « Où puis-je acheter ? »** : avec budget + surface, les zones
  compatibles remontent en tête (RG-R2) ; une zone hors budget n'est jamais masquée.
- **Explorer** (`/carte`) : la carte multi-couches des incréments 1–2 reste accessible.

Back-end ajouté : `POST /api/finance` (capacité d'emprunt & budget d'achat, RG-B) et
extension budget de `POST /api/score` (prix du bien-type + compatibilité).

**Vérifié** : parcours end-to-end capturé (Home → budget 393 997 € → 6 zones classées
et compatibles) · smoke API (`/api/finance`, recherche inversée) · `next build` +
typecheck · intégration API↔web.

## Incrément 4 — Comparateur (écran 5)

Cinquième incrément : comparer **2 à 4 zones côte à côte** et faire ressortir
automatiquement le meilleur choix par catégorie.

- **API** : `POST /api/compare` → indicateurs + scores + confiance des zones
  sélectionnées, avec **badges automatiques** : meilleur choix pour le profil,
  meilleur rapport qualité/prix, meilleur potentiel, meilleure qualité de vie,
  meilleur rendement.
- **Front** (`/comparer`) : sélecteur de zones (2–4), tableau comparatif avec
  **meilleure valeur par ligne surlignée** (sens de l'indicateur respecté : prix
  et temps de trajet « plus bas = mieux »), bascule Résidence / Investir, badges
  de synthèse. Les indicateurs de contexte (loyer, population) ne désignent pas
  de « gagnant ».

**Vérifié** : comparateur end-to-end capturé (Bordeaux / Talence / Gradignan) ·
smoke API (`/api/compare`, badges, validation 2–4 zones) · `next build` +
typecheck · intégration API↔web.

## Incrément 5 — Projet persistant (différenciateur)

Sixième incrément : le **projet immobilier persistant** — sauvegarder son projet,
le recharger via un lien, et **suivre l'évolution des scores dans le temps**.

- **API** : `POST/GET/PUT /api/projects` — persistance **SQLite** (sans service
  externe ni authentification lourde ; l'identifiant fait office de clé). À la
  sauvegarde, un **snapshot** du classement est figé ; au rechargement, le
  classement courant est recalculé et le **delta par zone** (`score_delta`,
  `rank_delta`) est exposé — socle du suivi dans le temps et des futures alertes.
- **Front** (`/projet`) : bouton **Sauvegarder**, lien partageable `?id=…`,
  rechargement automatique du projet (critères + résultats + deltas). La logique de
  classement est factorisée (`app/ranking.py`, réutilisée par `/api/score`).

Combiné à l'historisation multi-millésimes (incrément 1), ce mécanisme donne tout
son sens à l'actualisation des données : un même projet voit son classement évoluer
à mesure que prix, loyers et indicateurs territoriaux changent.

**Vérifié** : cycle sauvegarde → rechargement par URL capturé (projet restauré,
1 ligne en base) · smoke API (création + rechargement + delta + 404) · `next build`
+ typecheck · intégration API↔web.

## Incrément 6 — Back-office data (Épic 9)

Septième incrément : la **supervision des données** — dernier « Must » du MVP.

- **Data Factory** : publie `admin_sources.json` — état par famille de source
  (DVF, INSEE, Loyers, Rendement, Éducation, Transports) : indicateurs produits,
  dernière donnée (millésime), dernière/prochaine collecte, fréquence, DQ, statut.
- **API** : `GET /api/admin/sources` (supervision), `GET /api/admin/runs` (lineage +
  DQ par indicateur), `POST /api/admin/reload` (recharge le cache après un run ;
  le déclenchement du pipeline relève de l'orchestrateur).
- **Front** (`/admin`) : tableau de bord — statut ✓/⚠ par source, DQ colorée,
  fraîcheur, prochaine collecte, et qualité par indicateur (complétude, fraîcheur,
  volume). Les sources « anciennes » (INSEE 2021, Transports) sont **signalées**,
  jamais masquées.

**Vérifié** : back-office end-to-end capturé (6 sources, DQ global 90,1, 2 sources
signalées) · smoke API (`/api/admin/*`) · `next build` + typecheck · intégration API↔web.

## Incrément 7 — Alertes (suivi dans le temps)

Huitième incrément : les **alertes** qui bouclent la promesse du produit — un
projet sauvegardé prévient l'utilisateur quand le marché bouge, **en expliquant
pourquoi**.

- **API** : `GET /api/projects/{id}/alerts` — compare le **snapshot** du projet
  (incrément 5) au classement courant et génère des évènements **expliqués** :
  évolution de prix, de score (avec le facteur déclencheur), de rang, entrée/sortie
  du budget. Seuils anti-bruit (RG-A3) ; snapshot enrichi (prix par zone).
- **Front** (`/projet`) : panneau **🔔 Alertes** au rechargement d'un projet, et les
  puces de delta (▲/▼) sur chaque zone.
- **Boucle complète démontrée** : sauvegarde d'un projet sur les données 2024 →
  publication d'un millésime **DVF 2025** par la Data Factory (prix non uniformes,
  Gradignan +18,9 %) → rechargement du cache (`/api/admin/reload`, incrément 6) →
  alertes : *« Gradignan sort de votre budget »*, *« score −20 (71→51), porté par
  l'évolution du prix +18,9 % »*, *« recule #1 → #6 »*, pendant que les autres
  zones progressent.

**Vérifié** : scénario 2024→2025 end-to-end capturé (10 évolutions expliquées) ·
smoke API (alertes + 404) · `next build` + typecheck · intégration API↔web.

## Incrément 8 — Export PDF d'une analyse

Première brique V1 « Should » côté partage : depuis l'écran Résultats, un bouton
**« Exporter PDF »** produit un rapport imprimable (via l'impression du navigateur →
*Enregistrer en PDF*, sans dépendance) : en-tête du projet (budget, bien-type, date),
tableau des zones classées (score, prix du bien-type, compatibilité budget, confiance,
facteurs clés), méthode et mention **non-conseil**. Le chrome de l'application est
masqué à l'impression via une feuille de style `@media print` dédiée.

**Vérifié** : rapport rendu en média `print` + PDF généré, `next build` + typecheck.

## Incrément 9 — Simulateur d'investissement enrichi

Complète le parcours **Investir** : dans l'écran Résultats, un simulateur calcule,
pour une commune choisie, le **cash-flow** et les rendements.

- **API** `POST /api/simulate` : coût total (prix + frais), mensualité de crédit,
  **rendement brut** et **rendement net** (après charges, taxe foncière et vacance),
  **cash-flow** mensuel/annuel. Hypothèses ajustables (charges %, vacance %).
- **Front** : carte de simulation dans les résultats Investir — sélection de la
  commune, réglage des hypothèses, cash-flow coloré (positif/négatif). Étiqueté
  **« estimation indicative — hors fiscalité »**.

**Vérifié** : `/api/simulate` (flux front reproduit : Gradignan bien-type 70 m² →
rendement brut 3,68 % / net 2,05 % / cash-flow −790 €/mois), CI (smoke + validation),
`next build` + typecheck.

## Avertissement

Les recommandations produites par cette plateforme sont des **aides à la décision**, jamais des conseils en investissement au sens réglementaire. L'utilisateur reste **seul décisionnaire**. Aucune donnée n'est présentée sans source ni date, et aucune prévision n'est présentée comme une certitude.
