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
| GET | `/api/communes/{code}` | Fiche d'une commune : indicateurs, confiance, **scores + décomposition** et historique |
| GET | `/api/weights?profile=` | Pondérations par défaut d'un profil (home/investment) + libellés des critères |
| POST | `/api/finance` | **Module financement** : capacité d'emprunt & budget d'achat |
| POST | `/api/score` | **Classement personnalisé** + recherche inversée (budget) |

`POST /api/finance` — corps : `{ "revenus_mensuels": 5200, "apport": 60000, "taux_annuel": 3.5, "duree_annees": 25 }`
→ mensualité max, capacité d'emprunt, frais, **budget d'achat**.

`POST /api/score` — corps : `{ "profile": "home", "weights": { "transports": 1.0 }, "budget": 300000, "surface": 70 }`
(`weights`/`budget`/`surface` optionnels). Renvoie les zones classées avec score,
confiance et décomposition ; si `budget`+`surface` sont fournis, calcule le prix du
**bien-type** et la compatibilité budget (recherche inversée « Où puis-je acheter ? »),
les zones compatibles en tête (RG-R2).

Docs interactives : `http://localhost:8000/docs`.

## Configuration (env)

- `GOLD_DIR` : dossier des sorties de service (défaut : `data/factory/gold/`).
- `CORS_ORIGINS` : origines autorisées (défaut : `http://localhost:3000`).
