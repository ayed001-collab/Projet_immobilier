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

## Structure

- `app/page.tsx` — page serveur (récupère `/api/meta` en SSR).
- `components/MapView.tsx` — carte MapLibre (choroplèthe + fiche au clic).
- `lib/api.ts` — contrat de lecture avec l'API.
