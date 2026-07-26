# 00 — Challenge du concept

> Étape 1 du travail demandé : identifier les incohérences, risques, données difficiles à obtenir et fonctionnalités manquantes **avant** de concevoir. Ce document est volontairement critique : c'est ici qu'on fait baisser le risque projet.

## 1. Le concept est solide, mais son point faible n'est pas l'UX — c'est la data

La proposition de valeur repose entièrement sur une promesse implicite : **« nos données sont fiables, fraîches et comparables entre territoires »**. Or, en France :

- les données existent, mais à des **granularités, fréquences et qualités hétérogènes** ;
- certaines dimensions du produit (qualité de vie, sécurité, « potentiel futur ») **n'ont pas de source unique et objective** — elles sont des **constructions** qu'il faudra assumer et documenter ;
- le risque n° 1 n'est pas technique, c'est **la crédibilité** : une seule recommandation visiblement fausse détruit la confiance sur toute la plateforme.

**Décision structurante :** faire du *Data Confidence Score* un citoyen de première classe, présent partout, dès le MVP. Ne jamais afficher un score sans son niveau de confiance.

## 2. Difficultés par source de données (réalité terrain)

| Donnée | Disponibilité | Difficulté réelle |
|--------|---------------|-------------------|
| **Prix de transaction (DVF)** | Excellente, ouverte | Bien réel mais **bruité** : ventes atypiques, biens démembrés, dépendances, VEFA. Nécessite un fort nettoyage + agrégation robuste (médiane, filtrage). Latence : ~6 mois. |
| **Loyers** | Partielle | **Pas de base exhaustive nationale des loyers de marché.** Sources : indicateurs de loyers data.gouv (carte des loyers, maille commune/EPCI, modélisée), observatoires locaux (OLL), encadrement (Paris, Lille…). → **loyers = estimation, pas mesure.** À afficher comme tel. |
| **Rendement locatif** | Calculé | Dérivé de prix + loyers ⇒ **hérite de l'incertitude des deux**. Ne jamais le présenter au 0,1 % près. |
| **Sécurité** | Bonne mais piégeuse | Base « délinquance enregistrée » (SSMSI) à la commune, annuelle. **Piège :** taux bruts non comparables sans population/flux ; risque de stigmatisation. À manier avec méthode et prudence éditoriale. |
| **Éducation** | Bonne | Annuaire éducation + IPS + résultats brevet/bac (data.gouv/MEN). Rattacher établissement→zone géographique demande un travail de carte scolaire (imparfait). |
| **Transports** | Bonne | GTFS/PLM, base des gares, temps de trajet via un moteur d'itinéraires (OpenTripPlanner/OSRM). **Coûteux à calculer** à grande échelle (« Paris accessible en X min »). |
| **Environnement / risques** | Bonne | Qualité de l'air, Géorisques (inondation, retrait-gonflement argiles), bruit, espaces verts. Multi-sources, mailles variées. |
| **Projets urbains / « potentiel futur »** | Faible / non structurée | **Le point le plus fragile.** Nouvelles lignes (Grand Paris Express), ZAC, permis de construire (base Sitadel), écoquartiers… mais **pas de flux national propre « projets à venir »**. Beaucoup restera **semi-manuel** ou heuristique. À assumer comme un score à faible confiance. |
| **Démographie / emploi / revenus** | Excellente (INSEE) | Fiable mais **annuelle et décalée** (millésimes). Bien pour le structurel, pas pour le conjoncturel. |

**Conséquence produit :** on distingue explicitement, partout dans l'UI :
**Fait mesuré** (DVF, INSEE) · **Estimation / modèle** (loyers, temps de trajet) · **Construction éditoriale** (scores de qualité de vie) · **Prospective** (potentiel futur).

## 3. Incohérences / tensions à arbitrer dans le prompt initial

1. **« Quartier » pour toute la France** : la maille quartier n'existe proprement que via les **IRIS (INSEE)** et, à Paris/Lyon/Marseille, les arrondissements. Promettre « France → … → Quartier » partout est **irréaliste**. → On promet une granularité **adaptative** : commune partout, IRIS/arrondissement là où c'est pertinent et fiable.
2. **« Temps réel »** (mentionné §7) : aucune de ces sources n'est temps réel. Le « temps réel » n'a de sens que pour d'éventuelles annonces (hors périmètre MVP). → Retirer la promesse temps réel pour les données socio/immo.
3. **Simulateur d'investissement** : cash-flow, fiscalité (LMNP, déficit foncier, Pinel/PLS…) sont **très complexes et évolutifs**. → MVP = simulateur **simplifié et clairement étiqueté « estimation indicative »**, pas un outil fiscal.
4. **Rendement « estimé » présenté comme comparateur clé** : attention, deux villes peuvent avoir le même rendement affiché avec des fiabilités très différentes. → Toujours coupler rendement + confiance.
5. **« Achetez ici » vs posture** : le prompt le dit lui-même — rester **non prescriptif**. Enjeu réglementaire réel (ne pas basculer dans le conseil en investissement / démarchage). → Charte éditoriale + mentions légales.

## 4. Fonctionnalités manquantes / à ajouter

- **Capacité d'emprunt & taux** : le « budget » est en réalité un **budget d'achat dérivé** (apport + capacité d'emprunt selon taux, durée, taux d'endettement ~35 % HCSF). C'est central pour « Où puis-je acheter ? » et **doit être un module à part entière**, avec taux mis à jour.
- **Frais réels** : frais de notaire (~7–8 % ancien, ~2–3 % neuf), travaux, charges de copropriété, taxe foncière — sinon le « budget » est faux.
- **DPE / passoires thermiques** : dimension devenue décisive (interdiction progressive de location des G/F). Source : base DPE ADEME. **À intégrer tôt**, surtout côté investissement.
- **Comparaison « bien-type »** : comparer des €/m² ne suffit pas ; comparer le **prix d'un bien correspondant au profil** (déjà prévu §5) est différenciant → à garder prioritaire.
- **Explicabilité du delta temporel** : « pourquoi Nantes est passée de 78 à 83 » impose de **stocker la décomposition du score**, pas juste le score final. Contrainte à intégrer dès le modèle de données.
- **Gestion des zones à faibles observations** : beaucoup de petites communes ont trop peu de ventes/an ⇒ scores instables. Prévoir **repli sur maille supérieure** (EPCI/département) + signalement.

## 5. Risques majeurs & mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Données fausses / obsolètes affichées comme sûres | Perte de confiance, réputationnel | Data Confidence Score omniprésent + traçabilité + contrôles DQ bloquants avant publication |
| Sur-promesse « potentiel futur » | Décisions financières mal orientées | Étiquetage « prospective », faible poids par défaut, transparence méthode |
| Stigmatisation territoriale (sécurité) | Éthique, image, juridique | Prudence éditoriale, normalisation, contexte, pas de classement « villes dangereuses » |
| Complexité data > capacité équipe | Dérive délais/coûts | MVP = **3–4 sources maîtrisées** (DVF, INSEE, loyers, éducation/transports), le reste en V1+ |
| Requalification en conseil financier réglementé | Juridique | Posture non prescriptive, mentions, pas de mise en relation transactionnelle au MVP |
| Coût calcul temps de trajet à l'échelle nationale | Coût infra | Pré-calcul par maille + POI clés, pas à la volée pour tout |
| RGPD (profils, critères de vie) | Conformité | Minimisation, base légale, pas de donnée sensible non nécessaire (voir doc 13) |

## 6. Décisions à trancher (questions ouvertes pour le PO)

1. **Périmètre géo MVP** : France métropolitaine uniquement, maille **commune** + **arrondissements PLM**, IRIS en V1 ? *(recommandation : oui)*
2. **Cible prioritaire MVP** : Résidence principale **ou** Investissement d'abord ? *(recommandation : Résidence principale — data plus robuste, audience plus large ; l'investissement réutilise ~70 % des briques)*
3. **Modèle économique** : freemium (analyse gratuite / comparateur & alertes premium) ? B2B (courtiers, CGP, banques) ? *(à définir — impacte la roadmap)*
4. **Ambition IA au MVP** : assistant conversationnel réel dès le MVP, ou d'abord explications générées de manière déterministe (templates) puis LLM en V1 ? *(recommandation : explications déterministes au MVP, LLM en V1)*

> Ces décisions sont reprises comme hypothèses par défaut dans la suite des documents ; elles peuvent être révisées.
