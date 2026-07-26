# Contrat d'API (Incrément 0)

Contrat partagé entre `apps/api` (producteur) et `apps/web` (consommateur).
Sert de source de vérité pour les types côté front (`apps/web/lib/api.ts`).

## `GET /api/meta`
```json
{
  "indicator": "prix_m2",
  "communes_total": 6,
  "communes_with_data": 6,
  "source": "DVF — Demandes de Valeurs Foncières",
  "millesime": "2024",
  "periode": "transactions 2024",
  "derniere_maj": "2026-07-26T21:56:37Z",
  "nature": "measure",
  "methode": "médiane des prix au m²… après filtrage des valeurs aberrantes",
  "avertissement": "Aide à la décision — … l'utilisateur reste décisionnaire."
}
```

## `GET /api/communes` → `FeatureCollection`
Chaque `Feature.properties` :

| Champ | Type | Note |
|-------|------|------|
| `code_commune` | string | code INSEE |
| `nom_commune` | string | |
| `has_data` | boolean | `false` si données insuffisantes (RG-Z1) |
| `prix_m2` | number? | €/m² (médiane) |
| `obs_count` | number? | nb de transactions retenues |
| `periode` | string? | ex. « transactions 2024 » |
| `confidence_score` | number? | 0–100 (préfigure Data Confidence) |
| `confidence_level` | string? | Élevée / Correcte / Limitée |
| `source` | string? | traçabilité |
| `millesime` | string? | millésime source |
| `derniere_maj` | string? | ISO 8601 |
| `is_estimated` | boolean? | `false` pour DVF (mesure) |

## `GET /api/communes/{code}`
Renvoie l'objet `properties` d'une commune (mêmes champs), `404` si inconnue.

> Ce contrat évoluera avec le modèle de données (docs/10). En V+, les types
> pourront être générés depuis l'OpenAPI de FastAPI.
