# 13 — Exigences non fonctionnelles, RGPD & sécurité

## 1. Exigences non fonctionnelles (NFR)

| Catégorie | Exigence cible |
|-----------|----------------|
| **Performance** | Chargement carte + top 5 < 2,5 s (P75) ; réponse fiche zone < 800 ms ; recalcul de pondérations perçu « instantané » (< 500 ms sur zones déjà chargées) |
| **Scalabilité** | ~35 000 communes scorables ; carto nationale fluide via tuiles MVT ; batch Data Factory scalable par source/maille |
| **Disponibilité** | 99,5 % sur l'API produit (le batch data peut être indisponible sans impacter la lecture) |
| **Fraîcheur** | Chaque indicateur respecte la fréquence de sa source ; jamais de fraîcheur artificielle (RG-D5) |
| **Explicabilité** | 100 % des scores décomposables et traçables jusqu'à la source |
| **Transparence** | 100 % des valeurs affichées avec source + date + niveau de confiance |
| **Reproductibilité** | Recommandations reproductibles à projet + millésime + version de scoring constants |
| **Accessibilité** | WCAG 2.1 AA (contrastes, clavier, non-couleur-seule sur cartes) |
| **Compatibilité** | Mobile-first ; navigateurs modernes ; responsive |
| **SEO** | Fiches villes indexables (SSR) — canal d'acquisition |
| **Observabilité** | Métriques infra/jobs/DQ/produit + alerting |
| **Maintenabilité** | Config scoring/DQ versionnée ; ajout de source = connecteur + fiche, sans toucher au produit |
| **Coût** | Calculs lourds pré-calculés (isochrones, tuiles) ; IA à quotas ; hébergement maîtrisé |
| **Internationalisation** | FR au MVP ; architecture i18n-ready |

## 2. RGPD & conformité

### Données traitées
- **Données publiques ouvertes** (DVF, INSEE…) : pas de données personnelles → pas d'enjeu RGPD côté data produit (mais respect des **licences**).
- **Données utilisateurs** : email, projet immobilier (budget, revenus, composition du foyer, présence d'enfants, préférences). Certaines (revenus, foyer) sont **sensibles au sens de la vie privée** même si non « sensibles » au sens strict de l'art. 9 RGPD.

### Principes appliqués
- **Minimisation** : ne collecter que ce qui sert au scoring. Éviter toute donnée de l'art. 9 (santé, origine, opinions…) — les critères « santé/écoles » portent sur le **territoire**, pas sur l'utilisateur.
- **Base légale** : consentement (compte, alertes) / intérêt légitime (amélioration produit anonymisée). Consentements tracés (`consent_flags`).
- **Finalité** : usage limité à l'aide à la décision ; pas de revente de données personnelles.
- **Droits** : accès, rectification, **effacement** (suppression compte + projets), portabilité (export projet), opposition.
- **Rétention** : durée limitée, purge des comptes inactifs ; anonymisation pour l'analytique.
- **Sous-traitants** : hébergeur UE, éventuel fournisseur LLM → **DPA** + envoi minimal (ne pas transmettre de données personnelles inutiles au LLM ; l'assistant travaille sur des zones, pas sur l'identité).
- **Registre des traitements** + analyse d'impact (AIPD) si nécessaire.
- **Cookies/traceurs** : bandeau conforme CNIL, mesure d'audience respectueuse.

### Posture réglementaire (non-conseil)
- La plateforme fournit une **aide à la décision**, **pas** un conseil en investissement financier réglementé ni de l'intermédiation. Mentions légales explicites (voir RG-E, doc 04).
- Ton **non prescriptif** imposé ; les prévisions ne sont jamais des garanties.
- Prudence éditoriale sur la **sécurité** (pas de stigmatisation territoriale).

## 3. Sécurité applicative

| Domaine | Mesures |
|---------|---------|
| Transport | TLS 1.2+ partout, HSTS |
| Auth | OIDC/OAuth2, JWT courts + refresh, MFA optionnel, magic link |
| Autorisation | RBAC (utilisateur / admin data) ; accès back-office restreint |
| Secrets | Coffre (Vault/SOPS), rotation, jamais en clair dans le repo |
| Données au repos | Chiffrement DB + object storage |
| API | Rate limiting, validation d'entrée, pagination, CORS strict |
| IA | Quotas & budget, garde-fous prompt-injection (les outils bornent les réponses aux données internes), pas d'exécution d'instructions issues de contenus externes |
| Séparation | Données publiques vs données utilisateurs cloisonnées |
| Supply chain | Dépendances scannées (SCA), images à jour |
| Journalisation | Logs d'accès admin, audit des recalculs/publications |
| Sauvegardes | Backups DB chiffrés, testés (restore), + Bronze rejouable |

## 4. Conformité licences data

- Respect des licences (Licence Ouverte/Etalab 2.0 majoritairement) : **attribution** visible (« Source : … »), pas d'usage interdit.
- Fiche licence par source (doc 07) ; validation juridique avant toute source privée ou scraping.
