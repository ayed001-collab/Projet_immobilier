# 07 — Data Strategy : catalogue des sources & matrice Sources × Données

> Toutes les sources retenues au MVP sont **publiques, ouvertes et françaises**. Des fournisseurs privés pourront compléter en V1+ **si** leur usage est légalement et contractuellement possible. Chaque source est documentée selon un gabarit standard (propriétaire, accès, granularité, fréquence, format, licence, fiabilité, coût, limites).

## 1. Catalogue des sources publiques prioritaires

### 1.1 Marché immobilier

| Champ | DVF — Demandes de Valeurs Foncières |
|-------|--------------------------------------|
| Propriétaire | DGFiP / Etalab |
| Accès | Fichiers `data.gouv.fr` + **API DVF+ / Explore (Cerema)** + géolocalisé (data.gouv/Etalab) |
| Type | Transactions immobilières réelles (prix, date, surface, type, adresse, parcelle) |
| Granularité | **Adresse / parcelle** → agrégeable commune/section/IRIS |
| Fréquence source | ~**semestrielle** (nouveau millésime 2×/an), latence ~6 mois |
| Format | CSV, API |
| Licence | Licence Ouverte / Etalab 2.0 |
| Fiabilité | **Élevée** (mesure directe) mais bruitée → nettoyage requis |
| Coût | Gratuit |
| Limites | Ventes atypiques, VEFA/neuf sous-représenté, dépendances, biens démembrés ; faibles volumes sur petites communes |

### 1.2 Loyers

| Champ | Indicateurs de loyers (carte des loyers) |
|-------|-------------------------------------------|
| Propriétaire | Ministère du Logement / ANIL / observatoires |
| Accès | `data.gouv.fr` (jeux « carte des loyers ») ; observatoires locaux (OLL) ; encadrement (Paris, Lille, Lyon, Montpellier, Bordeaux…) |
| Type | Loyers **modélisés** €/m² par commune/EPCI, par type (maison/appartement) |
| Granularité | Commune / EPCI (national) ; plus fin en zone encadrée |
| Fréquence | ~**annuelle** |
| Licence | Licence Ouverte |
| Fiabilité | **Moyenne** — c'est une **estimation/modèle**, pas une mesure exhaustive |
| Limites | Pas de base nationale exhaustive des loyers de marché ; à étiqueter « estimé » |

### 1.3 Données socio-économiques & démographiques

| Champ | INSEE |
|-------|-------|
| Propriétaire | INSEE |
| Accès | `insee.fr` (fichiers détail, RP, Filosofi), **API INSEE** (Melodi, métadonnées), `data.gouv.fr` |
| Type | Population, ménages, logements, revenus (Filosofi), emploi/chômage, CSP, âge |
| Granularité | Région → Commune → **IRIS** |
| Fréquence | **Annuelle** (millésimes RP glissants ; décalage de 2–3 ans) |
| Licence | Licence Ouverte / INSEE |
| Fiabilité | **Élevée** (structurel), mais **décalée** dans le temps |
| Limites | Secret statistique sur petites mailles ; latence millésime |

### 1.4 Référentiel géographique (socle)

| Champ | Découpage administratif & géométries |
|-------|--------------------------------------|
| Sources | **COG INSEE** (codes communes/dép./région), **contours IGN Admin Express**, **IRIS (IGN/INSEE)**, **Base Adresse Nationale (BAN)**, **cadastre (Etalab)** |
| Type | Codes, hiérarchie, polygones (GeoJSON), adresses géocodées |
| Fréquence | Annuelle (COG évolue chaque 1er janvier : fusions/scissions de communes) |
| Licence | Licence Ouverte |
| Rôle | **Colonne vertébrale** : toutes les données s'y rattachent ; gérer les évolutions de communes dans le temps |

### 1.5 Éducation

| Source | Contenu | Granularité | Fréquence |
|--------|---------|-------------|-----------|
| Annuaire de l'éducation (MEN, data.gouv) | Établissements (localisation, public/privé) | Établissement | Annuelle |
| IPS (indice de position sociale) | Mixité sociale par établissement | Établissement | Annuelle |
| Résultats brevet/bac | Réussite par établissement | Établissement | Annuelle |

### 1.6 Transports & mobilité

| Source | Contenu | Granularité | Fréquence |
|--------|---------|-------------|-----------|
| Base des gares / arrêts (SNCF, transport.data.gouv) | Gares, desserte | Point | Périodique |
| **GTFS** (transport.data.gouv.fr) | Horaires TC (réseaux) | Réseau | Variable |
| OpenStreetMap + moteur d'itinéraires (OSRM/OTP) | Réseau routier, temps de trajet | — | MAJ continue OSM |

### 1.7 Sécurité

| Source | Contenu | Granularité | Fréquence | Précaution |
|--------|---------|-------------|-----------|-----------|
| SSMSI — bases délinquance enregistrée (data.gouv) | Faits constatés par catégorie | **Commune** | **Annuelle** | Normaliser (population), contextualiser, **pas de palmarès stigmatisant** |

### 1.8 Santé

| Source | Contenu | Granularité |
|--------|---------|-------------|
| DREES / data.gouv (densité médicale, APL) | Accès aux soins, densité praticiens | Commune/bassin de vie |
| FINESS | Établissements de santé | Point |

### 1.9 Environnement & risques

| Source | Contenu | Granularité |
|--------|---------|-------------|
| **Géorisques** (BRGM/MTE) | Inondation, retrait-gonflement argiles, sismicité, ICPE, radon | Adresse/commune |
| Atmo / INERIS | Qualité de l'air | Maille/commune |
| BPE INSEE / OSM | Espaces verts, équipements | Commune |
| Bruit (Bruitparif, CNB) | Cartes de bruit | Zone (partielle) |

### 1.10 Énergie / DPE

| Champ | DPE — Diagnostics de Performance Énergétique |
|-------|-----------------------------------------------|
| Propriétaire | **ADEME** |
| Accès | API ADEME (Observatoire DPE), data.gouv |
| Type | Étiquette énergie/GES par logement diagnostiqué | 
| Granularité | Adresse → agrégeable | 
| Fréquence | Flux continu |
| Enjeu | **Passoires (F/G)** : impact location (calendrier d'interdiction) & valorisation → clé côté investissement |

### 1.11 Urbanisme & projets (le plus fragile)

| Source | Contenu | Limite |
|--------|---------|--------|
| **Sitadel** (permis de construire, MTE) | Volumes de construction | Signal de dynamique, pas « projet nommé » |
| GPU (Géoportail de l'urbanisme) | PLU, zonages | Hétérogène, pas un flux « projets à venir » |
| Grand Paris Express, projets de transport | Nouvelles lignes/gares | **Semi-manuel**, curation nécessaire |
| Presse locale / collectivités (open data local) | ZAC, écoquartiers | Non structuré → **prospectif, faible confiance** |

### 1.12 Taux d'emprunt (pour le module financement)

| Source | Contenu | Note |
|--------|---------|------|
| Banque de France / observatoires (CSA/Crédit Logement) | Taux moyens des crédits immobiliers | Alimente RG-B2 (capacité d'emprunt) ; MVP possible avec taux paramétrable mis à jour manuellement |

## 2. Gabarit de fiche source (à remplir pour chaque source dans le back-office)

```
- id, nom
- propriétaire / producteur
- URL / endpoint API / mode d'accès (fichier, API, scraping autorisé)
- type de données
- granularité géographique (maille la plus fine)
- fréquence de mise à jour (source) + latence typique
- dernière actualisation constatée (millésime en cours)
- format (CSV / JSON / GeoJSON / API)
- licence + conditions / règles d'utilisation
- niveau de fiabilité (mesure / modèle / éditorial)
- coût éventuel
- limites connues / pièges
- responsable interne (data owner)
```

## 3. Matrice Sources × Données (extrait)

| Indicateur produit | Source primaire | Source secondaire | Maille | Fréquence | Nature |
|--------------------|-----------------|-------------------|--------|-----------|--------|
| Prix €/m² | DVF | — | Commune/IRIS | Semestrielle | Mesure |
| Tendance prix (1/3/5/10 ans) | DVF (historique) | — | Commune | Semestrielle | Mesure/calcul |
| Loyer €/m² | Carte des loyers | OLL / encadrement | Commune/EPCI | Annuelle | Modèle |
| Rendement brut | DVF + Loyers | — | Commune | Dérivée | Calcul |
| Population / démographie | INSEE RP | — | IRIS/Commune | Annuelle | Mesure |
| Revenu médian | INSEE Filosofi | — | Commune/IRIS | Annuelle | Mesure |
| Emploi / chômage | INSEE | — | Zone d'emploi/Commune | Annuelle | Mesure |
| Éducation | Annuaire MEN + IPS + résultats | — | Établissement→zone | Annuelle | Mesure |
| Transports (temps vers pôle) | OSM/OSRM + gares + GTFS | — | Commune | Périodique | Calcul |
| Sécurité | SSMSI | — | Commune | Annuelle | Mesure (à normaliser) |
| Santé (accès soins) | DREES/APL | FINESS | Commune/bassin | Annuelle | Mesure |
| Environnement/risques | Géorisques + Atmo | OSM | Adresse/commune | Variable | Mesure |
| DPE / passoires | ADEME | — | Adresse→zone | Continue | Mesure |
| Projets urbains | Sitadel + curation | GPU / local | Commune | Variable | **Prospectif** |
| Taux d'emprunt | Banque de France/obs. | — | National | Mensuelle | Mesure |

## 4. Gouvernance des sources

- Chaque source a un **data owner** et une **fiche** tenue à jour dans le back-office (doc 15, Epic Admin).
- Respect strict des **licences** et conditions d'API (quotas, attribution « Source : … »).
- Attribution visible dans l'UI (chip source) + page « Sources & méthodologie ».
- Ajout d'une source privée soumis à validation juridique (contrat, droit de réutilisation, RGPD).
