# Copilote de décision immobilière — France

> Plateforme intelligente de recherche et d'aide à la décision immobilière : transformer des données publiques actualisées et fiables en recommandations **personnalisées, explicables et actionnables**, pour répondre à une question simple :
>
> **« Où devrais-je acheter un bien immobilier en France, selon mon budget, mon profil et mon objectif ? »**

Deux parcours : 🏠 **Résidence principale** · 📈 **Investissement locatif**.

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

## Avertissement

Les recommandations produites par cette plateforme sont des **aides à la décision**, jamais des conseils en investissement au sens réglementaire. L'utilisateur reste **seul décisionnaire**. Aucune donnée n'est présentée sans source ni date, et aucune prévision n'est présentée comme une certitude.
