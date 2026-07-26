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
