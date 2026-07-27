# 14 — MVP & priorisation MoSCoW

## 1. Objectif du MVP

Démontrer **une boucle de valeur complète** :

> Je définis mon projet → la plateforme analyse les données → elle identifie les zones compatibles → je compare → je comprends pourquoi → je simule mon achat.

Et prouver le différenciateur : **données fiables, datées, expliquées + Data Factory automatique**.

## 2. Hypothèses de cadrage MVP (issues du doc 00)

- **Périmètre géo** : France métropolitaine, maille **commune** + **arrondissements PLM**. IRIS/quartier reporté en V1.
- **Parcours prioritaire** : **Résidence principale** en premier (data plus robuste), Investissement inclus mais secondaire.
- **Sources MVP maîtrisées** : DVF (prix), INSEE (démo/revenus/emploi), Loyers (estimés), Éducation, Transports (temps vers pôles), + socle géo. Sécurité/Environnement/DPE en profondeur → V1.
- **Explications** : **déterministes** (templates sur décomposition des scores). Assistant IA LLM → V1.
- **Simulateur** : simplifié, étiqueté « indicatif ».

## 3. Priorisation MoSCoW

### MUST (indispensable — définit le MVP)
- Onboarding progressif (RP + Invest) avec critères pondérés.
- **Module financement** : budget d'achat calculé (apport + capacité d'emprunt + frais).
- Référentiel géographique + **carte de France** (MapLibre + tuiles), couches prix/loyers/qualité de vie.
- **Data Factory** opérationnelle sur DVF + INSEE + Loyers + Éducation + Transports (collecte→QC→transfo→normalisation→**historisation**→indicateurs→publication).
- Indicateurs : prix €/m², tendance, loyer (estimé), rendement (estimé), indicateurs territoriaux clés.
- **Scoring** : Home Score, Investment Score, **Data Confidence Score** (+ décomposition).
- Classement personnalisé + **recalcul dynamique** des pondérations.
- Fiche ville (scores, sous-scores, points forts/faibles, **pourquoi cette zone**).
- **Comparateur** (2–4 zones) + badges auto.
- **Transparence** : source + date + confiance partout ; bouton « Comment est-ce calculé ? ».
- Simulateur simple (mensualité / capacité ; rendement basique).
- Recherche inversée « Où puis-je acheter ? » (version filtres + budget ; isochrones pré-calculés vers pôles majeurs).
- Compte + **projet persistant** (sauvegarde) + favoris.
- Back-office minimal : statut des sources, dernier run, DQ, relance manuelle.

### SHOULD (fort valeur, juste après)
- Alertes (prix, entrée dans le budget, évolution de score) + explication des facteurs.
- Historique visualisé (1/3/5 ans) sur prix et scores.
- DPE / passoires (côté investissement).
- Sécurité & environnement/risques enrichis.
- Export PDF d'une analyse.
- Granularité IRIS / quartiers là où data suffisante.

### COULD (souhaitable, si capacité)
- Assistant IA conversationnel (LLM + outils).
- Partage d'analyse (lien public).
- Isochrones personnalisés « X accessible en N min » à la volée (au-delà des pôles pré-calculés).
- Analyses historiques 10 ans, décomposition fine des évolutions.
- Diversité géographique dans le top (anti-redondance).

### WON'T (hors périmètre pour l'instant)
- Annonces de biens réels / mise en relation transactionnelle.
- Fiscalité détaillée (LMNP, Pinel, déficit foncier…) dans le simulateur.
- Territoires ultramarins (selon périmètre retenu).
- Offre B2B (courtiers/banques) packagée.
- Temps réel des données socio/immo (inexistant à la source).
- Application mobile native (la PWA couvre le mobile au MVP).

## 4. Definition of Done du MVP

Le MVP est « fait » quand :
1. Un utilisateur type (P1) complète l'onboarding et obtient un **top 5 réaliste dans son budget**, sur données réelles (au moins 2–3 régions chargées).
2. Chaque chiffre affiché porte **source + date + confiance** et son explication.
3. La **Data Factory tourne automatiquement** (orchestrée) sur les 5 sources MUST, avec historisation et DQ bloquante.
4. Le **comparateur** et le **simulateur simple** fonctionnent.
5. Le **projet est sauvegardé** et réutilisable.
6. Le **back-office** montre l'état des sources et permet une relance.
7. NFR clés tenues (perf carte, accessibilité de base, transparence 100 %).

## 5. Stratégie de données pour le MVP (pragmatique)

Charger d'abord **2–3 régions** (ex. une région dense + une région familles-primo, incluant Paris pour les arrondissements) afin d'itérer vite sur la qualité du scoring avant le passage à l'échelle nationale. Le passage France entière est un **run de scale**, pas un rebuild.
