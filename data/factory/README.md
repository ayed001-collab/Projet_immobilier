# Data Factory — pipeline DVF (Incrément 0)

Chaîne data de bout en bout : **Collecte (Bronze) → Nettoyage/QC → Agrégation
→ Rattachement géo → QC sortie → Publication (Gold)**, alignée sur
[`docs/08-data-factory.md`](../../docs/08-data-factory.md).

Produit l'indicateur **`prix_m2` par commune** (médiane robuste des ventes DVF),
avec métadonnées de traçabilité (source, période, dernière MAJ) et un niveau de
confiance simplifié préfigurant le Data Confidence Score.

## Lancer

```bash
cd data/factory
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run.py            # génère gold/communes_prix_m2.geojson + .csv + manifest.json
pytest -q                # tests unitaires (nettoyage, agrégation)
```

## Données

- **Hors-ligne (défaut)** : fixtures dans `fixtures/` — échantillon DVF *synthétique*
  et géométries communales *simplifiées* de Gironde (clairement étiquetées, non
  officielles). Permet de démontrer la chaîne sans réseau.
- **Production** : définir les variables d'environnement (config-driven) —

  ```bash
  export DVF_SOURCE_URL="https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements/33.csv.gz"
  export COMMUNES_GEOJSON="/chemin/contours-communes-IGN.geojson"
  export DATABASE_URL="postgresql+psycopg://copilote:copilote@localhost:5432/copilote"  # optionnel
  python run.py
  ```

## Cartographie du code sur le pipeline (docs/08)

| Étape docs/08 | Module |
|---------------|--------|
| [2] Collecte | `dvf_pipeline/sources.py` |
| [3][4] QC entrée & Transformation | `dvf_pipeline/clean.py` |
| [7] Calcul des indicateurs | `dvf_pipeline/aggregate.py` |
| [5] Normalisation & géo | `dvf_pipeline/geo.py` |
| [8] QC sortie (bloquante) | `dvf_pipeline/quality.py` |
| [9] Publication (Gold) | `dvf_pipeline/outputs.py` |
| Orchestration | `dvf_pipeline/pipeline.py` · `run.py` · `dagster_defs.py` |

## Orchestration Dagster (optionnel)

`dvf_pipeline/dagster_defs.py` enveloppe les mêmes fonctions en assets Dagster
(lineage natif). `pip install dagster dagster-webserver` puis
`dagster dev -m dvf_pipeline.dagster_defs`.
