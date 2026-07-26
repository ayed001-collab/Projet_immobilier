# 11 — Architecture fonctionnelle

## 1. Domaines fonctionnels

```
┌──────────────────────────────────────────────────────────────┐
│                     EXPÉRIENCE (Front)                         │
│  Onboarding · Carte · Résultats · Fiche · Comparateur ·        │
│  Simulateur · Dashboard · Assistant                            │
└───────────────┬──────────────────────────────────────────────┘
                │  API produit (REST/GraphQL)
┌───────────────┴──────────────────────────────────────────────┐
│                     SERVICES MÉTIER (Back)                     │
│  Identité & Compte │ Projet & Profil │ Recherche/Recommandation│
│  Scoring           │ Simulation      │ Comparateur            │
│  Alertes & Événem. │ Assistant IA    │ Traçabilité/Explication │
│  Géo & Zones       │ Admin/Supervision Data                   │
└───────────────┬──────────────────────────────────────────────┘
                │  lecture (Gold)            │ pilotage
┌───────────────┴───────────┐   ┌───────────┴──────────────────┐
│      DATA LAYER            │   │       DATA FACTORY            │
│ Base géo · immo · socio ·  │◀──│ Collecte→QC→Transfo→Norm.→    │
│ historique · scores        │   │ Historisation→Indic/Scores→   │
│ (Bronze/Silver/Gold)       │   │ QC→Publication (orchestrée)   │
└────────────────────────────┘   └──────────────────────────────┘
                ▲                              │
                └──────── MONITORING ──────────┘
        (APIs, données, jobs, qualité, alerting)
```

## 2. Services métier (responsabilités & interactions)

| Service | Responsabilité | Dépend de |
|---------|----------------|-----------|
| **Identité & Compte** | Auth, sessions, consentements RGPD | — |
| **Projet & Profil** | CRUD projet persistant, pondérations, budget calculé | Financement, Géo |
| **Géo & Zones** | Référentiel géographique, hiérarchie, géométries, contours | Data Layer |
| **Scoring** | Calcul Home/Investment/Confidence + décomposition | Data Layer (indicateurs), config scoring |
| **Recherche / Recommandation** | Hard filters + ranking + explications ; recherche inversée | Scoring, Géo, Projet |
| **Simulation** | Mensualité / capacité / rendement / cash-flow (indicatif) | Financement (taux), Data (prix/loyers) |
| **Comparateur** | Mise en regard de 2–4 zones + badges auto | Scoring, Data |
| **Financement** | Capacité d'emprunt, frais, taux courants | Data (taux) |
| **Alertes & Événements** | Règles de suivi, détection d'événements, notifications | Data Factory (événements), Historique |
| **Traçabilité / Explication** | « Comment c'est calculé », lineage, sources/dates | Data Layer (métadonnées) |
| **Assistant IA** | NL → outils internes → réponse ancrée + étiquetée | Recommandation, Scoring, Data (RAG/outils) |
| **Admin / Supervision Data** | Back-office sources, runs, DQ, relance, recalcul | Data Factory, Monitoring |

## 3. Data Factory (rappel fonctionnel — détail doc 08)

Collecte · Contrôle · Transformation · Normalisation · Historisation · Calcul des indicateurs & scores · Contrôle · Publication — orchestrée, un pipeline par source, fréquence propre.

## 4. Scoring Engine & Recommendation Engine

- **Scoring Engine** : produit Home / Investment / Data Confidence + `SCORE_BREAKDOWN`. Configurable, versionné, déterministe.
- **Recommendation Engine** : personnalise (filtres + ranking + diversité + explications). Consomme le Scoring Engine.

## 5. AI Layer

Assistant conversationnel + génération d'explications. **Ancré sur les données** via outils internes (pas de chiffres inventés). Sépare Faits / Calculs / Interprétations / Prévisions. Voir doc 06 §3.

## 6. Monitoring

Supervise : **APIs sources** (disponibilité), **jobs** (succès/échec/durée), **données** (volumétrie, fraîcheur), **qualité** (DQ score), **produit** (latence API, erreurs). Alerting vers l'équipe + tableau de bord admin.

## 7. Principes d'architecture fonctionnelle

- **Séparation lecture / écriture** : le produit lit la couche **Gold** (rapide) ; la Data Factory écrit (batch). Découplage fort.
- **Explicabilité by design** : tout score porte sa décomposition ; toute valeur porte ses métadonnées.
- **Transparence by design** : aucune valeur affichée sans source + date + confiance.
- **Non-prescriptif by design** : la couche présentation applique la charte éditoriale (RG-E).
- **Extensibilité** : ajouter une source = ajouter un connecteur + une fiche, sans toucher au produit ; ajouter un critère = config scoring.
