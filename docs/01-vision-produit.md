# 01 — Vision produit, proposition de valeur & personas

## 1. Vision produit

> **Devenir le copilote de référence de la décision immobilière des particuliers en France** : donner à chacun, en quelques minutes et à partir de son projet, une réponse claire, personnalisée et transparente à la question *« où acheter ? »*, en transformant des données publiques fiables en recommandations explicables et suivies dans le temps.

Le produit n'aide pas à **trouver un bien** (ce que font les portails d'annonces) : il aide à **choisir un territoire** — l'étape de décision qui précède la recherche du bien et qui est aujourd'hui mal outillée.

## 2. Proposition de valeur

**Pour** les particuliers qui envisagent d'acheter (résidence principale ou investissement)
**Qui** sont submergés de statistiques dispersées et ne savent pas *où* concentrer leur recherche,
**Notre produit** est un copilote de décision territoriale
**Qui** classe et explique les zones les plus adaptées à *leur* projet,
**Contrairement à** un portail d'annonces (SeLoger, Leboncoin) ou à un site de prix (MeilleursAgents, DVF brut),
**Nous** partons du profil de l'utilisateur, croisons prix + qualité de vie + potentiel, **assumons la transparence data** (source, date, confiance) et **faisons vivre le projet dans la durée**.

### Bénéfices clés

1. **Gain de temps décisionnel** : de « 34 000 communes » à « votre top 5 argumenté ».
2. **Personnalisation** : le classement dépend de *vos* critères pondérés, pas d'un palmarès générique.
3. **Confiance** : chaque chiffre est sourcé, daté et accompagné d'un niveau de fiabilité.
4. **Recherche inversée** : « avec 350 000 €, une famille, 70 m², Paris accessible → voici où ».
5. **Suivi dans le temps** : un projet persistant + alertes quand le marché bouge.

## 3. Différenciation

| Acteur | Ce qu'il fait | Ce qu'il ne fait pas (notre espace) |
|--------|---------------|-------------------------------------|
| SeLoger / Leboncoin / Bien'ici | Annonces de biens | Décision *territoriale* amont, personnalisée |
| MeilleursAgents / Efficity | Estimation & prix au m² | Croisement multi-critères + scoring de projet |
| DVF / cartes data.gouv | Données brutes | Interprétation, personnalisation, explicabilité |
| Cartes « villes où il fait bon vivre » (presse) | Palmarès génériques annuels | Personnalisation au projet + fraîcheur + transparence |
| Outils investisseurs (Horiz/Rendementlocatif…) | Simulation de rentabilité d'un bien précis | Choix *du territoire* avant le bien, côté RP *et* invest |

**Notre moat** se construit sur : (a) la **Data Factory** (fraîcheur + qualité + historique = difficile à répliquer), (b) l'**explicabilité** du scoring, (c) le **projet persistant** qui crée de la rétention.

## 4. Personas

### P1 — Camille & Julien, primo-accédants famille (Résidence principale) — *persona pivot*
- 34 & 36 ans, un enfant + un en projet, locataires en région parisienne.
- Budget ~380 000 € (apport 60 k€), veulent une maison/T4, jardin, **bonnes écoles**, trajet boulot ≤ 45 min en train.
- **Douleur** : « on ne sait pas quelles villes regarder ; on compare à la main sur 10 onglets. »
- **Attentes** : un top de villes réaliste dans leur budget, avec écoles/transports, et *pourquoi*.

### P2 — Sonia, investisseuse rendement (Investissement)
- 42 ans, cadre, déjà propriétaire de sa RP, veut un premier locatif.
- Budget 200 k€, cherche **rendement brut ≥ 5,5 %**, risque locatif maîtrisé, horizon 10 ans.
- **Douleur** : « les villes à haut rendement affiché sont souvent celles à haut risque ; je ne sais pas trancher. »
- **Attentes** : rendement **fiabilisé**, tension locative, DPE, potentiel de valorisation, comparateur.

### P3 — Marc, mobilité pro / arbitrage (Résidence principale)
- 48 ans, muté, doit choisir une ville dans une nouvelle région qu'il ne connaît pas.
- **Douleur** : méconnaissance totale du terrain, arbitrage qualité de vie / budget / trajet.
- **Attentes** : recherche inversée + fiches comparatives rapides.

### P4 — Léa, jeune active exploratrice (Top of funnel)
- 29 ans, songe à acheter « un jour », explore par curiosité.
- **Attentes** : expérience visuelle, carte, pas d'engagement ; on la convertit via le projet sauvegardé + alertes.

### P5 (secondaire / B2B) — Courtier / CGP
- Utilise la plateforme comme support d'argumentation client (export PDF, comparateur).
- Piste de monétisation B2B (hors périmètre MVP mais à garder à l'esprit dans l'archi).

## 5. Parties prenantes

| Partie prenante | Intérêt / rôle |
|-----------------|----------------|
| Utilisateurs particuliers | Cœur de cible, décisionnaires |
| Product Owner | Priorisation, arbitrages valeur/faisabilité |
| Équipe Data (Data Eng / Analyst) | Data Factory, qualité, scoring |
| Équipe Dev (front/back) | Produit, API, cartographie |
| UX/UI Designer | Parcours, confiance, accessibilité |
| Data Protection Officer / juridique | RGPD, posture non prescriptive, mentions |
| Fournisseurs de données publics (INSEE, DGFiP/DVF, MEN, SSMSI…) | Sources, licences, conditions d'usage |
| Éventuels partenaires B2B (courtiers, banques, CGP) | Distribution / monétisation future |
| Éventuels investisseurs / financeurs du projet | Vision, roadmap, traction |

## 6. Métriques de succès (produit)

- **Activation** : % d'utilisateurs qui complètent l'onboarding et obtiennent un top 5.
- **Aha-moment** : % qui ouvrent ≥ 1 fiche ville détaillée + utilisent le comparateur.
- **Rétention / valeur data** : % qui **sauvegardent un projet** et reviennent après une alerte.
- **Confiance** : taux de clic sur « Comment est calculé cet indicateur ? » (engagement transparence) ; NPS.
- **Qualité data** (interne) : Data Confidence Score moyen des zones affichées, % de sources « à jour ».
