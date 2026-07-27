# 06 — Moteur de recommandation, recherche inversée & assistant IA

## 1. Moteur de recommandation

Le moteur transforme un **Projet** en **classement personnalisé de zones**, expliqué.

```
Entrées : Profil + Budget + Critères pondérés + (zone de préférence / contraintes d'accessibilité)
Données : Indicateurs par zone + Scores + Confiance + Historique
Sortie  : Liste ordonnée de zones {rang, score perso, confiance, motifs, compromis}
```

### Pipeline
1. **Filtrage dur (hard filters)** — élimine les zones incompatibles :
   - hors périmètre géographique choisi / hors rayon / hors « X accessible en N min » ;
   - type de bien indisponible (ex. « maison » dans un hyper-centre sans maisons) ;
   - contraintes non négociables déclarées.
2. **Scoring souple (soft ranking)** — calcule Home/Investment Score personnalisé (doc 05) sur les zones restantes.
3. **Ajustement budget** — sépare « compatibles budget » (prix bien-type ≤ budget) et « au-dessus » ; le top principal privilégie les compatibles (RG-R2).
4. **Prise en compte de la confiance** — à scores proches, arbitrage par Data Confidence (paramétrable).
5. **Génération des explications** — pour chaque zone du top : motifs (top contributions vs critères prioritaires) + compromis (sous-scores faibles pertinents).
6. **Diversité** (option) — éviter un top 5 de communes limitrophes quasi identiques : légère pénalité de redondance géographique pour proposer des alternatives.

### Exemple de sortie
```
1. Angers — 91/100  (confiance 82 %)
   Pourquoi : prix compatibles avec votre budget (bien-type T4 ~295k € < 372k),
   offre éducative favorable (éduc. 84), accessibilité ferroviaire (Paris ~1h30),
   bonne qualité de vie (78).
   Compromis : offre de spécialistes médicaux moyenne (santé 61).

2. Tours — 87/100 …
```

## 2. Fonction « Où puis-je acheter ? » (recherche inversée)

Inversion du point de départ : au lieu de « je choisis une ville », l'utilisateur pose **ses contraintes** et la plateforme trouve **les territoires compatibles**.

### Entrée type
```
Budget : 350 000 €        Surface : ≥ 70 m²        Chambres : 3
Profil : famille avec enfant      Écoles : important
Gare : importante      « Paris accessible rapidement » (≤ 1h30 porte-à-porte)
```

### Traitement
1. Traduire les contraintes en **hard filters** (budget → bien-type ≤ budget ; « Paris ≤ 1h30 » → filtre isochrone pré-calculé ; « gare importante » → présence d'une gare desservie).
2. Récupérer les zones survivantes.
3. **Scorer** selon les critères pondérés (écoles pondérées haut ici).
4. Restituer : **Carte + classement + prix (bien-type) + score + avantages + compromis**.

### Points d'implémentation
- **Isochrones / temps de trajet** : pré-calculés par maille vers un ensemble de **pôles de référence** (grandes gares, métropoles) via un moteur d'itinéraires (OSRM/OpenTripPlanner). Requête à la volée = lecture d'une table, pas un calcul temps réel (voir doc 00 §2 et doc 12).
- **Bien-type** : prix estimé du bien correspondant au profil, dérivé du €/m² de la zone × surface cible (± ajustement type maison/appartement).
- Repli si aucune zone ne satisfait tout : **relâcher progressivement** la contrainte la moins prioritaire et signaler le compromis (« aucune zone à ≤ 1h30 dans le budget ; à 1h45, 6 zones »).

## 3. Assistant IA immobilier

Assistant conversationnel **ancré sur les données de la plateforme** (pas un modèle de connaissances générales qui invente des chiffres).

### Exemples de requêtes
- « Où acheter autour de Paris avec 350 000 € ? »
- « Compare Rennes et Nantes pour une famille avec deux enfants. »
- « Où investir avec un rendement brut supérieur à 5 % ? »
- « Pourquoi Angers est mieux classée que Tours pour mon profil ? »
- « Quelles villes ont le meilleur potentiel à 5 ans ? »

### Architecture (RAG + outils, pattern « tool use »)
```
Question NL
 └─ LLM (orchestrateur) avec accès à des OUTILS internes :
     • search_zones(critères)          → recherche inversée
     • get_zone(zone)                  → fiche + scores + confiance
     • compare_zones([...])            → comparateur
     • explain_score(zone, projet)     → décomposition (doc 05 §7)
     • get_history(zone, indicateur)   → historique
 └─ Le LLM APPELLE les outils, ne fabrique pas les chiffres.
 └─ Réponse composée à partir des sorties d'outils, avec citations (source + date).
```
> Le LLM sert à **comprendre la question, orchestrer et rédiger** ; **les chiffres viennent toujours de la base**. Cela évite les hallucinations sur des données financières.

### Règles de réponse (obligatoires — RG-E3)
L'assistant **distingue et étiquette** :
- **Faits** : valeurs mesurées et sourcées (« Prix moyen Nantes 4 100 €/m², DVF, 12 derniers mois »).
- **Calculs** : dérivés (« rendement brut estimé ~4,3 % »).
- **Interprétations** : lecture (« plus favorable aux familles grâce à… »).
- **Prévisions** : prospective, **jamais présentée comme certaine** (« potentiel à 5 ans, sous réserve que… »).

Toujours : citer sources + dates, exposer le niveau de confiance, proposer une action (ouvrir fiche, comparer, ajuster pondérations), rester **non prescriptif**.

### Positionnement roadmap
- **MVP** : explications **déterministes** (générées par templates à partir de la décomposition des scores) — pas de LLM en frontal, mais l'expérience « pourquoi cette zone » existe.
- **V1** : assistant conversationnel LLM + outils (ci-dessus).
- **V2+** : mémoire du projet, questions comparatives multi-tours, synthèses proactives.

## 4. Garde-fous transverses

- Pas de recommandation sans motif rattaché aux critères (RG-R1).
- Pas de prévision présentée comme un fait (RG-E2).
- Toute réponse chiffrée est **traçable** jusqu'à la source (doc 09).
- Reproductibilité : à projet + millésime constants, mêmes recommandations (RG-R3).
