# packages/scoring — moteur de scoring partagé

Logique de scoring **pure et versionnée** (docs/05), réutilisée par :
- la **Data Factory** (`data/factory`) pour la normalisation batch + les scores par défaut ;
- l'**API** (`apps/api`) pour la pondération à la demande (recalcul dynamique).

## Contenu

| Module | Rôle |
|--------|------|
| `config.py` | `SCORING_VERSION`, critères (`CRITERIA`), pondérations par défaut (`DEFAULT_WEIGHTS`) |
| `normalize.py` | normalisation par rang percentile, gestion du sens (`higher/lower_better`) |
| `engine.py` | sous-scores → Home/Investment Score + **décomposition** (RG-S2), renormalisation des poids (RG-S4), classement |

## Principes (docs/05)

- **Normalisation comparable** entre zones (rang percentile, robuste aux extrêmes).
- **Pondérations modifiables** par l'utilisateur ; renormalisées sur les critères disponibles.
- **Explicabilité** : chaque score expose la contribution de chaque critère.
- **Déterministe & versionné** : mêmes entrées + même `SCORING_VERSION` ⇒ mêmes scores.

## Installation (éditable) & tests

```bash
pip install -e packages/scoring        # déjà référencé dans les requirements factory & api
cd packages/scoring && pip install pytest && pytest -q
```

## Critères (v1.0.0)

| Critère | Indicateur | Sens |
|---------|-----------|------|
| education | ips_moyen | + |
| transports | temps_gare_min | − (proche = mieux) |
| prix | prix_m2 | − (accessible = mieux) |
| rendement | rendement_brut | + |
| valorisation | tendance_prix_1an | + |
| revenu | revenu_median | + |

Pondérations par défaut : **Home** = éducation 30 / prix 30 / transports 25 / revenu 15 ·
**Investment** = rendement 40 / valorisation 25 / prix 20 / revenu 15.
