# 15 — Backlog : Epics → Features → User Stories → Critères d'acceptation

> Format US : *En tant que … je veux … afin de …*. CA = critères d'acceptation (Given/When/Then simplifié). Priorité MoSCoW entre crochets.

---

## EPIC 1 — Onboarding & Projet

**F1.1 — Choix du parcours** [Must]
- US1.1.1 : En tant que visiteur, je veux choisir « Résidence principale » ou « Investir » afin de démarrer un parcours adapté.
  - CA : 2 entrées visibles sur la home ; le choix conditionne les questions suivantes.

**F1.2 — Questionnaire progressif** [Must]
- US1.2.1 : En tant qu'utilisateur, je veux décrire mon projet par étapes courtes afin de ne pas être submergé.
  - CA : progressive disclosure (5 étapes max) ; valeurs par défaut ; possibilité de revenir en arrière ; barre de progression.
- US1.2.2 : En tant qu'utilisateur, je veux régler l'**importance** de chaque critère afin que le classement reflète mes priorités.
  - CA : curseurs d'importance ; pondérations normalisées ; impact visible au recalcul.

**F1.3 — Module financement / budget** [Must]
- US1.3.1 : En tant qu'utilisateur, je veux que mon budget d'achat soit calculé depuis mon apport et ma capacité d'emprunt afin d'avoir un budget réaliste.
  - CA : `budget = apport + capacité_emprunt − frais` (RG-B1/B2) ; taux courant affiché et modifiable ; hypothèses explicites.

**F1.4 — Projet persistant** [Must]
- US1.4.1 : En tant qu'utilisateur connecté, je veux sauvegarder mon projet afin de le retrouver et le suivre.
  - CA : projet stocké ; réouverture restitue critères + top ; création de compte non bloquante avant les résultats.

---

## EPIC 2 — Data Factory & Data Quality

**F2.1 — Connecteurs sources** [Must]
- US2.1.1 : En tant qu'équipe data, je veux collecter automatiquement DVF/INSEE/Loyers/Éducation/Transports afin d'alimenter la plateforme.
  - CA : un DAG par source ; collecte idempotente ; **détection de nouveau millésime** (pas de re-téléchargement inutile) ; métadonnées de run écrites.

**F2.2 — Contrôle qualité** [Must]
- US2.2.1 : En tant qu'équipe data, je veux des contrôles DQ à l'entrée et à la sortie afin de ne jamais publier de données cassées.
  - CA : contrôles complétude/validité/cohérence/plausibilité/fraîcheur ; **QC sortie bloquante** ; quarantaine + alerte en cas d'échec ; DQ score calculé.

**F2.3 — Transformation & normalisation géo** [Must]
- US2.3.1 : En tant qu'équipe data, je veux nettoyer et rattacher les données au référentiel géographique afin d'obtenir des indicateurs comparables.
  - CA : nettoyage DVF (outliers, médiane robuste) ; rattachement COG/BAN ; gestion des évolutions de communes.

**F2.4 — Historisation** [Must]
- US2.4.1 : En tant qu'équipe data, je veux historiser sans écraser afin de suivre l'évolution et d'expliquer les changements.
  - CA : append-only avec millésime + `valid_from/valid_to` ; anciennes valeurs conservées ; reconstruction d'un état passé possible.

**F2.5 — Orchestration & fréquences** [Must]
- US2.5.1 : En tant qu'équipe data, je veux planifier chaque source à sa fréquence propre afin d'actualiser sans effort et sans fraîcheur artificielle.
  - CA : planning par source ; déclenchement event-driven sur nouveau millésime ; reprise sur échec ; RG-D5 respectée.

---

## EPIC 3 — Scoring

**F3.1 — Sous-scores & normalisation** [Must]
- US3.1.1 : En tant que moteur, je veux normaliser les indicateurs de façon comparable entre zones afin de scorer équitablement.
  - CA : normalisation par rang/percentile ; gestion du sens (higher/lower better) ; strate de comparaison paramétrable.

**F3.2 — Home / Investment Score** [Must]
- US3.2.1 : En tant qu'utilisateur, je veux un score 0–100 personnalisé par zone afin de comparer objectivement.
  - CA : score = Σ pondérations × sous-scores ; recalcul dynamique ; déterministe et reproductible.

**F3.3 — Data Confidence Score** [Must]
- US3.3.1 : En tant qu'utilisateur, je veux connaître la fiabilité des données afin de ne pas sur-interpréter.
  - CA : confidence 0–100 par zone ; 4 niveaux ; affiché à côté de chaque score ; modère la mise en avant.

**F3.4 — Décomposition / explicabilité** [Must]
- US3.4.1 : En tant qu'utilisateur, je veux comprendre pourquoi une zone a ce score afin de me l'approprier.
  - CA : `SCORE_BREAKDOWN` stocké ; top contributions restituées ; évolution décomposable (diff millésimes).

---

## EPIC 4 — Recherche & Recommandation

**F4.1 — Classement personnalisé** [Must]
- US4.1.1 : En tant qu'utilisateur, je veux un top de zones adaptées à mon projet afin de savoir où chercher.
  - CA : hard filters + ranking ; séparation compatibles/hors budget ; ≥ 1 motif par zone (RG-R1) ; recalcul au changement de pondération.

**F4.2 — Recherche inversée « Où puis-je acheter ? »** [Must]
- US4.2.1 : En tant qu'utilisateur, je veux saisir mes contraintes (budget, surface, chambres, écoles, accessibilité) et obtenir les zones compatibles.
  - CA : filtres durs incl. isochrone pré-calculé vers pôle ; résultats = carte + classement + prix + score + avantages + compromis ; relâchement progressif si vide.

**F4.3 — Assistant IA** [Could]
- US4.3.1 : En tant qu'utilisateur, je veux poser des questions en langage naturel afin d'explorer sans manipuler l'UI.
  - CA : réponses ancrées sur les données (outils internes) ; distinction Faits/Calculs/Interprétations/Prévisions ; citations source+date ; non prescriptif.

---

## EPIC 5 — Exploration : Carte, Fiche, Comparateur

**F5.1 — Carte interactive** [Must]
- US5.1.1 : En tant qu'utilisateur, je veux naviguer sur une carte par couches afin de visualiser le territoire.
  - CA : MapLibre + tuiles MVT ; couches prix/loyers/rendement/qualité de vie/transports ; granularité adaptative au zoom ; clic → fiche synthétique sans quitter la carte ; accessibilité (non-couleur-seule).

**F5.2 — Fiche zone** [Must]
- US5.2.1 : En tant qu'utilisateur, je veux une synthèse d'une zone afin de décider vite.
  - CA : scores + sous-scores + marché + points forts/faibles/opportunités/risques/projets ; « pourquoi recommandée » ; chaque chiffre sourcé/daté + « comment calculé ».

**F5.3 — Comparateur** [Must]
- US5.3.1 : En tant qu'utilisateur, je veux comparer 2–4 zones afin de trancher.
  - CA : tableau visuel ; meilleure valeur par ligne mise en avant ; badges auto (meilleur choix profil / rapport qualité-prix / potentiel / qualité de vie).

---

## EPIC 6 — Simulation

**F6.1 — Simulateur d'achat (RP)** [Must]
- US6.1.1 : En tant qu'utilisateur, je veux estimer ma mensualité et mon taux d'endettement afin de vérifier la faisabilité.
  - CA : mensualité selon prix/apport/taux/durée ; taux d'endettement vs 35 % ; frais de notaire estimés ; mention « indicatif ».

**F6.2 — Simulateur d'investissement** [Must]
- US6.2.1 : En tant qu'investisseur, je veux estimer rendement et cash-flow afin d'évaluer l'opération.
  - CA : rendement brut ; cash-flow simplifié (hors fiscalité) ; mention « estimation indicative, hors fiscalité ».

---

## EPIC 7 — Transparence & Traçabilité

**F7.1 — Sources & dates partout** [Must]
- US7.1.1 : En tant qu'utilisateur, je veux voir d'où vient chaque chiffre afin de faire confiance.
  - CA : source + période + dernière MAJ affichées (RG-D1) ; marqueurs « estimé »/« prospective ».

**F7.2 — « Comment est-ce calculé ? »** [Must]
- US7.2.1 : En tant qu'utilisateur, je veux comprendre la méthode d'un indicateur afin d'évaluer sa portée.
  - CA : panneau source/période/méthode/nb observations/limites, disponible sur chaque score.

---

## EPIC 8 — Alertes & Suivi

**F8.1 — Alertes** [Should]
- US8.1.1 : En tant qu'utilisateur, je veux suivre une zone/projet et être prévenu des évolutions importantes.
  - CA : règles de seuil/événement ; anti-bruit ; notification expliquée (facteurs de l'évolution — RG-A2) ; ex. « Nantes 78→83 car… ».

**F8.2 — Historique visualisé** [Should]
- US8.2.1 : En tant qu'utilisateur, je veux voir l'évolution (1/3/5 ans) afin de contextualiser.
  - CA : séries prix/loyers/scores ; horizons sélectionnables.

**F8.3 — Dashboard utilisateur** [Must]
- US8.3.1 : En tant qu'utilisateur, je veux un tableau de bord (favoris, recherches, alertes, évolution) afin de piloter mon projet.
  - CA : favoris, recherches sauvegardées, alertes, graphe d'évolution des scores suivis.

---

## EPIC 9 — Administration & Supervision Data

**F9.1 — Dashboard Data** [Must]
- US9.1.1 : En tant qu'admin data, je veux superviser les sources (statut, dernière collecte, dernière donnée, prochaine collecte, qualité) afin de garantir la fiabilité.
  - CA : tableau par source ; statuts ✓/⚠ ; DQ score ; fraîcheur.

**F9.2 — Actions d'exploitation** [Should]
- US9.2.1 : En tant qu'admin data, je veux relancer un traitement, consulter les erreurs, désactiver/remplacer une source, modifier une fréquence, recalculer les scores.
  - CA : relance manuelle ; logs d'erreurs ; toggle source ; édition fréquence ; recalcul déclenchable ; contrôle avant publication si besoin.

---

## EPIC 10 — Compte, Export & Partage

**F10.1 — Compte & RGPD** [Must]
- US10.1.1 : En tant qu'utilisateur, je veux créer un compte et gérer mes données (export, suppression) afin de maîtriser ma vie privée.
  - CA : auth OIDC/magic link ; consentements ; export projet ; suppression compte effective.

**F10.2 — Export PDF & partage** [Should/Could]
- US10.2.1 : En tant qu'utilisateur, je veux exporter/partager une analyse afin de la diffuser (conjoint, courtier).
  - CA : PDF d'une fiche/comparaison avec sources et dates ; lien de partage optionnel.

---

## EPIC 11 — Socle non fonctionnel

**F11.1 — Observabilité & monitoring** [Must]
- CA : métriques infra/jobs/DQ/produit ; alerting sur échec/rupture/DQ bas.

**F11.2 — Sécurité & conformité** [Must]
- CA : TLS, secrets en coffre, RBAC back-office, chiffrement au repos, licences attribuées, mentions légales non-conseil.

**F11.3 — Accessibilité & performance** [Must]
- CA : WCAG AA de base ; carte non-couleur-seule ; budgets de perf tenus (doc 13).
