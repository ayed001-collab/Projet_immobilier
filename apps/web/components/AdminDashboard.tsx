"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminSources, fetchAdminRuns, postAdminReload,
  type AdminSourcesResponse, type AdminRuns,
} from "@/lib/api";

const STATUS_ICON: Record<string, string> = { ok: "✓", warning: "⚠", unknown: "?" };

export default function AdminDashboard() {
  const [sources, setSources] = useState<AdminSourcesResponse | null>(null);
  const [runs, setRuns] = useState<AdminRuns | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const load = useCallback(() => {
    Promise.all([fetchAdminSources(), fetchAdminRuns()])
      .then(([s, r]) => { setSources(s); setRuns(r); })
      .catch(() => setError("API indisponible — démarrez apps/api."));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function reload() {
    setReloading(true);
    try {
      await postAdminReload();
      load();
    } catch {
      setError("Échec du rechargement.");
    } finally {
      setReloading(false);
    }
  }

  const dt = (s?: string | null) => (s ? s.slice(0, 10) : "—");

  return (
    <main className="admin">
      <header className="topbar">
        <div>
          <h1><Link href="/" className="backlink">←</Link> Back-office data</h1>
          <p className="subtitle">
            Supervision des sources · DQ global{" "}
            {sources?.global_dq_score ?? "—"} · dernier run {dt(sources?.run_finished)}
          </p>
        </div>
        <button className="reload" onClick={reload} disabled={reloading}>
          {reloading ? "Rechargement…" : "↻ Recharger les données publiées"}
        </button>
      </header>

      {error && <div className="banner error">{error}</div>}

      <section className="admin-body">
        <h2>Sources</h2>
        <div className="tablewrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Statut</th><th>Source</th><th>Indicateurs</th>
                <th>Dernière donnée</th><th>Dernière collecte</th>
                <th>Prochaine collecte</th><th>Fréquence</th><th>DQ</th>
              </tr>
            </thead>
            <tbody>
              {sources?.sources.map((s) => (
                <tr key={s.source}>
                  <td><span className={`status ${s.status}`}>{STATUS_ICON[s.status]} {s.status_label}</span></td>
                  <td className="src">{s.source}</td>
                  <td className="ind">{s.indicators.join(", ")}</td>
                  <td>{s.last_millesime ?? "—"}</td>
                  <td>{dt(s.last_collection)}</td>
                  <td>{dt(s.next_collection)}</td>
                  <td>{s.frequency_label}</td>
                  <td className="dq"><DqBar value={s.dq_score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Qualité par indicateur (dernier run)</h2>
        <div className="tablewrap">
          <table className="admin-table">
            <thead>
              <tr><th>Indicateur</th><th>Nature</th><th>Complétude</th><th>Fraîcheur</th><th>Volume</th><th>DQ</th></tr>
            </thead>
            <tbody>
              {runs?.dq_report &&
                Object.entries(runs.dq_report.per_indicator).map(([code, v]) => (
                  <tr key={code}>
                    <td className="src">{v.label}{v.is_estimated && <em className="est"> est.</em>}</td>
                    <td>{v.nature}</td>
                    <td>{Math.round(v.completeness * 100)}%</td>
                    <td>{Math.round(v.freshness * 100)}%</td>
                    <td>{Math.round(v.volume * 100)}%</td>
                    <td className="dq"><DqBar value={v.dq_score} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <p className="note">
          Lecture seule. Le bouton « Recharger » vide le cache de l'API après un run
          de la Data Factory ; le déclenchement du pipeline relève de l'orchestrateur
          (Dagster). Aucune donnée n'est masquée : les sources « anciennes » sont signalées.
        </p>
      </section>
    </main>
  );
}

function DqBar({ value }: { value: number | null }) {
  if (value == null) return <span>—</span>;
  const color = value >= 85 ? "#1a9850" : value >= 70 ? "#f2a900" : "#d73027";
  return (
    <span className="dqbar">
      <span className="dqfill" style={{ width: `${value}%`, background: color }} />
      <span className="dqval">{value}</span>
    </span>
  );
}
