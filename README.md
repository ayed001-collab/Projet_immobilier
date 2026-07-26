# Copilote de décision immobilière — France

> Plateforme intelligente de recherche et d'aide à la décision immobilière : transformer des données publiques actualisées et fiables en recommandations **personnalisées, explicables et actionnables**, pour répondre à une question simple :
>
> **« Où devrais-je acheter un bien immobilier en France, selon mon budget, mon profil et mon objectif ? »**

Deux parcours : 🏠 **Résidence principale** · 📈 **Investissement locatif**.

Ce dépôt contient d'abord la **conception produit, data et technique** (ce document et le dossier [`docs/`](docs/)). Le code applicatif viendra ensuite, en suivant la roadmap et le plan de développement définis ici.

---

## Positionnement

Il ne s'agit **pas** d'un énième portail de statistiques immobilières, mais d'un **copilote de décision** :

- il part du **projet de l'utilisateur** (budget, profil, objectif, critères pondérés) ;
- il croise ce projet avec des **données territoriales fiables et datées** ;
- il produit un **classement personnalisé** de villes / quartiers, **expliqué** ;
- il rend **la donnée transparente** : source, date, méthode, niveau de confiance ;
- il fait **vivre le projet dans le temps** (historisation + alertes) : les zones intéressantes évoluent au fil des prix, taux et données territoriales.

## Index de la documentation

| # | Document | Contenu |
|---|----------|---------|
| 00 | [Challenge du concept](docs/00-challenge-concept.md) | Incohérences, risques, données difficiles, angles morts, décisions à trancher |
| 01 | [Vision produit & personas](docs/01-vision-produit.md) | Vision, proposition de valeur, différenciation, personas, parties prenantes |
| 02 | [UX — Customer Journey & User Flows](docs/02-ux-parcours.md) | Journeys, flows, principes UX, progressive disclosure, UX de confiance |
| 03 | [UX — Wireframes](docs/03-ux-wireframes.md) | Wireframes textuels des 7 écrans principaux |
| 04 | [Modèle métier — Concepts & règles](docs/04-modele-metier.md) | Concepts, glossaire, règles de gestion |
| 05 | [Scoring](docs/05-scoring.md) | Home Score, Investment Score, Data Confidence Score, méthodologie |
| 06 | [Moteur de recommandation & recherche inversée](docs/06-recommandation.md) | Ranking, « Où puis-je acheter ? », assistant IA |
| 07 | [Data Strategy — Sources](docs/07-data-sources.md) | Catalogue des sources publiques FR, matrice Sources × Données |
| 08 | [Data Factory — Pipeline & mise à jour](docs/08-data-factory.md) | Architecture ETL/ELT, fréquences, orchestration |
| 09 | [Data Quality, traçabilité & historisation](docs/09-data-quality.md) | DQ score, contrôles, lineage, historisation |
| 10 | [Modèle de données](docs/10-modele-donnees.md) | MCD, data mapping, référentiel géographique |
| 11 | [Architecture fonctionnelle](docs/11-architecture-fonctionnelle.md) | Domaines, services, interactions |
| 12 | [Architecture technique](docs/12-architecture-technique.md) | Stack, cartographie, IA, sécurité, monitoring |
| 13 | [Exigences non fonctionnelles & RGPD](docs/13-nfr-rgpd.md) | Performance, sécurité, conformité |
| 14 | [MVP (MoSCoW)](docs/14-mvp-moscow.md) | Périmètre MVP, priorisation |
| 15 | [Backlog — Epics / Features / User Stories](docs/15-backlog.md) | Backlog avec critères d'acceptation |
| 16 | [Roadmap](docs/16-roadmap.md) | MVP → V1 → V2 → V3 |
| 17 | [Plan de développement & stack](docs/17-plan-developpement.md) | Séquencement concret, stack recommandée |

## Avertissement

Les recommandations produites par cette plateforme sont des **aides à la décision**, jamais des conseils en investissement au sens réglementaire. L'utilisateur reste **seul décisionnaire**. Aucune donnée n'est présentée sans source ni date, et aucune prévision n'est présentée comme une certitude.
