# 09 — Data Quality, traçabilité & historisation

## 1. Stratégie de Data Quality

Système de **contrôle automatique** exécuté à l'entrée (QC entrée) et à la sortie (QC sortie, **bloquant** avant publication).

### Dimensions & contrôles

| Dimension | Contrôles automatiques | Exemple de détection |
|-----------|------------------------|----------------------|
| **Complétude** | Taux de valeurs manquantes par zone/indicateur | Loyer absent sur X communes |
| **Validité** | Types, bornes, formats, codes géo existants | Prix/m² négatif ou > seuil absurde |
| **Cohérence** | Règles inter-champs | Loyer > prix ; rendement > 25 % |
| **Unicité** | Détection de doublons | Même transaction DVF en double |
| **Exactitude (plausibilité)** | Valeurs aberrantes (IQR, z-score, écarts inter-millésimes) | Prix commune ×2 en un semestre |
| **Fraîcheur** | Ancienneté vs fréquence attendue | Sécurité datant de 8 mois |
| **Stabilité** | Variation anormale entre deux runs | Chute brutale du volume DVF (rupture API) |
| **Intégrité géo** | Rattachement au référentiel | Code commune disparu (fusion) |
| **Disponibilité source** | Endpoint / fichier accessible | API en échec |

### Actions selon la gravité
- **Bloquant** (structure cassée, incohérence majeure, chute de volume) → **pas de publication**, conservation de la version précédente, alerte admin.
- **Avertissement** (valeurs anciennes, complétude dégradée) → publication autorisée mais **DQ score abaissé** + marquage UI.
- **Info** → journalisé.

## 2. Data Quality Score

Score 0–100 **par jeu de données / par indicateur / par zone**, agrégeable, dérivé des dimensions ci-dessus :

```
DQ = 100 × Σ_d ( poids_d × score_dimension_d )
```
Exemples de restitution (comme dans le prompt) :
```
Prix immobilier : 96 % — Haute fiabilité
Loyers          : 82 % — Fiabilité correcte
Sécurité        : données datant de 8 mois
```
Le DQ score **alimente le Data Confidence Score** des zones (doc 05 §6) et le **back-office** (doc 15).

> Principe non négociable : **la plateforme ne masque jamais l'incertitude**. Une donnée dégradée est montrée comme telle, pas cachée.

## 3. Traçabilité & transparence (côté utilisateur)

Chaque indicateur affiché est **traçable** jusqu'à sa source. Exemple d'affichage :

```
Prix moyen : 4 820 €/m²
Source : DVF · Période : transactions des 12 derniers mois
Dernière mise à jour : 20/07/2026
```

Bouton **« Comment cet indicateur est-il calculé ? »** → panneau expliquant :
- **source** (+ lien) ;
- **période** couverte ;
- **méthode** (ex. médiane des ventes filtrées, normalisation par rang) ;
- **nombre d'observations** (ex. 342 ventes) ;
- **limites** connues (ex. « faible volume, marge d'erreur élevée »).

### Data Lineage
Traçabilité **technique** de bout en bout : chaque valeur de service (Gold) référence le run, le millésime source (Bronze), et les transformations appliquées.

```
Valeur affichée (Gold)
  └─ indicateur calculé (run #R, scoring vX.Y)
      └─ table Silver (millésime source M, transfo T)
          └─ fichier Bronze (collecte du JJ/MM, source S, hash H)
              └─ Source (fiche, licence)
```
Le lineage permet, pour n'importe quel chiffre affiché, de répondre « d'où vient-il et comment a-t-il été produit ». Il sert aussi à l'audit et au débogage DQ.

## 4. Historisation

**Règle (RG-D4)** : une mise à jour **n'écrase jamais** l'ancienne valeur. Modèle **append-only** avec millésime/version.

### Ce qui est historisé
Prix, loyers, rendement, population, revenus, tension locative, **scores** (Home/Investment/Confidence), projets urbains, indicateurs économiques, **et la décomposition des scores** (RG-S2).

### Modèle (principe — détaillé doc 10)
```
indicator_value(zone_id, indicator_id, source_id, millesime,
                value, unit, obs_count, dq_score,
                collected_at, source_published_at, valid_from, valid_to)
```
- Versionnement **temporel** (`valid_from`/`valid_to`) : on peut reconstituer l'état des données à n'importe quelle date passée.
- Les **scores** sont historisés avec la **version de scoring** utilisée.

### Usages
1. **Analyses temporelles** : 1 an / 3 ans / 5 ans / 10 ans (tendances prix, loyers, scores…).
2. **Explication des évolutions** : « Nantes 78→83 » = **différence des contributions** entre deux millésimes (quel sous-score a bougé, pourquoi).
3. **Projet persistant** : montrer à l'utilisateur comment son top évolue dans le temps.
4. **Alertes** : détecter les franchissements de seuils sur séries historisées.
5. **Audit / reproductibilité**.

## 5. Alertes fondées sur la data (lien produit)

À partir des séries historisées et des runs, génération d'**événements** déclenchant les alertes (doc 04 RG-A) :
- variation significative de prix / loyers / rendement ;
- **entrée d'une zone dans le budget** de l'utilisateur ;
- évolution du **score personnalisé** (avec explication des facteurs — RG-A2) ;
- **nouvelle donnée** publiée / nouveau projet urbain ;
- dégradation/rétablissement de la qualité d'une source.

## 6. Gouvernance DQ

- Seuils DQ, règles de plausibilité et poids **versionnés** (config).
- Tableau de bord DQ dans le back-office (statut par source, dernier run, DQ, prochaine collecte).
- **Runbook** de rupture de source (quarantaine, communication UI « données en cours d'actualisation », relance).
