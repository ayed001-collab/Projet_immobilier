# 05 — Méthodologie de scoring

Trois indicateurs sortent du moteur pour chaque zone et chaque projet :
**Home Score**, **Investment Score** (0–100, personnalisés) et **Data Confidence Score** (0–100, qualité des données sous-jacentes).

## 1. Chaîne de calcul (vue d'ensemble)

```
Indicateurs bruts (datés, sourcés)
   └─(1) Nettoyage & agrégation robuste par zone   → valeurs par zone
        └─(2) Normalisation comparable inter-zones  → sous-indicateurs ∈ [0,1]
             └─(3) Agrégation en sous-scores thématiques (éducation, transports…)
                  └─(4) Pondération par le profil utilisateur
                       └─(5) Home / Investment Score ∈ [0,100]
   (parallèle) Métadonnées qualité par indicateur → Data Confidence Score
```

## 2. Normalisation (comparable entre territoires) — étape clé

Objectif : rendre « 4 820 €/m² » ou « 82 % de réussite au brevet » comparables sur une même échelle 0–1, sans qu'une valeur extrême écrase tout.

- Méthode par défaut : **normalisation par rang percentile** (position de la zone dans la distribution nationale ou dans son groupe de comparaison), robuste aux valeurs aberrantes.
- Variante **min-max winsorisée** (bornage aux 5ᵉ/95ᵉ percentiles) pour les indicateurs à distribution contrôlée.
- **Sens** géré explicitement : certains indicateurs sont « plus = mieux » (réussite scolaire), d'autres « moins = mieux » (prix pour l'acheteur, délinquance) ⇒ inversion selon le contexte **et le parcours** (un prix bas est un atout côté acheteur RP, mais aussi côté rendement).
- **Groupe de comparaison** paramétrable : national par défaut, option « au sein de la même strate » (urbain/rural, taille d'aire) pour éviter de comparer un village à Paris.

## 3. Sous-scores thématiques

Chaque sous-score ∈ [0,100] agrège des sous-indicateurs normalisés (moyenne pondérée). Exemples de composition (indicative, à affiner avec la data réelle) :

| Sous-score | Sous-indicateurs (exemples) | Sources |
|------------|------------------------------|---------|
| **Éducation** | IPS moyen, résultats brevet/bac, densité d'établissements, part du privé/public | MEN / data.gouv |
| **Transports** | Desserte gares (temps vers pôle choisi), densité TC, accès autoroute | Base gares, GTFS, moteur d'itinéraires |
| **Sécurité** | Taux de délinquance normalisés (avec prudence, contextualisés) | SSMSI |
| **Santé** | Densité médecins/spécialistes, accès urgences, APL médecins | DREES / data.gouv |
| **Commerces** | Densité et diversité de commerces/services de proximité | INSEE BPE |
| **Sport / Culture** | Équipements sportifs, offre culturelle | Recensement équipements / DEPS |
| **Environnement** | Qualité de l'air, espaces verts, exposition aux risques (Géorisques), bruit | INERIS/Atmo, Géorisques |
| **Emploi / Économie** | Taux de chômage, dynamisme de l'emploi, revenu médian | INSEE |
| **Marché immo** | Prix €/m², tendance, liquidité (nb transactions) | DVF |
| **Locatif** | Loyer estimé, rendement, tension, part locataires, DPE | Loyers/DVF/DPE ADEME |

## 4. Home Score (résidence principale)

```
HomeScore(zone, profil) = 100 × Σ_k [ w_k(profil) × subscore_k(zone) / 100 ]
```
- `w_k` = pondérations **normalisées** issues des curseurs d'importance (Σ w = 1).
- Sous-scores mobilisés : éducation, transports, sécurité, santé, commerces, environnement, sport/culture, **adéquation budget** (le prix du bien-type vs budget), qualité de vie composite.
- **Pondérations par défaut** (modifiables par l'utilisateur, ex.) : Éducation 20, Transports 18, Adéquation budget 17, Sécurité 12, Environnement 10, Santé 8, Commerces 8, Sport/Culture 7.

## 5. Investment Score (investissement)

```
InvestmentScore(zone, profil) = 100 × Σ_k [ w_k(profil) × subscore_k(zone) / 100 ]
```
- Sous-scores mobilisés : **rendement estimé**, **tension locative**, **potentiel de valorisation** (tendance prix + dynamique démographique/emploi + projets — prospectif, faible confiance), **risque** (vacance, dépendance mono-employeur, DPE défavorable → risque locatif/réglementaire), liquidité du marché, qualité locative.
- **Ajustement risque** : l'Investment Score est **pénalisé** quand le rendement élevé s'accompagne d'un risque élevé (évite le piège « haut rendement = bon » signalé au doc 00).
- **Pondérations par défaut** (ex.) : Rendement 30, Tension locative 20, Potentiel valorisation 18, Risque (inversé) 17, Liquidité 8, Qualité locative 7.

## 6. Data Confidence Score

Mesure **à quel point on peut faire confiance** aux données qui fondent les scores d'une zone. Calculé par agrégation des métadonnées qualité de chaque indicateur contributif :

```
Confidence(zone) = Σ_i [ poids_i × q_i ]           avec Σ poids_i = 1
q_i = f( fraîcheur_i , complétude_i , volume_observations_i , fiabilité_source_i )
```
- **Fraîcheur** : pénalité croissante avec l'ancienneté vs la fréquence attendue de la source (ex. une donnée sécurité de 8 mois avec MAJ annuelle = ok ; un loyer de 3 ans = pénalisé).
- **Complétude** : part des sous-indicateurs réellement disponibles pour la zone.
- **Volume d'observations** : ex. nb de ventes DVF (une médiane sur 4 ventes est fragile).
- **Fiabilité de la source** : note statique par source (mesure directe > modèle > estimation éditoriale).

Le poids `poids_i` d'un indicateur dans la confiance suit son poids dans le score affiché : peu importe qu'une donnée annexe soit incertaine si elle pèse peu.

### Usage produit
- Affichage systématique (badge %, 4 niveaux : Élevée / Correcte / Limitée / Faible).
- **Modère la mise en avant** : à scores proches, une zone mieux documentée peut être privilégiée dans le tri « recommandé » (paramétrable) ; a minima, la confiance est visible pour arbitrer.
- Alimente l'admin/DQ (doc 09/15).

## 7. Explicabilité & décomposition (obligatoire)

Pour chaque score calculé, on **persiste** :
- la valeur finale, le millésime des données, la date de calcul ;
- la **contribution** de chaque sous-score (`w_k × subscore_k`) ;
- pour chaque sous-score, les sous-indicateurs et leurs valeurs normalisées.

Cela permet :
1. la réponse **« Pourquoi cette zone ? »** (top contributions positives vs critères de l'utilisateur) ;
2. l'explication d'une **évolution** (« Nantes 78→83 » = diff des contributions entre deux millésimes) ;
3. l'**audit** et la reproductibilité (RG-R3).

## 8. Paramétrage & gouvernance du scoring

- Les pondérations par défaut, seuils, méthodes de normalisation et notes de fiabilité des sources sont **versionnés** (config/scoring `vX.Y`) et **non codés en dur** dans l'algorithme.
- Tout changement de méthodologie crée une **nouvelle version de scoring** ; les scores historiques restent lisibles avec la version qui les a produits (évite les ruptures d'historique inexplicables).
- Tests de non-régression : jeux de zones témoins, bornes, monotonie (augmenter le poids d'un critère fort ↑ le score).
