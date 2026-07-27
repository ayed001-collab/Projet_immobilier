"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchCommunes, fetchLayers, postCompare,
  type CompareResponse, type CompareZone, type Layer,
} from "@/lib/api";

type ProfileType = "home" | "investment";

// Lignes du tableau : indicateurs affichés (dans l'ordre) + leur sens.
const ROWS: { key: string; label: string; unit?: string }[] = [
  { key: "prix_m2", label: "Prix au m²", unit: "€/m²" },
  { key: "loyer_m2", label: "Loyer au m²", unit: "€/m²/mois" },
  { key: "rendement_brut", label: "Rendement brut", unit: "%" },
  { key: "tendance_prix_1an", label: "Évolution prix 1 an", unit: "%" },
  { key: "ips_moyen", label: "Éducation (IPS)" },
  { key: "temps_gare_min", label: "Temps gare Bordeaux", unit: "min" },
  { key: "revenu_median", label: "Revenu médian", unit: "€/an" },
  { key: "population", label: "Population" },
];

export default function Comparateur() {
  const [communes, setCommunes] = useState<{ code: string; nom: string }[]>([]);
  const [directions, setDirections] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [profile, setProfile] = useState<ProfileType>("home");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchCommunes(), fetchLayers()])
      .then(([fc, layers]) => {
        setCommunes(
          fc.features
            .map((f) => f.properties as { code_commune: string; nom_commune: string; has_data: boolean })
            .filter((p) => p.has_data)
            .map((p) => ({ code: p.code_commune, nom: p.nom_commune }))
        );
        const d: Record<string, string> = {};
        (layers as Layer[]).forEach((l) => (d[l.code] = l.direction));
        setDirections(d);
      })
      .catch(() => setError("API indisponible — démarrez apps/api."));
  }, []);

  function toggle(code: string) {
    setSelected((s) =>
      s.includes(code) ? s.filter((c) => c !== code) : s.length < 4 ? [...s, code] : s
    );
  }

  async function compare() {
    setLoading(true);
    setError(null);
    try {
      setData(await postCompare({ codes: selected, profile }));
    } catch {
      setError("Erreur lors de la comparaison.");
    } finally {
      setLoading(false);
    }
  }

  // Gagnant par ligne (respecte le sens de l'indicateur).
  const bestByRow = useMemo(() => {
    const best: Record<string, string> = {};
    if (!data) return best;
    for (const row of ROWS) {
      const dir = directions[row.key];
      // Pas de « gagnant » pour les indicateurs de contexte (loyer, population).
      if (dir !== "higher_better" && dir !== "lower_better") continue;
      const lower = dir === "lower_better";
      let winner: string | null = null;
      let winVal: number | null = null;
      for (const z of data.zones) {
        const v = z.indicators[row.key]?.value;
        if (v == null) continue;
        if (winVal == null || (lower ? v < winVal : v > winVal)) {
          winVal = v;
          winner = z.code_commune;
        }
      }
      if (winner) best[row.key] = winner;
    }
    return best;
  }, [data, directions]);

  const fmt = (v?: number) => (v == null ? "—" : v.toLocaleString("fr-FR"));
  const badgeZone = (code: string | null) =>
    data?.zones.find((z) => z.code_commune === code)?.nom_commune;

  return (
    <main className="comparer">
      <header className="topbar">
        <h1>
          <Link href="/" className="backlink">←</Link> Comparateur de zones
        </h1>
        <div className="profile-toggle">
          <button className={profile === "home" ? "on" : ""} onClick={() => setProfile("home")}>🏠 Résidence</button>
          <button className={profile === "investment" ? "on" : ""} onClick={() => setProfile("investment")}>📈 Investir</button>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <section className="picker">
        <p>Sélectionnez 2 à 4 zones à comparer :</p>
        <div className="chips">
          {communes.map((c) => (
            <button
              key={c.code}
              className={selected.includes(c.code) ? "chip on" : "chip"}
              onClick={() => toggle(c.code)}
              disabled={!selected.includes(c.code) && selected.length >= 4}
            >
              {c.nom}
            </button>
          ))}
        </div>
        <button className="primary" disabled={selected.length < 2 || loading} onClick={compare}>
          {loading ? "Comparaison…" : `Comparer (${selected.length})`}
        </button>
      </section>

      {data && (
        <section className="comparison">
          <table>
            <thead>
              <tr>
                <th></th>
                {data.zones.map((z) => (
                  <th key={z.code_commune}>{z.nom_commune}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ScoreRow label={`${profile === "home" ? "Home" : "Investment"} Score`} zones={data.zones}
                get={(z) => (profile === "home" ? z.home_score : z.investment_score)} highlightMax />
              <ScoreRow label="Confiance des données" zones={data.zones}
                get={(z) => z.confidence_score} suffix="%" highlightMax />
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <th>{row.label}</th>
                  {data.zones.map((z) => {
                    const ind = z.indicators[row.key];
                    const win = bestByRow[row.key] === z.code_commune;
                    return (
                      <td key={z.code_commune} className={win ? "win" : ""}>
                        {ind ? `${fmt(ind.value)}${row.unit ? ` ${row.unit}` : ""}` : "—"}
                        {ind?.is_estimated && <em className="est"> est.</em>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="badges">
            {Object.entries(data.badges).map(([key, code]) =>
              code ? (
                <div className="cbadge" key={key}>
                  <span className="btitle">{data.badge_labels[key]}</span>
                  <strong>{badgeZone(code)}</strong>
                </div>
              ) : null
            )}
          </div>
          <p className="note">
            Meilleure valeur par ligne surlignée (sens de l'indicateur respecté).
            « est. » = donnée estimée. Aide à la décision — vous restez décisionnaire.
          </p>
        </section>
      )}
    </main>
  );
}

function ScoreRow({
  label, zones, get, suffix, highlightMax,
}: {
  label: string;
  zones: CompareZone[];
  get: (z: CompareZone) => number | null;
  suffix?: string;
  highlightMax?: boolean;
}) {
  const max = highlightMax
    ? Math.max(...zones.map((z) => get(z) ?? -Infinity))
    : null;
  return (
    <tr className="scorerow">
      <th>{label}</th>
      {zones.map((z) => {
        const v = get(z);
        return (
          <td key={z.code_commune} className={max != null && v === max ? "win" : ""}>
            <strong>{v == null ? "—" : v}</strong>{v != null && suffix ? suffix : v != null && !suffix ? "/100" : ""}
          </td>
        );
      })}
    </tr>
  );
}
