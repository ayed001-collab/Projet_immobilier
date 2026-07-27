# Livraison V0.1 — pour revue & démo

> Première version du **copilote de décision immobilière** : de la conception au produit
> démontrable, transformer des données publiques fiables en recommandations
> **personnalisées, explicables et actionnables**. Cette note est le point d'entrée pour
> les relecteurs.

## 🌐 Démo web (interactive, sans installation)

**Lien** : la démo est publiée comme page web autonome (URL partagée séparément).
Elle embarque la **sortie réelle du pipeline** (échantillon de 6 communes de Gironde)
et rejoue la consultation côté navigateur.

Parcours de démo suggéré :
1. **Carte** — cliquez une **région** de France (survol = surbrillance). La
   **Nouvelle-Aquitaine** ouvre l'échantillon : agrégat régional + encart Gironde ;
   cliquez une commune → fiche (scores, décomposition, sources datées).
2. **Mon projet** — réglez revenus/apport et les **curseurs de critères** : le
   classement se recalcule en direct, avec budget d'achat et compatibilité.
3. **Comparateur** — sélectionnez 2 à 4 communes → badges automatiques.
4. **Alertes** — bouton « Simuler la publication 2025 » → alertes expliquées
   (prix, score, rang, budget).

> Périmètre de démo volontairement réduit (6 communes, données partiellement
> synthétiques). La plateforme réelle (`apps/` + `data/factory`) couvre la logique
> complète et se branche sur les vraies sources publiques.

## Périmètre livré (V0.1)

| Domaine | Livré |
|---------|-------|
| **Conception** | 18 documents ([`docs/`](.)) : BA, UX, data strategy, architectures, MVP, backlog, roadmap |
| **Data Factory** | Multi-sources (DVF, INSEE, loyers, éducation, transports), nettoyage, **historisation**, **Data Quality**, **Data Confidence** |
| **Scoring** | Home / Investment Score **explicables** (décomposition), **recalcul dynamique** des pondérations |
| **Parcours** | Home → onboarding + **financement** (budget d'achat) → **résultats** personnalisés + **recherche inversée** |
| **Décision** | **Comparateur** (badges auto), **simulateur d'investissement** (cash-flow), **export PDF** |
| **Suivi** | **Projet persistant**, **favoris**, **alertes** expliquées (évolution des scores dans le temps) |
| **Exploitation** | **Back-office data** (supervision sources, DQ, fraîcheur) |
| **Transparence** | Source + date + niveau de confiance sur chaque chiffre ; posture **non prescriptive** |

Détail incrément par incrément : voir les sections « Incrément 0 → 10 » du
[README](../README.md) et les Pull Requests **#1 à #6**.

## Lancer en local

```bash
# 1) Data Factory (produit les données de service)
cd data/factory && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python run.py && cd ../..

# 2) API de lecture (port 8000)
cd apps/api && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --port 8000 &  cd ../..

# 3) Front (port 3000)
cd apps/web && npm install && API_URL=http://localhost:8000 npm run dev
```

Ou tout en conteneurs : `cd infra && docker compose up --build` (après l'étape 1).

## Architecture en un coup d'œil

```
data/factory   Bronze→Silver→Gold : collecte, nettoyage, DQ, historisation, scoring
packages/      scoring (moteur pur, versionné) · shared (contrat d'API)
apps/api       FastAPI : lecture Gold, scoring dynamique, financement, simulation,
               projets/favoris/alertes, back-office
apps/web       Next.js + carte : Home, /projet, /comparer, /carte, /admin
infra          docker-compose (PostGIS + api + web)
```

Voir [`docs/11`](11-architecture-fonctionnelle.md) et [`docs/12`](12-architecture-technique.md).

## Qualité & CI

- **CI GitHub Actions** (4 jobs : scoring, data-factory, api, web) — verte sur `main`.
- Tests : `packages/scoring` (normalisation, monotonie, décomposition), `data/factory`
  (nettoyage DVF, dérivés, historisation, DQ, confiance), smoke API de tous les endpoints.
- Front : `tsc --noEmit` + `next build` en CI.

## Limites connues de cette V0.1

- **Données de démonstration** (fixtures Gironde) : le réseau de l'environnement de
  build bloque data.gouv/IGN. Toute la chaîne est **config-driven** pour brancher les
  vraies sources sans changer le code.
- **Régions de la démo** : contours **stylisés** (pas les géométries officielles IGN).
- **Pas d'authentification** : la persistance (projets, favoris) repose sur un
  identifiant de projet partageable, pas un compte.
- **Simulateur / financement** : estimations **indicatives**, hors fiscalité détaillée.

## Prochaines étapes (post-V0.1)

1. Branchement des **vraies sources publiques** (DVF geo-dvf, contours IGN, INSEE…).
2. **Authentification** (compte réel) + dashboard multi-projets.
3. Granularité **IRIS / quartiers** là où la data le permet.
4. Orchestration **Dagster** réelle + suites **Great Expectations**.
