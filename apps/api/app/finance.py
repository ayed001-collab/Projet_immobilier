"""Module financement (docs/04 RG-B) — capacité d'emprunt & budget d'achat.

Calcule un **budget d'achat réaliste** à partir de l'apport et de la capacité
d'emprunt (revenus, taux, durée, taux d'endettement HCSF ~35 %), frais
d'acquisition inclus. Estimation indicative — jamais un accord de prêt.
"""
from __future__ import annotations

from dataclasses import dataclass

DEFAULT_ENDETTEMENT = 0.35  # seuil HCSF
# Frais d'acquisition (notaire + divers) en part du prix du bien.
FRAIS_ANCIEN = 0.075
FRAIS_NEUF = 0.025


@dataclass
class FinanceResult:
    mensualite_max: float
    capacite_emprunt: float
    enveloppe_totale: float  # apport + capacité (avant frais)
    frais_estimes: float
    budget_achat: float  # prix max du bien finançable, frais déduits
    taux_frais: float

    def to_dict(self) -> dict:
        return {
            "mensualite_max": round(self.mensualite_max),
            "capacite_emprunt": round(self.capacite_emprunt),
            "enveloppe_totale": round(self.enveloppe_totale),
            "frais_estimes": round(self.frais_estimes),
            "budget_achat": round(self.budget_achat),
            "taux_frais": self.taux_frais,
        }


def capacite_emprunt(mensualite: float, taux_annuel: float, duree_annees: int) -> float:
    """Capital empruntable = valeur actuelle d'une annuité (mensualités constantes)."""
    n = duree_annees * 12
    i = taux_annuel / 100 / 12
    if i <= 0:
        return mensualite * n
    return mensualite * (1 - (1 + i) ** (-n)) / i


def mensualite_credit(capital: float, taux_annuel: float, duree_annees: int) -> float:
    """Mensualité d'un crédit amortissable (inverse de la capacité d'emprunt)."""
    n = duree_annees * 12
    i = taux_annuel / 100 / 12
    if capital <= 0:
        return 0.0
    if i <= 0:
        return capital / n
    return capital * i / (1 - (1 + i) ** (-n))


def simulate_investment(
    prix: float,
    surface: float,
    loyer_m2: float,
    apport: float = 0.0,
    taux_annuel: float = 3.5,
    duree_annees: int = 20,
    charges_pct: float = 0.20,      # gestion, entretien, copro, assurances (part du loyer)
    vacancy_pct: float = 0.05,      # vacance locative
    taxe_fonciere_pct: float = 0.008,  # proxy annuel (part du prix) — indicatif
    bien_neuf: bool = False,
) -> dict:
    """Simulation d'investissement locatif (estimation indicative, hors fiscalité détaillée)."""
    taux_frais = FRAIS_NEUF if bien_neuf else FRAIS_ANCIEN
    frais = prix * taux_frais
    cout_total = prix + frais
    emprunt = max(0.0, cout_total - apport)
    mensualite = mensualite_credit(emprunt, taux_annuel, duree_annees)

    loyer_mensuel = loyer_m2 * surface
    loyer_annuel_brut = loyer_mensuel * 12
    loyer_effectif = loyer_annuel_brut * (1 - vacancy_pct)
    charges = loyer_effectif * charges_pct
    taxe_fonciere = prix * taxe_fonciere_pct
    revenu_net_avant_credit = loyer_effectif - charges - taxe_fonciere

    credit_annuel = mensualite * 12
    cashflow_annuel = revenu_net_avant_credit - credit_annuel

    rendement_brut = loyer_annuel_brut / cout_total * 100 if cout_total else 0
    rendement_net = revenu_net_avant_credit / cout_total * 100 if cout_total else 0

    return {
        "prix": round(prix), "frais": round(frais), "cout_total": round(cout_total),
        "emprunt": round(emprunt), "mensualite_credit": round(mensualite),
        "loyer_mensuel": round(loyer_mensuel), "loyer_annuel_brut": round(loyer_annuel_brut),
        "charges_annuelles": round(charges), "taxe_fonciere": round(taxe_fonciere),
        "rendement_brut": round(rendement_brut, 2), "rendement_net": round(rendement_net, 2),
        "cashflow_mensuel": round(cashflow_annuel / 12), "cashflow_annuel": round(cashflow_annuel),
        "hypotheses": {
            "taux_annuel": taux_annuel, "duree_annees": duree_annees,
            "charges_pct": charges_pct, "vacancy_pct": vacancy_pct,
            "taxe_fonciere_pct": taxe_fonciere_pct,
            "avertissement": "Estimation indicative — hors fiscalité (LMNP, déficit foncier…) "
            "et charges spécifiques. Ne vaut pas conseil.",
        },
    }


def compute(
    revenus_mensuels: float,
    apport: float = 0.0,
    taux_annuel: float = 3.5,
    duree_annees: int = 25,
    taux_endettement: float = DEFAULT_ENDETTEMENT,
    bien_neuf: bool = False,
) -> FinanceResult:
    mensualite = max(revenus_mensuels, 0) * taux_endettement
    capital = capacite_emprunt(mensualite, taux_annuel, duree_annees)
    enveloppe = apport + capital
    taux_frais = FRAIS_NEUF if bien_neuf else FRAIS_ANCIEN
    # enveloppe = prix + frais = prix * (1 + taux_frais)  ⇒  prix = enveloppe / (1 + taux_frais)
    budget_achat = enveloppe / (1 + taux_frais)
    frais = enveloppe - budget_achat
    return FinanceResult(
        mensualite_max=mensualite,
        capacite_emprunt=capital,
        enveloppe_totale=enveloppe,
        frais_estimes=frais,
        budget_achat=budget_achat,
        taux_frais=taux_frais,
    )
