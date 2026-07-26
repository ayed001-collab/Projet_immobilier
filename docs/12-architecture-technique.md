# 12 — Architecture technique & stack recommandée

> Principe directeur : **stack simple, éprouvée, open-source, mono-région (France/UE), PostgreSQL+PostGIS au centre**. On évite la sur-ingénierie : aucune source n'est temps réel, le batch suffit. On optimise pour la **fraîcheur maîtrisée, la traçabilité et la performance de lecture cartographique**.

## 1. Vue d'ensemble

```
             ┌────────────────────────────────────────────┐
  Navigateur │  Front (Next.js/React) + MapLibre GL        │
   / Mobile  │  UI: carte, dashboards, comparateur, chat   │
             └───────────────┬────────────────────────────┘
                             │ HTTPS (REST/GraphQL)
             ┌───────────────┴────────────────────────────┐
   API       │  Back API (FastAPI/Python ou NestJS/Node)   │
             │  Auth · Projet · Reco · Scoring · Simu · IA  │
             └──────┬───────────────────────┬──────────────┘
                    │ lecture Gold           │ appels outils
             ┌──────┴───────┐        ┌───────┴───────────────┐
             │ PostgreSQL   │        │ AI Layer (LLM + outils)│
             │  + PostGIS   │        │  RAG sur données Gold  │
             │ (Gold+app)   │        └────────────────────────┘
             └──────┬───────┘
                    │ publication (batch)
   ┌────────────────┴───────────────────────────────────────┐
   │                    DATA FACTORY                          │
   │  Orchestrateur (Dagster/Airflow/Prefect)                 │
   │  Connecteurs (Python) → Bronze (S3) → Silver → Gold      │
   │  dbt (transfo/tests) · Great Expectations (DQ)           │
   │  OSRM/OTP (isochrones) · tuiles MVT (tippecanoe)         │
   └────────────────┬───────────────────────────────────────┘
                    │
   ┌────────────────┴───────────────────────────────────────┐
   │ Monitoring: Prometheus/Grafana · Sentry · logs · alertes│
   └─────────────────────────────────────────────────────────┘
```

## 2. Stack recommandée (par couche)

### Front-end
- **Next.js (React) + TypeScript** — SSR/SEO (fiches villes = fort potentiel SEO), mobile-first.
- **MapLibre GL JS** — cartographie vectorielle open-source (pas de dépendance Mapbox payante), heatmaps, tuiles MVT.
- **Recharts / visx / D3** — jauges, sparklines, barres (voir skill dataviz au moment du build).
- **TanStack Query** (data fetching), **Zustand/Redux** léger pour l'état projet.
- PWA (installable, offline léger) pour l'usage mobile.

### Back-end / API
- **Python + FastAPI** (recommandé : aligne back et data science/scoring dans un même langage) *ou* **Node + NestJS** si l'équipe est JS.
- API **REST** (simple) avec option **GraphQL** pour les écrans composites (fiche/dashboard).
- Auth : **OAuth2/OIDC** (Keycloak self-host ou Auth0/Clerk), JWT courts + refresh ; option **magic link** pour réduire la friction (sauvegarde de projet).

### Base de données
- **PostgreSQL 16 + PostGIS** : app + Gold (relationnel, géo, jsonb, historisation temporelle). Un seul moteur = simplicité opérationnelle.
- **Redis** : cache API, sessions, files d'attente légères.
- Object storage **S3-compatible** (Scaleway/OVH/MinIO — **hébergement UE**) pour Bronze.
- (V1+) entrepôt analytique **DuckDB/ClickHouse/BigQuery** si volumétrie/analytique l'exige.

### Data Factory (ETL/ELT)
- **Orchestrateur** : **Dagster** (recommandé pour l'approche « assets » data-aware, lineage natif) ou Airflow/Prefect.
- **Transformations** : **dbt** (SQL versionné, tests, docs, lineage) + Python (connecteurs, nettoyage DVF, calculs géo).
- **Data Quality** : **Great Expectations** (ou dbt tests + checks custom) pour QC entrée/sortie bloquants.
- **Géo/itinéraires** : **OSRM** ou **OpenTripPlanner** pour temps de trajet/isochrones pré-calculés ; **osmium/GDAL** pour l'OSM ; **tippecanoe** pour générer les **tuiles MVT**.
- Formats intermédiaires : **Parquet** (Silver), GeoJSON/MVT (carto).

### AI Layer
- **API Claude (Anthropic)** pour l'assistant : pattern **tool use** (le modèle appelle les outils internes `search_zones`, `get_zone`, `compare_zones`, `explain_score`, `get_history`) → réponses **ancrées** sur la base, jamais de chiffres inventés. Modèles récents recommandés (voir skill `claude-api` au build pour ids/params à jour).
- RAG léger sur descriptions/méthodo si besoin ; **pas de LLM au MVP** (explications déterministes par templates), LLM en V1.

### Infra & DevOps
- **Conteneurs Docker**, orchestration **Kubernetes** (ou Nomad/Docker Compose au démarrage).
- **Hébergement UE** (Scaleway/OVHcloud/Clever Cloud) — cohérent RGPD et souveraineté.
- **CI/CD** : GitHub Actions (tests, lint, migrations, déploiement).
- **IaC** : Terraform.
- **Migrations DB** : Alembic (Python) / Prisma-migrate (Node).

### Monitoring & observabilité
- **Prometheus + Grafana** (métriques infra/jobs/DQ), **Sentry** (erreurs front/back), logs centralisés (Loki/ELK).
- **Dashboards data** : statut sources, dernier run, fraîcheur, DQ (alimente le back-office admin, doc 15).
- Alerting (Slack/email/PagerDuty) sur échec de job, rupture de source, DQ sous seuil.

## 3. Cartographie (choix structurant)

- **Tuiles vectorielles MVT** générées à la publication (tippecanoe) et servies statiquement/CDN → carto fluide même à l'échelle nationale.
- Couches thématiques (prix, loyers, rendement, qualité de vie, transports, sécurité…) = **jointure indicateur × géométrie** matérialisée par maille et par zoom.
- Rendu client **MapLibre GL** ; heatmaps + choroplèthes avec **échelles perceptuellement uniformes** et **motifs** (accessibilité daltonisme, doc 02 §6).
- Granularité **adaptative** selon le zoom (région → département → commune → arrondissement/IRIS).

## 4. Sécurité (résumé — détail doc 13)

- TLS partout, secrets en coffre (Vault/SOPS), moindre privilège DB, **chiffrement au repos**.
- Données utilisateurs (projets, critères) minimisées ; pas de donnée sensible au sens RGPD si évitable.
- Rate limiting, WAF, protection API IA (quotas, filtrage des prompts, coût maîtrisé).
- Séparation nette **données publiques** (ouvertes) / **données utilisateurs** (protégées).

## 5. Environnements

`dev` · `staging` · `prod`, avec **jeux de données réduits** en dev/staging (ex. 2–3 départements) pour itérer vite. La Data Factory tourne en staging sur un sous-échantillon avant prod.

## 6. Choix « pourquoi » (justifications rapides)

| Choix | Raison |
|-------|--------|
| PostgreSQL+PostGIS unique (pas de zoo de bases) | Simplicité opérationnelle, géo natif, suffisant pour le MVP |
| Batch (pas de streaming) | Aucune source temps réel → complexité inutile évitée |
| MapLibre + MVT | Open-source, pas de coût de licence carto, performant |
| Dagster + dbt + Great Expectations | Lineage, tests et DQ = exigences cœur du produit, natifs dans ces outils |
| Python/FastAPI | Unifie API et scoring/data science |
| Hébergement UE | RGPD + souveraineté sur données publiques FR |
| LLM différé (V1) | Le MVP prouve la valeur sans risque d'hallucination ni coût IA |
