# API de lecture (Incrément 1)

FastAPI qui sert les **indicateurs multi-sources** par commune produits par la
Data Factory (prix, loyer, rendement, population, revenu, éducation, transports,
tendance), la **confiance par zone**, les **couches** disponibles et l'**historique**
— avec traçabilité (source, millésime), exigence de transparence (docs/09).

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
| GET | `/api/meta` | Résumé du run (indicateurs, DQ global, département, millésimes) |
| GET | `/api/layers` | Couches disponibles (indicateurs + libellés/unités/sens/source) |
| GET | `/api/communes` | FeatureCollection GeoJSON (communes + tous les indicateurs + confiance) |
| GET | `/api/communes/{code}` | Fiche d'une commune : indicateurs, confiance et **historique** |

Docs interactives : `http://localhost:8000/docs`.

## Configuration (env)

- `GOLD_DIR` : dossier des sorties de service (défaut : `data/factory/gold/`).
- `CORS_ORIGINS` : origines autorisées (défaut : `http://localhost:3000`).
