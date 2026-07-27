# 16 — Roadmap : MVP → V1 → V2 → V3

> Roadmap **par incréments de valeur**, pas par dates fermes (l'équipe calibrera). Chaque palier reste livrable et démontrable. Ordre pensé pour dé-risquer la **data** en premier.

## Phase 0 — Fondations (avant valeur visible)
- Référentiel géographique (COG, contours, BAN) chargé.
- Squelette Data Factory (orchestrateur + Bronze/Silver/Gold) sur **1 source** (DVF) de bout en bout.
- Base PostGIS + API lecture + carte affichant les prix DVF sur 1 région.
- CI/CD, environnements, monitoring de base.
> Objectif : prouver la chaîne **source → carte** end-to-end sur un cas réel.

## MVP — Boucle de valeur complète (parcours RP en tête)
Livrables (MoSCoW « Must », doc 14) :
- Onboarding + module financement + projet persistant.
- Data Factory sur **5 sources** (DVF, INSEE, Loyers, Éducation, Transports) avec DQ + historisation.
- Scoring : Home / Investment / Data Confidence + décomposition.
- Carte multi-couches, fiche zone, comparateur, classement personnalisé, recalcul dynamique.
- Recherche inversée (filtres + budget + isochrones vers pôles majeurs).
- Simulateur simple (RP + invest basique).
- Transparence partout + « comment est-ce calculé ».
- Back-office minimal (statut sources, DQ, relance).
- Couverture data : **2–3 régions** puis scale-up national.
> Critère de sortie : un utilisateur type obtient un top 5 fiable, expliqué, dans son budget, sur données réelles.

## V1 — Profondeur data + suivi + IA
- **Alertes** + explication des évolutions (« Nantes 78→83 car… »).
- **Historique** visualisé (1/3/5 ans) ; dashboard projet enrichi.
- Sources supplémentaires en profondeur : **Sécurité**, **Environnement/Risques (Géorisques)**, **DPE (passoires)**, Santé.
- Granularité **IRIS / quartiers** là où la data le permet.
- **Assistant IA conversationnel** (LLM + outils internes, réponses ancrées & étiquetées).
- Export PDF.
- Passage **France métropolitaine complète**.

## V2 — Personnalisation avancée & rétention
- Isochrones personnalisés « X accessible en N min » à la volée.
- Analyses historiques 10 ans, décomposition fine des évolutions, scénarios.
- Diversité géographique du top, recommandations proactives (« nouvelle zone entrée dans votre budget »).
- Partage d'analyses, comparaisons multi-projets.
- Simulateur enrichi (charges, taxe foncière, travaux).
- Optimisations perf/carto à l'échelle nationale.

## V3 — Écosystème & monétisation
- Offre **B2B** (courtiers, CGP, banques) : espace pro, exports de marque, API.
- Modules fiscalité (LMNP, déficit foncier, dispositifs) — avec prudence réglementaire.
- Territoires ultramarins (si data disponible).
- Éventuelle intégration d'**annonces** partenaires (mise en relation) — décision produit/juridique.
- IA proactive : synthèses de projet, veille territoriale personnalisée.

## Fil rouge (toutes phases)
- **Qualité & confiance data** : jamais négociée ; le Data Confidence Score grandit avec la couverture.
- **Explicabilité & non-prescription** : maintenues à chaque ajout de feature.
- **RGPD & licences** : revalidées à chaque nouvelle source.

## Jalons de dé-risquage (à surveiller)
1. Fin Phase 0 : chaîne data end-to-end prouvée.
2. Mi-MVP : qualité du scoring validée sur 2–3 régions (revue métier).
3. Fin MVP : boucle de valeur complète démontrée à des utilisateurs tests (P1/P2).
4. V1 : fiabilité IA (pas d'hallucination de chiffres) validée avant exposition large.
