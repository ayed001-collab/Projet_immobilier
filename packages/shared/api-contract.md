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

## `POST /api/finance`
Corps : `{ revenus_mensuels, apport, taux_annuel, duree_annees, taux_endettement?, bien_neuf? }`.
Réponse : `{ mensualite_max, capacite_emprunt, enveloppe_totale, frais_estimes, budget_achat, taux_frais, hypotheses }`.

## `POST /api/score`
Corps : `{ "profile": "home", "weights"?: {...}, "budget"?: number, "surface"?: number }`.
Réponse : `{ profile, scoring_version, weights_applied, budget, surface, results: RankedZone[] }` où
`RankedZone` = `{ zone_id, nom_commune, rank, score, confidence_score, breakdown[], bien_type_price?, within_budget? }`.
- Sans `budget` : tri par score décroissant — **recalcul dynamique** (RG-S1).
- Avec `budget`+`surface` : **recherche inversée** — calcule le prix du bien-type par zone,
  marque la compatibilité budget, place les zones compatibles en tête (RG-R2).

## `POST /api/compare`
Corps : `{ "codes": ["33063", "33192"], "profile": "home" }` (2 à 4 codes).
Réponse : `{ profile, scoring_version, zones: CompareZone[], badges, badge_labels }` où
`CompareZone` = `{ code_commune, nom_commune, confidence_score, home_score, investment_score, indicators, subscores }`
et `badges` = `{ meilleur_profil, meilleur_rapport_qualite_prix, meilleur_potentiel, meilleure_qualite_vie, meilleur_rendement }`
(chaque valeur = `code_commune` gagnant, ou `null`).

## `GET /api/communes/{code}`
Renvoie les `properties` de la commune **+ `history`** :
```json
"history": { "prix_m2": [ {"millesime":"2023","value":4530}, {"millesime":"2024","value":4824} ], "...": [] }
```
`404` si la commune est inconnue.
