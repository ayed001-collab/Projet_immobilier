# 04 — Modèle métier : concepts, glossaire & règles de gestion

## 1. Concepts métier (modèle conceptuel — vue métier)

| Concept | Définition | Relations |
|---------|------------|-----------|
| **Utilisateur** | Personne avec un compte | possède ▸ Projets, Favoris, Alertes |
| **Projet immobilier** | Intention persistante : type (RP/Invest) + budget + critères pondérés | appartient à ▸ Utilisateur ; génère ▸ Recommandations |
| **Profil / Critères** | Ensemble des préférences pondérées (écoles, transports, rendement…) | fait partie de ▸ Projet |
| **Zone géographique** | Unité territoriale analysable (Région, Département, EPCI, Commune, Arrondissement PLM, IRIS/quartier) | hiérarchie parent/enfant ; porte ▸ Indicateurs, Scores |
| **Indicateur** | Mesure datée et sourcée rattachée à une zone (prix €/m², loyer, taux délinquance…) | rattaché à ▸ Zone + Source + Millésime |
| **Source** | Origine d'un jeu de données (DVF, INSEE…) | alimente ▸ Indicateurs |
| **Score** | Note 0–100 calculée pour une zone (Home, Investment) + Data Confidence | dérivé de ▸ Indicateurs + Pondérations |
| **Recommandation** | Zone proposée à un Projet, rang + explication | lie ▸ Projet ↔ Zone |
| **Comparaison** | Mise en regard de 2–4 zones | référence ▸ Zones |
| **Simulation** | Calcul financier (mensualité / rendement / cash-flow) | attachée à ▸ Projet + Zone |
| **Alerte** | Règle de suivi + notifications d'événements | attachée à ▸ Utilisateur + (Zone|Projet|Recherche) |
| **Événement** | Fait daté (variation prix, nouvelle donnée, projet urbain) | déclenche ▸ Alerte |

## 2. Glossaire (extraits)

- **Home Score** : adéquation d'une zone à un projet de résidence principale (0–100), personnalisé.
- **Investment Score** : adéquation d'une zone à un projet d'investissement (0–100), personnalisé.
- **Data Confidence Score** : fiabilité globale des données sous-jacentes à une zone/score (0–100).
- **Bien-type** : bien fictif représentatif du projet (ex. T4, 90 m²) servant aux comparaisons de prix « à profil constant ».
- **Rendement brut** : loyer annuel estimé / prix d'achat (frais inclus optionnels). **Estimation.**
- **Tension locative** : indicateur de rareté de l'offre locative vs demande (proxy à définir : ratio demandeurs, vacance, délais).
- **Millésime** : version datée d'un jeu de données source (ex. DVF 2025-S1, INSEE RP 2021).
- **Granularité adaptative** : la maille la plus fine *fiable* disponible pour une zone (commune partout, IRIS/arrondissement si data suffisante).

## 3. Règles de gestion (Business Rules)

### RG — Budget & financement
- **RG-B1** : `budget_d_achat = apport + capacité_emprunt − frais_acquisition`, où `frais_acquisition` ≈ 7,5 % (ancien) / 2,5 % (neuf) du prix (approximation, étiquetée).
- **RG-B2** : `capacité_emprunt` dérivée de : revenus nets, taux d'endettement max (défaut 35 %, HCSF), taux d'intérêt courant, durée. Le **taux** est une donnée actualisée (source à définir), pas une constante en dur.
- **RG-B3** : une zone est **« dans le budget »** si le prix du **bien-type** du projet ≤ `budget_d_achat`. Sinon, marquée « au-dessus du budget » (jamais masquée).

### RG — Éligibilité / affichage des zones
- **RG-Z1** : une zone n'est scorée que si elle atteint un **seuil minimal d'observations** (ex. ≥ N ventes DVF sur la fenêtre) ; sinon repli sur la maille parente + drapeau « données insuffisantes ».
- **RG-Z2** : la granularité affichée par défaut = **commune** ; IRIS/arrondissement seulement si `confiance ≥ seuil`.
- **RG-Z3** : toute zone affichée expose sa **date de fraîcheur la plus ancienne** parmi les indicateurs contribuant au score mis en avant.

### RG — Indicateurs & données
- **RG-D1** : un indicateur sans source + date **ne peut pas être affiché**.
- **RG-D2** : un indicateur estimé (modèle) doit porter le marqueur **« estimé »** ; un indicateur prospectif le marqueur **« prospective »**.
- **RG-D3** : une donnée dont l'ancienneté dépasse le seuil défini pour sa catégorie est marquée **« donnée ancienne »** et son poids dans la confiance baisse (voir doc 09).
- **RG-D4** : lors d'une mise à jour, l'ancienne valeur **n'est jamais écrasée** : elle est historisée (voir doc 09/10).
- **RG-D5** : on **ne ré-actualise pas** la date d'un indicateur si la source n'a pas publié de nouveau millésime (pas de fraîcheur artificielle).

### RG — Scoring
- **RG-S1** : `Home Score` et `Investment Score` ∈ [0,100], recalculés dynamiquement à chaque changement de pondération.
- **RG-S2** : chaque score est **décomposable** : on stocke la contribution de chaque sous-critère (pour l'explicabilité et l'analyse des évolutions).
- **RG-S3** : un score s'accompagne **toujours** de son Data Confidence Score ; un score à haute valeur mais faible confiance ne doit pas primer visuellement sur un score fiable.
- **RG-S4** : les pondérations utilisateur sont **normalisées** (somme = 100 %) avant calcul.
- **RG-S5** : les indicateurs sont **normalisés** (0–1) par une méthode robuste et **comparable entre zones** (voir doc 05).

### RG — Recommandation
- **RG-R1** : une recommandation expose **au moins un motif** rattaché aux critères prioritaires de l'utilisateur.
- **RG-R2** : une zone hors budget peut apparaître mais **jamais en tête** du top « compatible budget ».
- **RG-R3** : le classement est **déterministe et reproductible** à pondérations + millésime constants (auditable).

### RG — Éditorial / posture (conformité)
- **RG-E1** : vocabulaire **non prescriptif** obligatoire. Interdits : « achetez ici », « placement garanti », « valeur sûre ». Autorisés : « forte adéquation avec vos critères », « rendement estimé », « potentiel, sous réserve… ».
- **RG-E2** : toute **prévision** est présentée comme incertaine, jamais comme un fait.
- **RG-E3** : l'assistant IA distingue explicitement **Faits / Calculs / Interprétations / Prévisions** et cite ses sources.

### RG — Alertes
- **RG-A1** : une alerte se déclenche sur **franchissement de seuil** (variation prix/loyer/rendement/score) ou **événement** (nouvelle donnée, projet urbain, entrée dans le budget).
- **RG-A2** : toute alerte de variation de score **explique les facteurs** de l'évolution (grâce à RG-S2 + historisation).
- **RG-A3** : anti-bruit : regroupement + seuil de significativité pour ne pas sur-notifier.
