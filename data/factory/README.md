# Data Factory — pipeline multi-sources (Incrément 1)

Chaîne data multi-sources, alignée sur [`docs/08`](../../docs/08-data-factory.md) &
[`docs/09`](../../docs/09-data-quality.md) :

```
Sources → Collecte (Bronze) → Indicateurs (+ dérivés)
→ Historisation append-only (Silver) → Data Quality (bloquante)
→ Confiance par zone → Publication (Gold)
```

Produit **8 indicateurs par commune** — `prix_m2`, `tendance_prix_1an`,
`loyer_m2` (estimé), `rendement_brut`, `population`, `revenu_median`,
`ips_moyen`, `temps_gare_min` — chacun **sourcé, daté**, avec un
**Data Confidence Score** par zone et un **historique multi-millésimes**.

## Lancer

```bash
cd data/factory
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -q            # tests (nettoyage DVF, dérivés, historisation, DQ, confiance)
python run.py        # génère gold/*.geojson + history.json + layers.json + dq_report.json
```

## Sources & fixtures

| Source | Indicateur(s) | Nature | Fixture |
|--------|---------------|--------|---------|
| DVF (2 millésimes) | `prix_m2`, `tendance_prix_1an` | mesure / calc | `dvf_2023_33.csv`, `dvf_2024_33.csv` |
| INSEE | `population`, `revenu_median` | mesure | `insee_33.csv` |
| Carte des loyers | `loyer_m2` | **modèle (estimé)** | `loyers_33.csv` |
| DVF + Loyers | `rendement_brut` | calc (estimé) | dérivé |
| Éducation (MEN) | `ips_moyen` | mesure | `education_33.csv` |
| Transports (OSRM) | `temps_gare_min` | calc | `transports_33.csv` |

Fixtures = échantillons *synthétiques* / *simplifiés* de Gironde (hors-ligne).
Chemin production **config-driven** (voir `factory/config.py`) :
`DVF_SOURCE_URL_TEMPLATE`, `COMMUNES_GEOJSON`, `DVF_MILLESIMES`, `FACTORY_TODAY`.

## Historisation & qualité

- **Append-only** (`silver/indicator_history.csv`) : tous les millésimes conservés
  (RG-D4) ; ré-exécuter ne crée pas de fraîcheur artificielle (RG-D5). La tendance
  de prix est calculée entre millésimes consécutifs.
- **Data Quality** : contrôles déclaratifs par indicateur (complétude, validité par
  bornes du registre, fraîcheur vs fréquence attendue, volume d'observations) →
  DQ score par indicateur ; un contrôle bloquant empêche la publication.
- **Data Confidence** par zone : agrège la qualité des indicateurs présents,
  pondérée — une mesure directe fraîche prime sur une estimation ancienne.

## Architecture du package

```
factory/
  model.py            registre d'indicateurs + IndicatorValue (docs/10)
  sources/            connecteurs (dvf.py, tabular_sources.py) + interface
  derived.py          rendement_brut, tendance_prix_1an
  history.py          historisation append-only (Silver)
  quality.py          moteur Data Quality (expectations + DQ score)
  confidence.py       Data Confidence Score par zone
  publish.py          sorties Gold (geojson, history, layers, dq, manifest)
  pipeline.py         orchestration
```
