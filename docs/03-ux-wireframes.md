# 03 — UX : Wireframes (basse fidélité, textuels)

> Wireframes des 7 écrans du MVP. Notation : `[Bouton]`, `{composant}`, `▸` interaction. Priorité mobile-first ; les schémas montrent la version desktop, la version mobile empile les colonnes et rend la carte plein écran avec panneau coulissant.

## Écran 1 — Home

```
┌───────────────────────────────────────────────┐
│  logo            Copilote immobilier    [Connexion] │
├───────────────────────────────────────────────┤
│                                                 │
│   Trouvez la meilleure ville pour votre         │
│   projet immobilier.                            │
│   Des données fiables, un classement expliqué.  │
│                                                 │
│   ┌────────────────┐   ┌────────────────┐       │
│   │  🏠            │   │  📈            │       │
│   │  Ma résidence  │   │  Investir      │       │
│   │  principale    │   │                │       │
│   │  [Commencer]   │   │  [Commencer]   │       │
│   └────────────────┘   └────────────────┘       │
│                                                 │
│   {mini-carte de France animée en fond}         │
│   « Sourcé DVF · INSEE · … — mis à jour le … »  │
└───────────────────────────────────────────────┘
```
Objectif : 2 portes très visibles, promesse en une phrase, preuve de sérieux (sources) en pied.

## Écran 2 — Mon projet (onboarding progressif)

```
┌───────────────────────────────────────────────┐
│  ● ● ○ ○ ○   Étape 2/5 — Votre budget          │
├───────────────────────────────────────────────┤
│  Apport :            [  60 000 € ]              │
│  Revenus nets/mois : [  5 200 €  ]              │
│  Durée d'emprunt :   [ 25 ans ▼ ]              │
│                                                 │
│  → Budget d'achat estimé : ~ 372 000 €          │
│    {jauge} (apport + capacité d'emprunt − frais)│
│    ⓘ Hypothèse taux 3,5 % · endettement 35 %    │
│                                                 │
│  [◀ Retour]                        [Continuer ▶]│
└───────────────────────────────────────────────┘
```
- Étapes : (1) Type de projet rappelé (2) Budget & financement (3) Bien (4) Profil/Stratégie (5) Critères pondérés + zone.
- Chaque critère prioritaire = **curseur d'importance** (Pas important → Essentiel).
- Valeurs par défaut intelligentes ; possibilité de « passer » une étape.

## Écran 3 — Résultats (carte + top)

```
┌───────────────────────────────────────────────────────────┐
│ Mon projet: RP · 372k€ · T4 · écoles+++  [Ajuster] [Sauver]│
├──────────────┬────────────────────────────────────────────┤
│ TOP 5        │                                            │
│              │                                            │
│ 1 Angers 91  │            {CARTE INTERACTIVE}             │
│   {jauge}    │      couche: [Prix ▼] [Qualité vie]        │
│   ✓ dans     │      [Rendement] [Transports] …            │
│     budget   │                                            │
│ 2 Tours  87  │      ● zones compatibles (heatmap)         │
│ 3 Le Mans 84 │      ▸ clic zone → fiche synthétique       │
│ 4 …          │                                            │
│ 5 …          │                                            │
│              │  Filtres: [prix] [surface] [confiance min] │
│ [Comparer]   │                                            │
├──────────────┴────────────────────────────────────────────┤
│  💬 Demandez à l'assistant : « Pourquoi Angers avant Tours ? »│
└───────────────────────────────────────────────────────────┘
```
- Chaque ligne du top : nom, score /100, jauge, badge budget, mini-confiance.
- La carte et la liste sont synchronisées (hover/clic).

## Écran 4 — Analyse d'une ville

```
┌───────────────────────────────────────────────────────────┐
│  ◀ Retour       BORDEAUX (Gironde)      [Favori] [Alerte]  │
├───────────────────────────────────────────────────────────┤
│  Home Score 84/100   Investment 76/100   Confiance ●●●○ 78%│
│  {jauge}             {jauge}                                │
│                                                            │
│  Prix moyen 4 820 €/m²  ⓘ    Loyer ~14,2 €/m² ⓘ (estimé)   │
│  Rendement brut ~4,1 % (estimé)   Tendance 5 ans +18 % ⓘ   │
│  {sparkline prix 10 ans}                                   │
├───────────────────────────────────────────────────────────┤
│  Sous-scores {barres horizontales}                         │
│  Éducation ▓▓▓▓▓░ 82   Transports ▓▓▓▓░ 74  Sécurité ▓▓▓ 61│
│  Santé …  Commerces …  Environnement …  Emploi …           │
├───────────────────────────────────────────────────────────┤
│  ✓ Points forts   ✗ Points faibles                         │
│  ◆ Opportunités   ⚠ Risques   🏗 Projets futurs (prospectif)│
│                                                            │
│  ▸ « Pourquoi cette zone vous est recommandée » (texte     │
│     personnalisé selon vos critères)                       │
│  ▸ [Comment ces scores sont-ils calculés ?]                │
└───────────────────────────────────────────────────────────┘
```
- Chaque `ⓘ` ouvre le panneau **source / période / méthode / nb observations / limites**.
- Le badge « estimé » distingue mesure et modèle.

## Écran 5 — Comparateur

```
┌────────────────────────────────────────────────────────────┐
│  Comparer      Paris 15e │ Boulogne-B. │ Issy-les-Moul.     │
├──────────────────┬──────────┬───────────┬──────────────────┤
│ Prix €/m²        │ 10 900   │ 8 600     │ 9 100            │
│ Bien-type (T4)   │ 980k     │ 720k      │ 760k             │
│ Loyer €/m² (est.)│ 31       │ 25        │ 27               │
│ Rendement (est.) │ 3,4 %    │ 3,5 %     │ 3,6 %            │
│ Évol. prix 5 ans │ +6 %     │ +11 %     │ +14 %            │
│ Transports       │ 92 ▓▓▓▓▓ │ 80 ▓▓▓▓   │ 84 ▓▓▓▓          │
│ Éducation        │ 78       │ 81        │ 79               │
│ Qualité de vie   │ 74       │ 82        │ 80               │
│ Score perso      │ 79       │ 85 ★      │ 83               │
│ Confiance data   │ 81 %     │ 77 %      │ 76 %             │
├──────────────────┴──────────┴───────────┴──────────────────┤
│ 🏆 Meilleur choix pour votre profil : Boulogne-Billancourt │
│ 💶 Meilleur rapport qualité/prix : Issy   📈 Potentiel: Issy│
└────────────────────────────────────────────────────────────┘
```
- Meilleure valeur par ligne mise en évidence ; badges de synthèse auto.

## Écran 6 — Simulation

```
┌───────────────────────────────────────────────┐
│  Simulation — Bordeaux, T4 ~90 m²              │
├───────────────────────────────────────────────┤
│  Prix du bien   [ 434 000 € ]                  │
│  Apport         [  60 000 € ]                  │
│  Taux           [ 3,5 % ] Durée [ 25 ans ]     │
│  Frais notaire  ~ 32 000 € (estimé, ancien)    │
│                                                 │
│  → Mensualité ~ 1 870 €/mois {jauge vs revenus}│
│  → Taux d'endettement ~ 34 %  (seuil 35 %)     │
│                                                 │
│  [Onglet Investissement]                        │
│  Loyer estimé ~ 1 060 €/mois → Rendement brut   │
│  ~4,1 % · cash-flow ~ −480 €/mois (indicatif)   │
│  ⚠ Estimation indicative — hors fiscalité       │
└───────────────────────────────────────────────┘
```
- Deux modes selon le parcours (mensualité RP / rendement-cashflow invest). Mentions « indicatif » explicites.

## Écran 7 — Dashboard utilisateur

```
┌───────────────────────────────────────────────────────────┐
│  Bonjour Camille — Votre projet : « Maison famille 372k »  │
├───────────────┬───────────────┬───────────────────────────┤
│ 🔔 Alertes    │ ⭐ Favoris     │ 📈 Évolution               │
│ Nantes 78→83  │ Angers, Tours,│ {graphe scores suivis 6 mois}│
│ (voir pourquoi)│ Le Mans       │                           │
│ Angers: prix  │               │                           │
│ +2,1 %        │ [Comparer]    │                           │
├───────────────┴───────────────┴───────────────────────────┤
│  Recherches sauvegardées · Export PDF · Partager           │
└───────────────────────────────────────────────────────────┘
```

## Note de design system (pour la V UI)

- Palette sobre + accents ; **jauges** (0–100) réutilisables ; **badge de confiance** standard (%, 4 niveaux) ; **chip source** cliquable ; heatmaps avec échelles perceptuellement uniformes + motifs pour accessibilité. Composants documentés au moment du build front.
