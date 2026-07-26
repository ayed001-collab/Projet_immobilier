# Contrat d'API (Incrément 1)

Contrat partagé entre `apps/api` (producteur) et `apps/web` (consommateur).
Source de vérité des types front (`apps/web/lib/api.ts`).

## `GET /api/meta`
```json
{
  "communes_total": 6,
  "communes_with_data": 6,
  "indicators": ["prix_m2", "loyer_m2", "rendement_brut", "..."],
  "departement": "33",
  "dvf_millesimes": ["2023", "2024"],
  "global_dq_score": 90.1,
  "run_finished": "2026-07-26T...Z",
  "avertissement": "Aide à la décision — … l'utilisateur reste décisionnaire."
}
```

## `GET /api/layers` → `Layer[]`
| Champ | Type | Note |
|-------|------|------|
| `code` | string | ex. `prix_m2` |
| `label` | string | libellé affiché |
| `unit` | string | ex. `€/m²` |
| `category` | string | marche / locatif / socio / education / transports |
| `nature` | string | measure / calc / model / editorial / forecast |
| `direction` | string | higher_better / lower_better / context |
| `is_estimated` | boolean | vrai pour les données modélisées |
| `source` | string | traçabilité |

## `GET /api/communes` → `FeatureCollection`
`Feature.properties` :

| Champ | Type | Note |
|-------|------|------|
| `code_commune` | string | code INSEE |
| `nom_commune` | string | |
| `has_data` | boolean | |
| `confidence_score` | number\|null | 0–100 (Data Confidence) |
| `confidence_level` | string\|null | Élevée / Correcte / Limitée / Faible |
| `home_score` | number\|null | Home Score par défaut (0–100) |
| `investment_score` | number\|null | Investment Score par défaut (0–100) |
| `scores` | object | `{ subscores, home: ProfileScore, investment: ProfileScore }` |
| `indicators` | object | `{ [code]: IndicatorValue }` |

`IndicatorValue` = `{ value, unit, millesime, source, nature, is_estimated, label, direction }`.
`ProfileScore` = `{ score, scoring_version, breakdown: { criterion, label, weight, subscore, contribution }[] }`.

## `GET /api/weights?profile=home|investment`
```json
{ "profile": "home", "scoring_version": "1.0.0",
  "weights": { "education": 0.30, "transports": 0.25, "prix": 0.30, "revenu": 0.15 },
  "criteria": { "education": { "label": "Éducation", "indicator": "ips_moyen", "direction": "higher_better" } } }
```

## `POST /api/score`
Corps : `{ "profile": "home", "weights": { "transports": 1.0 } }` (`weights` optionnel).
Réponse : `{ profile, scoring_version, weights_applied, results: RankedZone[] }` où
`RankedZone` = `{ zone_id, nom_commune, rank, score, confidence_score, breakdown[] }`,
trié par score décroissant — **recalcul dynamique** au changement de pondération (RG-S1).

## `GET /api/communes/{code}`
Renvoie les `properties` de la commune **+ `history`** :
```json
"history": { "prix_m2": [ {"millesime":"2023","value":4530}, {"millesime":"2024","value":4824} ], "...": [] }
```
`404` si la commune est inconnue.
