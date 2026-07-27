# Backlog post-V0.1

> Suite de travaux après la [livraison V0.1](LIVRAISON-v0.1.md). Priorités :
> **P0** = débloque le reste / valeur maximale · **P1** = important · **P2** = souhaitable.
> Dépendances notées : `[réseau]` (accès data.gouv/IGN), `[hébergement]`, `[navigateur]`.
> Chaque item porte des critères d'acceptation résumés (DoD).

## Jalons proposés

| Jalon | Thème | Contenu (résumé) |
|-------|-------|------------------|
| **V1.0 — Données réelles** | Passer des fixtures au réel | E1, E2 |
| **V1.1 — Compte & profondeur** | Auth + indicateurs + carto réelle | E3, E4, E5 |
| **V1.2 — Suivi & IA** | Notifications + assistant + historique | E6, E7 |
| **V2 — Production & fiscalité** | Robustesse, RGPD, simulateur avancé | E8, E9 |
| **V3 — Écosystème** | B2B, ultramarins, proactif | E10 |

---

## E1 — Branchement des vraies sources `[réseau]` · P0
Passer la Data Factory des fixtures aux sources publiques réelles.
- [ ] **DVF** : connecteur geo-dvf réel (`DVF_SOURCE_URL_TEMPLATE`), backfill multi-millésimes.
- [ ] **Contours géographiques IGN** : communes + régions (Admin Express), IRIS.
- [ ] **INSEE** : population, revenus (Filosofi), emploi via API.
- [ ] **Loyers** : carte des loyers (maille commune/EPCI).
- [ ] **Éducation** : IPS + résultats (MEN).
- [ ] **Transports** : gares + GTFS + **isochrones OSRM** pré-calculés vers pôles.
- [ ] **Taux d'emprunt** : Banque de France / observatoires.
- **DoD** : pipeline vert sur ≥ 2 régions réelles ; DQ ≥ seuil ; chaque indicateur sourcé/daté.

## E2 — Déploiement & release `[hébergement]` · P0
- [ ] Provisionnement UE (Scaleway/OVH/Clever), IaC (Terraform).
- [ ] **PostGIS réel** (le schéma existe dans `infra/postgis/init.sql`) ; l'API bascule de GeoJSON → PostGIS.
- [ ] CI/CD de déploiement (staging + prod).
- [ ] **Release GitHub `v0.1.0`** sur le commit `f62d6a7` (tag bloqué dans l'environnement actuel).
- [ ] Domaine + URL de démo publique.
- **DoD** : une URL de démo stable ; déploiement reproductible.

## E3 — Authentification & multi-projets · P1 `[navigateur]`
- [ ] Comptes (OIDC / **magic link**), sessions, RGPD (consentements).
- [ ] Rattacher projets/favoris/alertes à l'utilisateur (aujourd'hui : identifiant de projet).
- [ ] **Dashboard multi-projets** (favoris, recherches, alertes, évolution).
- **DoD** : login e2e vert ; un utilisateur retrouve ses projets entre sessions.

## E4 — Indicateurs en profondeur `[réseau]` · P1
- [ ] **Sécurité** (SSMSI, normalisé, prudence éditoriale).
- [ ] **Environnement / risques** (Géorisques : inondation, argiles… + qualité de l'air).
- [ ] **DPE / passoires** (ADEME) — clé côté investissement.
- [ ] **Santé** (densité médicale / APL).
- **DoD** : sous-scores correspondants intégrés au scoring + fiche + back-office.

## E5 — Cartographie réelle · P1 `[navigateur]`
- [ ] **Tuiles vectorielles MVT** (tippecanoe) + fond de carte.
- [ ] Carte web réelle (MapLibre) sur contours IGN, granularité adaptative (région→IRIS).
- [ ] Démo : remplacer les **régions stylisées** par les contours officiels.
- **DoD** : carte nationale fluide, granularité selon le zoom.

## E6 — Alertes & notifications · P1
- [ ] Déclenchement réel (**e-mail / push**) au-delà du calcul à la demande.
- [ ] Préférences d'alerte par utilisateur ; anti-bruit.
- [ ] **Historique visualisé** (3/5/10 ans) + décomposition fine des évolutions.
- **DoD** : un changement de millésime notifie l'utilisateur abonné, expliqué.

## E7 — Assistant IA conversationnel · P1
- [ ] LLM en **tool-use** sur les données (`search_zones`, `get_zone`, `compare`, `explain_score`, `get_history`).
- [ ] Distinction Faits / Calculs / Interprétations / Prévisions + citations source+date.
- **DoD** : réponses ancrées (aucun chiffre inventé), non prescriptives.

## E8 — Robustesse production · P1/P2
- [ ] Orchestration **Dagster** réelle (assets, lineage) + **Great Expectations**.
- [ ] **Monitoring** (Prometheus/Grafana + Sentry) + alerting sur jobs/DQ.
- [ ] **RGPD opérationnel** : suppression de compte effective, registre des traitements, DPA.
- [ ] **Isochrones à la volée** (« X en N min » personnalisé).
- **DoD** : supervision live ; suppression compte conforme ; SLO définis.

## E9 — Simulateur & financement avancés · P2
- [ ] Fiscalité indicative (LMNP, déficit foncier, dispositifs) — avec prudence réglementaire.
- [ ] Charges/taxe foncière affinées ; scénarios ; comparaison de financements.
- **DoD** : cash-flow net après fiscalité, clairement étiqueté « estimation ».

## E10 — Écosystème · P2/P3
- [ ] **Partage d'analyse** (lien public) — l'export PDF est fait.
- [ ] Diversité géographique du top ; recommandations proactives.
- [ ] Offre **B2B** (courtiers/CGP/banques), export de marque, API.
- [ ] **Territoires ultramarins**.

---

## Ordre recommandé
1. **E1** (vraies sources) — débloque la valeur réelle.
2. **E2** (déploiement + release) — une vraie URL de revue.
3. **E5** (carto réelle) + **E4** (indicateurs) — profondeur produit.
4. **E3** (auth) puis **E6/E7** (suivi + IA).
5. **E8/E9/E10** — robustesse, fiscalité, écosystème.

> Ce backlog peut être reflété en **issues + milestones GitHub** (un item = une issue,
> un jalon = un milestone) sur demande.
