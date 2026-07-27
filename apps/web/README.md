# Web — carte des prix au m² (Incrément 0)

Front Next.js (App Router) + MapLibre GL. Affiche une **choroplèthe des prix au
m²** par commune, avec une fiche synthétique au clic exposant **source, période,
nombre d'observations, confiance et date** — l'exigence de transparence du produit.

Le fond de carte est volontairement **sans tuiles externes** (fonctionne
hors-ligne) : seules les géométries communales et l'indicateur sont rendus.

## Lancer

```bash
cd apps/web
npm install
# l'API (apps/api) doit tourner sur le port 8000
API_URL=http://localhost:8000 npm run dev   # http://localhost:3000
```

Build de production : `npm run build && npm run start`.

## Configuration

- `API_URL` : URL de l'API de lecture (SSR + réécriture `/api/*` → voir `next.config.js`).

## Écrans

| Route | Écran |
|-------|-------|
| `/` | Home — deux portes (résidence principale / investir) |
| `/projet?type=home\|investment` | Onboarding progressif (budget + financement + critères pondérés) puis **résultats** (top personnalisé + carte) |
| `/comparer` | Comparateur — 2 à 4 zones côte à côte + badges automatiques |
| `/carte` | Explorer — carte multi-couches + fiche (indicateurs, scores, confiance) |
| `/admin` | Back-office data — supervision des sources, DQ, fraîcheur |

## Structure

- `app/page.tsx` — Home (deux parcours).
- `app/projet/page.tsx` + `components/Projet.tsx` — onboarding + résultats.
- `app/carte/page.tsx` + `components/MapView.tsx` — explorer cartographique.
- `components/ResultsMap.tsx` — carte du score personnalisé (résultats).
- `lib/api.ts` — contrat de lecture/écriture avec l'API.
