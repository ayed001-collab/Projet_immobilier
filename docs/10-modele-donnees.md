# 10 — Modèle de données (MCD, data mapping, référentiel géo)

## 1. Modèle conceptuel (entités principales)

```
USER ──1:N── PROJECT ──1:N── RECOMMENDATION ──N:1── ZONE
  │             │                                     │
  │             ├─1:1── PROFILE (critères pondérés)    ├─1:N── INDICATOR_VALUE ──N:1── SOURCE
  │             ├─1:N── SIMULATION ──N:1── ZONE        ├─1:N── SCORE (Home/Invest/Confidence, historisé)
  ├─1:N── FAVORITE ──N:1── ZONE                        ├─1:N── SCORE_BREAKDOWN
  ├─1:N── ALERT ──▶ (ZONE|PROJECT|SEARCH)              └─ hierarchy: ZONE.parent_id ──▶ ZONE
  └─1:N── ALERT ──1:N── EVENT
```

## 2. Référentiel géographique (socle)

Table pivot `ZONE` : **toute donnée s'y rattache**. Hiérarchie auto-référencée.

| Niveau | Exemple | Source code | Note |
|--------|---------|-------------|------|
| `country` | France | — | racine |
| `region` | Nouvelle-Aquitaine | COG INSEE | |
| `department` | Gironde (33) | COG INSEE | |
| `epci` | Bordeaux Métropole | COG INSEE | intercommunalité |
| `commune` | Bordeaux (33063) | **code INSEE commune** | maille MVP par défaut |
| `arrondissement_plm` | Paris 15e | code INSEE arrond. | Paris/Lyon/Marseille |
| `iris` | IRIS xxxx | code IRIS | V1, si data suffisante |

**Gestion temporelle du COG** : communes fusionnent/scindent au 1er janvier. `ZONE` porte `valid_from`/`valid_to` + table de correspondance des évolutions (une commune fusionnée pointe vers son successeur) pour ne pas casser l'historique.

```
ZONE(
  zone_id PK, code_insee, level, name, parent_id FK→ZONE,
  geometry (GeoJSON/PostGIS), centroid,
  population (dernier millésime, cache),
  valid_from, valid_to
)
```

## 3. Données & scores (cœur data, historisé)

```
SOURCE(
  source_id PK, name, owner, access_url, type,
  granularity, expected_frequency, license, reliability_level,
  cost, data_owner, notes
)

DATASET_RUN(                      -- un run de collecte/traitement
  run_id PK, source_id FK, millesime, collected_at,
  source_published_at, status, rows_in, rows_out, dq_score, log_ref
)

INDICATOR(                        -- définition d'un indicateur produit
  indicator_id PK, code, label, unit, category,
  nature ENUM('measure','model','editorial','forecast'),
  direction ENUM('higher_better','lower_better','context')
)

INDICATOR_VALUE(                  -- valeur historisée (append-only)
  id PK, zone_id FK, indicator_id FK, source_id FK, run_id FK,
  millesime, value, unit, obs_count, dq_score,
  collected_at, source_published_at,
  valid_from, valid_to,           -- versionnement temporel
  is_estimated bool, is_forecast bool
)

SCORE(                            -- score historisé par zone & type & version
  id PK, zone_id FK, score_type ENUM('home','investment','confidence'),
  scoring_version, value, computed_at, millesime_ref,
  valid_from, valid_to
)

SCORE_BREAKDOWN(                  -- décomposition (explicabilité, RG-S2)
  id PK, score_id FK, subscore_code, subscore_value,
  weight, contribution
)
```

## 4. Utilisateur, projet & interactions

```
USER(user_id PK, email, auth_ref, created_at, consent_flags, ...)

PROJECT(
  project_id PK, user_id FK, type ENUM('main_residence','investment'),
  budget, apport, income, loan_rate, loan_years, computed_purchase_budget,
  property_type, min_surface, rooms,
  household, children,                    -- RP
  strategy, target_yield, risk_level, horizon,  -- Invest
  geo_preference, accessibility_constraints (jsonb),
  created_at, updated_at
)

PROFILE_WEIGHTS(                  -- pondérations des critères (normalisées)
  project_id FK, criterion_code, weight
)

RECOMMENDATION(
  id PK, project_id FK, zone_id FK, rank, perso_score, confidence,
  reasons (jsonb), tradeoffs (jsonb), scoring_version, computed_at
)

SIMULATION(
  id PK, project_id FK, zone_id FK, mode ENUM('purchase','rental'),
  inputs (jsonb), outputs (jsonb), computed_at
)

FAVORITE(user_id FK, zone_id FK, created_at)

ALERT(
  alert_id PK, user_id FK, scope ENUM('zone','project','search'),
  ref_id, rules (jsonb: seuils/événements), channel, active, created_at
)

EVENT(
  event_id PK, type, zone_id FK, payload (jsonb),
  detected_at, run_id FK
)  -- déclenche l'évaluation des alertes
```

## 5. Data Mapping (source → modèle) — extraits

| Champ source | Source | Transformation | Cible |
|--------------|--------|----------------|-------|
| `valeur_fonciere`, `surface_reelle_bati`, `date_mutation`, `code_commune` | DVF | filtrer ventes valides, calc €/m², **médiane par zone/fenêtre glissante**, exclure outliers | `INDICATOR_VALUE` (indicator=`prix_m2`) |
| Séries DVF multi-millésimes | DVF | calc variation 1/3/5/10 ans | `INDICATOR_VALUE` (`tendance_prix_*`) |
| Loyer €/m² modélisé | Carte des loyers | rattacher code INSEE, marquer `is_estimated` | `INDICATOR_VALUE` (`loyer_m2`) |
| `prix_m2` + `loyer_m2` | interne | `rendement = loyer_annuel / prix` | `INDICATOR_VALUE` (`rendement_brut`, calc) |
| Population, revenu médian, chômage | INSEE | rattacher IRIS/commune, dernier millésime | `INDICATOR_VALUE` (`population`, `revenu_median`, `chomage`) |
| IPS, réussite examens | MEN | rattacher établissement→zone (carte scolaire approx.), agréger | sous-score `education` |
| Faits constatés | SSMSI | **normaliser /1000 hab**, contextualiser | sous-score `securite` |
| Étiquette DPE | ADEME | agréger part F/G par zone | `INDICATOR_VALUE` (`part_passoires`) |
| Temps trajet vers pôle | OSM/OSRM | pré-calc isochrones par commune vers pôles | `INDICATOR_VALUE` (`temps_pole_*`) |

## 6. Choix de stockage (principe, détaillé doc 12)

- **PostgreSQL + PostGIS** pour la base de service (géo + relationnel + jsonb) : suffisant et robuste pour le MVP, gère la carto (contours, jointures spatiales).
- **Object storage** (S3-like) pour Bronze (raw versionné).
- **Silver/analytics** : schéma historisé dans Postgres au MVP ; entrepôt dédié (DuckDB/BigQuery/ClickHouse) envisageable si volumétrie/analytique le justifie en V1+.
- **Tuiles vectorielles** (MVT) matérialisées pour la carto performante.

## 7. Indexation & performance

- Index spatiaux (GiST) sur `geometry` ; index sur `(zone_id, indicator_id, valid_to)` pour la valeur courante.
- Vues **matérialisées** « valeur courante par zone » (Gold) pour l'API de lecture.
- Partitionnement de `INDICATOR_VALUE` par millésime/année si volumétrie élevée.
