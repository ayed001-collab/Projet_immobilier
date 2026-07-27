# 02 — UX : principes, Customer Journey & User Flows

## 1. Principes UX directeurs

L'UX **est** le produit : la donnée doit devenir décision. Sept principes :

1. **Progressive disclosure** — d'abord l'essentiel (top 5 + carte), puis l'approfondissement à la demande. Jamais un mur de chiffres.
2. **Carte au centre** — la carte est le mode de navigation principal, pas une illustration.
3. **Mobile-first & responsive** — pensé pour un usage smartphone (exploration le soir, en déplacement).
4. **Visuel avant textuel** — jauges, heatmaps, badges, sparklines plutôt que tableaux denses.
5. **Personnalisation visible** — l'utilisateur voit que le classement reflète *ses* pondérations et peut les régler.
6. **Explicabilité** — chaque score, chaque recommandation répond à « pourquoi ? » et « comment c'est calculé ? ».
7. **UX de confiance** — source + date + niveau de fiabilité systématiques ; ton non prescriptif (« forte adéquation », jamais « achetez ici ») ; l'utilisateur reste décisionnaire.

## 2. Customer Journey — Résidence principale (persona P1)

| Phase | Objectif utilisateur | État émotionnel | Ce que fait la plateforme | Points de friction à éviter |
|-------|----------------------|-----------------|---------------------------|-----------------------------|
| **Découverte** | Comprendre en 5 s à quoi ça sert | Curieux / sceptique | Home clair : 2 portes (RP / Invest), promesse simple | Trop de texte, jargon |
| **Onboarding** | Décrire son projet sans effort | Impatient | Questionnaire progressif, court, avec valeurs par défaut intelligentes | Formulaire long, questions floues |
| **Première valeur** | Voir des villes qui *lui* correspondent | Espoir | Top 5 + carte + budget compatible affiché | Résultats génériques, vides, ou hors budget |
| **Approfondissement** | Comprendre *pourquoi* / creuser | Analytique | Fiche ville, sous-scores, points forts/faibles, transparence | Chiffres sans contexte ni source |
| **Comparaison** | Trancher entre 2–3 zones | Décisif | Comparateur, « meilleur choix pour votre profil » | Comparaison illisible |
| **Simulation** | Vérifier la faisabilité financière | Prudent | Simulateur mensualité / capacité / frais | Simulateur faux ou opaque |
| **Engagement** | Garder & suivre | Rassuré | Sauvegarde du **projet**, favoris, alertes | Obligation de compte trop tôt |
| **Suivi** | Être prévenu des évolutions | Fidèle | Alertes expliquées (« Nantes 78→83 car… ») | Alertes bruyantes / non expliquées |

## 3. Customer Journey — Investissement (persona P2)

Même ossature, mais l'axe bascule de « qualité de vie » vers **rendement fiabilisé + tension locative + DPE + potentiel de valorisation + risque**. Le simulateur devient **cash-flow / rendement net** (indicatif). L'étape « comparaison » met en avant *meilleur rapport rendement/risque* plutôt que *qualité de vie*.

## 4. User Flows (principaux)

### Flow A — Onboarding → Résultats (parcours nominal)
```
Home
 └─ [Je cherche ma résidence principale] / [Je souhaite investir]
     └─ Onboarding progressif
         ├─ Budget & financement (apport, capacité, → budget d'achat calculé)
         ├─ Bien (type, surface min, pièces)
         ├─ Profil (foyer, enfants) [RP]  /  Stratégie & risque [Invest]
         ├─ Critères pondérés (écoles, transports, sécurité… curseurs d'importance)
         └─ Zone de préférence (optionnelle : région, « autour de X », « X accessible en N min »)
     └─ Calcul (scoring personnalisé + confiance)
     └─ Écran Résultats : Carte + Top recommandations + filtres
         ├─ [Ouvrir une fiche ville]  → Flow B
         ├─ [Ajouter au comparateur]  → Flow C
         ├─ [Ajuster mes pondérations] → recalcul dynamique
         └─ [Sauvegarder mon projet]  → (création de compte si non connecté) → Flow E
```

### Flow B — Exploration carte / fiche
```
Carte (couche active : prix / loyers / rendement / qualité de vie / …)
 └─ Clic sur une zone → fiche synthétique (overlay, sans quitter la carte)
     ├─ Scores (Home / Investment) + Data Confidence + sous-scores
     ├─ [Pourquoi cette zone m'est recommandée ?]
     ├─ [Comment cet indicateur est-il calculé ?] (source, période, méthode, nb obs.)
     ├─ [Voir la fiche complète] → écran Analyse ville
     ├─ [Comparer] / [Favori] / [Créer une alerte]
```

### Flow C — Comparateur
```
Sélection de 2 à 4 zones (depuis carte, résultats ou favoris)
 └─ Vue comparative (prix, bien-type, loyers, rendement, sous-scores, potentiel, score perso)
     └─ Badges auto : « Meilleur choix pour votre profil », « Meilleur rapport qualité/prix »,
                      « Meilleur potentiel », « Meilleure qualité de vie »
```

### Flow D — Recherche inversée « Où puis-je acheter ? »
```
Saisie contraintes (budget, surface, chambres, profil, accessibilité, écoles…)
 └─ Moteur : filtre zones compatibles + scoring
     └─ Résultats : Carte + classement + prix + score + avantages + compromis
```

### Flow E — Projet persistant & alertes
```
Compte / connexion
 └─ Mon projet (budget, critères, top zones figées + suivies)
     ├─ Dashboard : favoris, recherches, alertes, évolution des scores
     ├─ Réception d'alerte (prix, rendement, score, nouvelle donnée, projet urbain)
     └─ Détail alerte → explication des facteurs → recalcul / re-comparaison
```

### Flow F — Assistant IA (transversal)
```
Barre « Demandez à l'assistant » (présente sur résultats / fiche / comparateur)
 └─ Question en langage naturel
     └─ Réponse ancrée sur les données de la plateforme
         ├─ distingue Faits / Calculs / Interprétations / Prévisions
         ├─ cite sources & dates
         └─ propose des actions (ouvrir fiche, comparer, ajuster pondérations)
```

## 5. Règles UX de confiance (transverses, non négociables)

- Tout indicateur affiché porte : **valeur + unité + date + source (icône) + niveau de confiance** (au moins accessible en 1 clic/tap).
- Le bouton **« Comment est-ce calculé ? »** est disponible partout où figure un score.
- Les niveaux de confiance sont **visuellement distincts** (ex. plein / hachuré / atténué) — jamais masqués.
- Vocabulaire non prescriptif imposé (voir charte éditoriale, doc 04 §Règles).
- Les prévisions/« potentiel » portent un **marqueur visuel « prospective »** distinct des faits.

## 6. Accessibilité

- Contrastes WCAG AA ; ne jamais coder une information **uniquement** par la couleur (heatmaps + motifs/valeurs) — critique pour le daltonisme sur les cartes.
- Navigation clavier, focus visibles, cibles tactiles ≥ 44 px.
- Textes alternatifs pour cartes/graphes ; version « données en tableau » accessible en repli.
