# 17 — Plan de développement concret & stack

> Traduction opérationnelle de la conception en **incréments livrables**. Chaque incrément produit quelque chose de démontrable. La stack de référence est celle du doc 12.

## Stack de référence (rappel)

| Couche | Techno |
|--------|--------|
| Front | Next.js + TypeScript, MapLibre GL, Recharts/visx, TanStack Query, PWA |
| API | Python + FastAPI (REST + GraphQL ciblé), OIDC/magic link |
| Données | PostgreSQL 16 + PostGIS, Redis, object storage S3-UE (Bronze) |
| Data Factory | Dagster (orchestr.), dbt (transfo/tests), Great Expectations (DQ), OSRM/OTP (isochrones), tippecanoe (tuiles MVT) |
| IA | API Claude (tool use) — V1 |
| Infra | Docker + K8s, hébergement UE, Terraform, GitHub Actions |
| Observabilité | Prometheus/Grafana, Sentry, Loki |

## Organisation du dépôt (proposée)

```
/apps
  /web            # Next.js (front)
  /api            # FastAPI (services métier, lecture Gold)
/data
  /factory        # Dagster assets + connecteurs sources
  /dbt            # transformations Silver→Gold + tests
  /quality        # Great Expectations suites
  /geo            # scripts OSM/OSRM, tuiles MVT
/packages
  /scoring        # moteur de scoring (partagé, versionné)
  /shared         # types, schémas, contrats API
/infra            # Terraform, k8s, CI/CD
/docs             # cette documentation
```

## Séquencement en incréments

### Incrément 0 — Socle & chaîne data end-to-end (dé-risquage n°1)
- Mise en place repo, CI/CD, environnements dev/staging.
- PostGIS + référentiel géo (COG, contours IGN, BAN) pour **1 région**.
- Dagster + Bronze/Silver/Gold + connecteur **DVF** → indicateur `prix_m2` par commune.
- API lecture minimale + carte MapLibre affichant les prix (tuiles MVT).
- **Livrable démontrable** : « je vois les prix DVF sur la carte, sourcés et datés ».

### Incrément 1 — Data Factory multi-sources + qualité
- Connecteurs INSEE, Loyers, Éducation, Transports.
- Nettoyage DVF robuste (médiane, outliers) ; rattachement géo ; **historisation** (append-only, millésimes).
- QC entrée/sortie (Great Expectations) **bloquante** ; métadonnées de run.
- Pré-calcul isochrones vers pôles majeurs (OSRM).
- **Livrable** : indicateurs fiables, datés, historisés sur 2–3 régions + DQ score.

### Incrément 2 — Scoring Engine
- `packages/scoring` : normalisation par rang, sous-scores, Home/Investment/Confidence, **décomposition** stockée.
- Config scoring versionnée ; tests de non-régression (monotonie, bornes).
- **Livrable** : scores par zone + confiance + breakdown, exposés par l'API.

### Incrément 3 — Parcours utilisateur (front)
- Onboarding progressif (RP + Invest) + curseurs de pondération.
- Module financement (budget d'achat calculé).
- Écran Résultats : carte + top + recalcul dynamique.
- Fiche zone (scores, sous-scores, points forts/faibles, « pourquoi ») + transparence (« comment calculé »).
- **Livrable** : boucle « projet → top expliqué » sur données réelles.

### Incrément 4 — Comparateur, simulateur, recherche inversée
- Comparateur 2–4 zones + badges auto.
- Simulateur simple (mensualité/endettement ; rendement/cash-flow basique, « indicatif »).
- Recherche inversée « Où puis-je acheter ? » (filtres + budget + isochrones).
- **Livrable** : parcours décisionnel complet.

### Incrément 5 — Compte, projet persistant, back-office
- Auth (OIDC/magic link), compte, **sauvegarde de projet**, favoris, RGPD (export/suppression).
- Back-office data : statut sources, dernier run, DQ, relance manuelle, recalcul.
- **Livrable = MVP complet** (Definition of Done, doc 14 §4).

### Incrément 6 — Scale national + durcissement
- Passage France métropolitaine ; optimisation tuiles/perf ; monitoring complet ; sécurité durcie.
- **Livrable** : MVP national stable.

### Puis V1 (voir roadmap) — Alertes, historique visualisé, sources profondes (Sécurité/Env./DPE), IRIS, Assistant IA, export PDF.

## Pratiques d'ingénierie
- **Contrats d'API** typés partagés (`packages/shared`) ; schémas versionnés.
- **Config-driven** : scoring, DQ, fréquences en configuration versionnée (pas en dur).
- **Tests** : unitaires (scoring, financement), data tests (dbt/GE), e2e front, tests de reproductibilité du classement.
- **Migrations** DB versionnées ; données de dev réduites (2–3 départements) pour itérer vite.
- **Revue métier** du scoring à chaque incrément data (éviter les scores contre-intuitifs).
- **Observabilité dès l'incrément 0** ; alerting sur jobs et DQ.

## Risques d'exécution & parades (rappel synthétique)
| Risque | Parade |
|--------|--------|
| Sous-estimer le nettoyage DVF | Incrément 0/1 dédié, revue qualité tôt |
| Coût/temps des isochrones | Pré-calcul par lot vers pôles, pas à la volée au MVP |
| Scores contre-intuitifs | Décomposition + revue métier itérative |
| Dérive de périmètre (fiscalité, quartiers partout) | MoSCoW strict, WON'T assumés |
| Hallucinations IA | LLM différé en V1, pattern tool use (chiffres depuis la base) |
| RGPD/licences | Validation à chaque source, minimisation, hébergement UE |

## Prochaine action recommandée
Démarrer l'**Incrément 0** : initialiser le monorepo (`apps/web`, `apps/api`, `data/factory`), provisionner PostGIS, charger le référentiel géo d'une région, et brancher DVF de bout en bout jusqu'à la carte. C'est le plus court chemin vers une démonstration crédible et vers la validation du principal risque (la data).
