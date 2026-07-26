# 08 — Data Factory : pipeline, orchestration & stratégie de mise à jour

> La Data Factory est le **cœur différenciant** du produit (moat). Objectif : actualiser, contrôler, transformer, historiser et publier les données **automatiquement**, sans jamais créer de fraîcheur artificielle.

## 1. Pipeline logique

```
[1] Sources ──▶ [2] Collecte (Ingestion) ──▶ [3] Contrôle qualité entrée
      ──▶ [4] Transformation ──▶ [5] Normalisation & rattachement géo
      ──▶ [6] Historisation ──▶ [7] Calcul des indicateurs & scores
      ──▶ [8] Contrôle qualité sortie ──▶ [9] Publication (Serving)
```

Chaque étape écrit des **métadonnées** (voir doc 09) : id de run, source, millésime, timestamps, volumétrie, statut, DQ.

### Étapes détaillées

| Étape | Rôle | Points clés |
|-------|------|-------------|
| **1. Sources** | Fiches source (doc 07), endpoints, licences | Registre versionné, data owner |
| **2. Collecte** | Connecteurs par source (API / fichier / dépôt data.gouv) | **Idempotent**, détection de nouveau millésime (hash/ETag/date de publication) — ne re-télécharge pas si inchangé |
| **3. QC entrée** | Validation de schéma, volumétrie, format | Rejet/quarantaine si structure cassée (rupture d'API) |
| **4. Transformation** | Nettoyage (outliers DVF, dédoublonnage), typage, enrichissement | Règles documentées & testées |
| **5. Normalisation & géo** | Rattachement au **référentiel géographique** (BAN, COG, IRIS), reprojection, gestion des évolutions de communes | Colonne vertébrale géo |
| **6. Historisation** | Écriture **append-only** avec millésime/version (jamais d'écrasement) | Voir doc 09/10 |
| **7. Indicateurs & scores** | Agrégation par zone, calcul Home/Investment/Confidence | Décomposition stockée (RG-S2) |
| **8. QC sortie** | Contrôles de cohérence, variation anormale, complétude | **Bloquant** avant publication |
| **9. Publication** | Alimente la base de service (lecture API) + invalidation cache + génération d'événements/alertes | Publication **par lot validé** |

## 2. Architecture technique de la Data Factory (medallion)

Organisation en couches (pattern *bronze / silver / gold*) :

- **Bronze (raw)** : copie brute immuable de chaque collecte (fichier tel quel + métadonnées). Rejouable.
- **Silver (clean)** : données nettoyées, typées, rattachées au géo, historisées.
- **Gold (serving)** : indicateurs & scores par zone, prêts pour l'API produit (dénormalisés/matérialisés pour la lecture rapide et la cartographie).

```
Connecteurs ─▶ Bronze (object storage, versionné)
                 └─▶ Silver (entrepôt/DB, historisé)
                        └─▶ Gold (tables de service + tuiles carto) ─▶ API produit
```

## 3. Orchestration

- **Orchestrateur de workflows** (ex. Airflow / Dagster / Prefect) : un **DAG par source**, planifié selon sa fréquence propre.
- Chaque DAG : `collecte → QC entrée → transfo → normalisation → historisation → recalcul indicateurs impactés → QC sortie → publication`.
- **Déclenchement** : par planning **et** par détection de nouveau millésime (event-driven). Pas de recalcul si la source n'a pas changé.
- **Reprises** : runs idempotents, rejouables depuis Bronze ; alertes en cas d'échec (monitoring, doc 12).
- **Backfill** : capacité à recharger un historique (ex. tous les millésimes DVF) pour construire les tendances.

## 4. Stratégie de mise à jour (fréquence par source)

| Source | Fréquence de collecte | Justification |
|--------|-----------------------|---------------|
| DVF | Semestrielle (+ veille millésime) | La source publie ~2×/an |
| Loyers | Annuelle | Millésime annuel |
| INSEE (démo, revenus, emploi) | Annuelle | Millésimes annuels |
| Référentiel géo (COG/contours) | Annuelle (1er janv.) + veille | Évolutions communes |
| Éducation (IPS, résultats) | Annuelle | Rentrée / sessions d'examen |
| Sécurité (SSMSI) | Annuelle | Publication annuelle |
| Santé (APL/densité) | Annuelle | — |
| Environnement/risques (Géorisques) | Trimestrielle/à MAJ | Selon producteur |
| DPE (ADEME) | Mensuelle/hebdo | Flux continu |
| Transports (GTFS/gares) | Trimestrielle/à MAJ | Selon réseaux |
| Projets urbains | Continue (curation) semi-manuelle | Pas de flux propre |
| Taux d'emprunt | Mensuelle | Observatoires mensuels |

> **Règle d'or (RG-D5)** : la fréquence de **collecte** ≠ fréquence de **changement**. On collecte selon le calendrier, mais on ne modifie l'indicateur (ni sa date) **que si** la source a réellement publié une nouvelle valeur. Le champ « dernière mise à jour » reflète la **donnée**, pas le job.

## 5. Métadonnées produites à chaque run (obligatoire)

Pour chaque jeu / indicateur / zone :
- **date de collecte** (quand on a récupéré) ;
- **date de publication de la source** (millésime) ;
- **date de dernière mise à jour effective de la valeur** ;
- **source** + version / millésime ;
- **niveau de qualité** (DQ score, doc 09) ;
- id du run + statut.

Ces métadonnées remontent jusqu'à l'UI (transparence, doc 09) et au back-office (supervision, doc 15).

## 6. Résilience & coûts

- **Rupture de source / API** : quarantaine + conservation de la dernière valeur valide, marquée « donnée ancienne » ; alerte admin ; jamais de valeur inventée.
- **Coût maîtrisé** : calculs lourds (temps de trajet/isochrones) **pré-calculés par lot** par maille, pas à la volée ; tuiles cartographiques générées à la publication.
- **Scalabilité** : traitement par lot batch suffisant (aucune source n'est réellement temps réel) ; parallélisation par source/maille.
- **Reproductibilité** : depuis Bronze, tout millésime peut être recalculé à l'identique avec la version de scoring d'époque (doc 05 §8).
