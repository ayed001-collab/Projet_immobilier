# Infra (Incrément 0)

## Lancer toute la stack avec Docker Compose

```bash
# 1) produire les données de service (Gold) au préalable
cd data/factory && python -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements.txt && python run.py && cd -

# 2) démarrer db (PostGIS) + api + web
cd infra
docker compose up --build
```

- Web : http://localhost:3000
- API : http://localhost:8000 (docs : /docs)
- PostGIS : localhost:5432 (`copilote`/`copilote`)

`postgis/init.sql` crée les tables `zone` et `indicator_commune_prix`
(chemin production). Pour l'Incrément 0, l'API lit directement le GeoJSON monté
en volume depuis `data/factory/gold/`, donc PostGIS n'est pas requis.
