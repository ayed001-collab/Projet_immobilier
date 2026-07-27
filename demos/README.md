# Démo interactive (autonome)

`index.html` est une **démonstration autonome** du copilote de décision immobilière :
une page unique, sans dépendance externe ni backend, qui embarque la **sortie réelle
du pipeline** (échantillon de 6 communes de Gironde) et réimplémente la partie
consultation **côté navigateur** (le moteur de scoring est porté en JS).

Ouvrez simplement le fichier dans un navigateur — ou consultez la version publiée
(lien partagé séparément).

## Contenu

| Onglet | Démontre |
|--------|----------|
| **Carte** | Choroplèthe SVG, couches commutables, fiche ville (scores + décomposition explicable, sparkline, chaque chiffre sourcé/daté/estimé) |
| **Mon projet** | Module financement (budget d'achat) + curseurs de pondération → classement personnalisé recalculé en direct, compatibilité budget |
| **Comparateur** | 2 à 4 zones, meilleure valeur par ligne surlignée + badges automatiques |
| **Alertes** | Simulation d'un millésime DVF 2025 (prix non uniformes) → alertes expliquées (prix, score, rang, budget) |

Clair/sombre, responsive, accessible (focus visibles, `prefers-reduced-motion`).

## Régénérer les données embarquées

Les données proviennent de `data/factory/gold/` (après `python run.py`). Le blob
JSON est injecté dans la page à la place du marqueur `/*__DATA__*/`. Voir l'historique
de génération dans le dossier `data/factory` (millésimes 2024 + 2025 pour la
simulation d'alertes).

## Limites (assumées)

Périmètre réduit aux **6 communes fixtures** (données de démonstration, partiellement
synthétiques). La plateforme réelle (`apps/` + `data/factory`) couvre la logique
complète et se branche sur les vraies sources publiques (config-driven).
