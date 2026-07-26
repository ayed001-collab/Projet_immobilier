# API de lecture (Incrément 0)

FastAPI qui sert l'indicateur `prix_m2` par commune produit par la Data Factory,
avec les métadonnées de traçabilité (exigence de transparence, docs/09).

## Lancer

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# le pipeline doit avoir tourné (data/factory/run.py) pour produire le GeoJSON
uvicorn app.main:app --reload --port 8000
```

## Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | Sonde de vivacité |
| GET | `/api/meta` | Métadonnées de l'indicateur (source, période, méthode, dernière MAJ) |
| GET | `/api/communes` | FeatureCollection GeoJSON (communes + prix_m2) pour la carte |
| GET | `/api/communes/{code}` | Fiche synthétique d'une commune (valeur + traçabilité) |

Docs interactives : `http://localhost:8000/docs`.

## Configuration (env)

- `GOLD_GEOJSON` : chemin du GeoJSON de service (défaut : `data/factory/gold/…`).
- `CORS_ORIGINS` : origines autorisées (défaut : `http://localhost:3000`).
- `DATABASE_URL` : réservé au chemin PostGIS (V+).
