"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchWeights, postFinance, postScore, createProject, getProject, updateProject,
  getProjectAlerts, fetchCommunes, postSimulate, toggleFavorite,
  type WeightsResponse, type FinanceResult, type ScoreResponse, type ProjectAlerts,
  type RankedZone, type SimResult, type CommuneProps,
} from "@/lib/api";
import ResultsMap from "./ResultsMap";

type ProfileType = "home" | "investment";

const TITLES: Record<ProfileType, string> = {
  home: "🏠 Ma résidence principale",
  investment: "📈 Investir",
};

export default function Projet({ type, initialId }: { type: ProfileType; initialId?: string }) {
  const [step, setStep] = useState(1);
  const [w, setW] = useState<WeightsResponse | null>(null);
  const [importance, setImportance] = useState<Record<string, number>>({});

  const [apport, setApport] = useState(60000);
  const [revenus, setRevenus] = useState(5200);
  const [taux, setTaux] = useState(3.5);
  const [duree, setDuree] = useState(25);
  const [surface, setSurface] = useState(70);

  const [finance, setFinance] = useState<FinanceResult | null>(null);
  const [results, setResults] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(initialId ?? null);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<ProjectAlerts | null>(null);
  const [communeInd, setCommuneInd] = useState<Record<string, { nom: string; prix: number; loyer: number }>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchWeights(type)
      .then((res) => {
        setW(res);
        setImportance((prev) => {
          if (Object.keys(prev).length) return prev; // ne pas écraser un projet chargé
          const imp: Record<string, number> = {};
          Object.entries(res.weights).forEach(([k, v]) => (imp[k] = Math.round(v * 100)));
          return imp;
        });
      })
      .catch(() => setError("API indisponible — démarrez apps/api."));
  }, [type]);

  // Rechargement d'un projet sauvegardé (?id=…).
  useEffect(() => {
    if (!initialId) return;
    getProject(initialId)
      .then((proj) => {
        const pl = proj.payload;
        if (pl.weights) {
          const imp: Record<string, number> = {};
          Object.entries(pl.weights).forEach(([k, v]) => (imp[k] = Math.round(v)));
          setImportance(imp);
        }
        if (pl.surface) setSurface(pl.surface);
        const fin = pl.finance as Record<string, number> | undefined;
        if (fin) {
          if (fin.apport != null) setApport(fin.apport);
          if (fin.revenus != null) setRevenus(fin.revenus);
          if (fin.taux != null) setTaux(fin.taux);
          if (fin.duree != null) setDuree(fin.duree);
        }
        setResults({
          profile: proj.payload.profile, scoring_version: "", weights_applied: {},
          budget: proj.payload.budget ?? null, surface: proj.payload.surface ?? null,
          results: proj.results,
        });
        setFavorites(new Set(proj.favorites.map((f) => f.code_commune)));
        setStep(3);
      })
      .catch(() => setError("Projet introuvable."));
    getProjectAlerts(initialId).then(setAlerts).catch(() => {});
  }, [initialId]);

  useEffect(() => {
    fetchCommunes().then((fc) => {
      const m: Record<string, { nom: string; prix: number; loyer: number }> = {};
      fc.features.forEach((f) => {
        const p = f.properties as CommuneProps;
        if (p.has_data) m[p.code_commune] = {
          nom: p.nom_commune,
          prix: p.indicators.prix_m2?.value ?? 0,
          loyer: p.indicators.loyer_m2?.value ?? 0,
        };
      });
      setCommuneInd(m);
    }).catch(() => {});
  }, []);

  const computeFinance = useCallback(async () => {
    try {
      setFinance(
        await postFinance({ revenus_mensuels: revenus, apport, taux_annuel: taux, duree_annees: duree })
      );
    } catch {
      /* silencieux : l'utilisateur peut continuer */
    }
  }, [revenus, apport, taux, duree]);

  useEffect(() => {
    computeFinance();
  }, [computeFinance]);

  async function seeResults() {
    setLoading(true);
    setError(null);
    try {
      const res = await postScore({
        profile: type,
        weights: importance,
        budget: finance?.budget_achat ?? null,
        surface,
      });
      setResults(res);
      setStep(3);
    } catch {
      setError("Erreur de calcul du classement.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProject() {
    setSaving(true);
    setError(null);
    const payload = {
      profile: type,
      weights: importance,
      budget: finance?.budget_achat ?? null,
      surface,
      finance: { apport, revenus, taux, duree },
      favorites: Array.from(favorites),
    };
    try {
      const proj = savedId
        ? await updateProject(savedId, payload)
        : await createProject(payload);
      setSavedId(proj.id);
      setResults((r) => (r ? { ...r, results: proj.results } : r));
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("id", proj.id);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      setError("Erreur lors de la sauvegarde du projet.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFav(code: string) {
    const next = new Set(favorites);
    if (next.has(code)) next.delete(code); else next.add(code);
    setFavorites(next);
    if (savedId) {
      try { await toggleFavorite(savedId, code); } catch { /* état local conservé */ }
    }
  }

  const eur = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <main className="projet">
      <header className="topbar">
        <h1>
          <Link href="/" className="backlink">←</Link> {TITLES[type]}
        </h1>
        {step < 3 && (
          <span className="stepper">Étape {step}/2</span>
        )}
      </header>

      {error && <div className="banner error">{error}</div>}

      {/* Étape 1 — Budget & financement */}
      {step === 1 && (
        <section className="panel">
          <h2>Votre budget</h2>
          <div className="grid">
            <label>Apport (€)
              <input type="number" value={apport} step={5000}
                onChange={(e) => setApport(+e.target.value)} />
            </label>
            <label>Revenus nets du foyer (€/mois)
              <input type="number" value={revenus} step={100}
                onChange={(e) => setRevenus(+e.target.value)} />
            </label>
            <label>Taux (%)
              <input type="number" value={taux} step={0.1}
                onChange={(e) => setTaux(+e.target.value)} />
            </label>
            <label>Durée (ans)
              <input type="number" value={duree} step={1}
                onChange={(e) => setDuree(+e.target.value)} />
            </label>
            <label>Surface cible (m²)
              <input type="number" value={surface} step={5}
                onChange={(e) => setSurface(+e.target.value)} />
            </label>
          </div>

          {finance && (
            <div className="budget">
              <div className="budget-main">
                Budget d'achat estimé
                <strong>~ {eur(finance.budget_achat)} €</strong>
              </div>
              <ul>
                <li>Mensualité max : {eur(finance.mensualite_max)} €/mois</li>
                <li>Capacité d'emprunt : {eur(finance.capacite_emprunt)} €</li>
                <li>Frais d'acquisition estimés : {eur(finance.frais_estimes)} €</li>
              </ul>
              <small>
                Apport {eur(apport)} € + capacité d'emprunt − frais. Hypothèses :
                taux {taux} % · endettement 35 %. Estimation indicative, ne vaut pas accord de prêt.
              </small>
            </div>
          )}

          <div className="actions">
            <button className="primary" onClick={() => setStep(2)}>Continuer ▶</button>
          </div>
        </section>
      )}

      {/* Étape 2 — Critères pondérés */}
      {step === 2 && w && (
        <section className="panel">
          <h2>Ce qui compte pour vous</h2>
          <p className="hint">Réglez l'importance de chaque critère : le classement s'y adapte.</p>
          <div className="sliders">
            {Object.keys(w.weights).map((code) => (
              <div className="slider" key={code}>
                <div className="slabel">
                  <span>{w.criteria[code]?.label ?? code}</span>
                  <span className="sval">{importance[code] ?? 0}</span>
                </div>
                <input type="range" min={0} max={50} value={importance[code] ?? 0}
                  onChange={(e) => setImportance({ ...importance, [code]: +e.target.value })} />
              </div>
            ))}
          </div>
          <div className="actions">
            <button onClick={() => setStep(1)}>◀ Retour</button>
            <button className="primary" onClick={seeResults} disabled={loading}>
              {loading ? "Calcul…" : "Voir mes résultats ▶"}
            </button>
          </div>
        </section>
      )}

      {/* Étape 3 — Résultats */}
      {step === 3 && results && (
        <section className="results">
          <div className="results-list">
            <div className="results-head">
              <h2>Vos zones recommandées</h2>
              <div className="rhead-actions">
                <button onClick={() => setStep(2)}>Ajuster</button>
                <button onClick={() => window.print()}>🖨 Exporter PDF</button>
                <button className="save" onClick={saveProject} disabled={saving}>
                  {saving ? "…" : savedId ? "Mettre à jour" : "💾 Sauvegarder"}
                </button>
              </div>
            </div>
            {savedId && (
              <p className="saved">
                ✓ Projet sauvegardé — conservez ce lien pour suivre l'évolution :{" "}
                <code>?id={savedId}</code>
              </p>
            )}
            {finance && (
              <p className="ctx">
                Budget d'achat ~ {eur(finance.budget_achat)} € · bien-type {surface} m²
              </p>
            )}
            {alerts && alerts.count > 0 && (
              <div className="alerts">
                <div className="alerts-head">
                  🔔 {alerts.count} évolution{alerts.count > 1 ? "s" : ""} depuis votre sauvegarde
                  <small>{alerts.snapshot_millesime?.slice(0, 10)} → {alerts.current_millesime?.slice(0, 10)}</small>
                </div>
                <ul>
                  {alerts.events.map((e, i) => (
                    <li key={i} className={`alert alert-${e.type}`}>
                      <span className="atag">{e.type}</span> {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alerts && alerts.count === 0 && (
              <p className="noalert">🔔 Aucune évolution significative depuis votre sauvegarde.</p>
            )}
            <ol>
              {results.results.map((r) => (
                <li key={r.zone_id} className={r.within_budget === false ? "over" : ""}>
                  <div className="rrow">
                    <span className="rrank">{r.rank}</span>
                    <button
                      className={favorites.has(r.zone_id) ? "fav on" : "fav"}
                      onClick={() => toggleFav(r.zone_id)}
                      aria-label={favorites.has(r.zone_id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      title={savedId ? "Favori" : "Favori (sera enregistré avec le projet)"}
                    >{favorites.has(r.zone_id) ? "★" : "☆"}</button>
                    <span className="rname">{r.nom_commune}</span>
                    {r.score_delta != null && r.score_delta !== 0 && (
                      <span className={`delta ${r.score_delta > 0 ? "up" : "down"}`}>
                        {r.score_delta > 0 ? "▲" : "▼"} {Math.abs(r.score_delta)}
                      </span>
                    )}
                    <span className="rscore">{r.score}<small>/100</small></span>
                  </div>
                  <div className="rmeta">
                    {r.bien_type_price != null && (
                      <span className={r.within_budget ? "ok" : "ko"}>
                        bien-type ~ {eur(r.bien_type_price)} €
                        {r.within_budget ? " ✓ dans le budget" : " ✗ au-dessus"}
                      </span>
                    )}
                    {r.confidence_score != null && <span className="rconf">confiance {r.confidence_score}%</span>}
                  </div>
                  <div className="rwhy">
                    Surtout : {[...r.breakdown].sort((a, b) => b.contribution - a.contribution)
                      .slice(0, 2).map((b) => b.label).join(", ")}
                  </div>
                </li>
              ))}
            </ol>
            <p className="note">
              Les zones compatibles avec votre budget apparaissent en premier.
              Chaque score est expliqué et sourcé — vous restez décisionnaire.
            </p>
          </div>
          <ResultsMap results={results.results} />
        </section>
      )}

      {step === 3 && results && type === "investment" && (
        <InvestSim results={results.results} surface={surface} communeInd={communeInd} apport={apport} taux={taux} />
      )}

      {step === 3 && results && (
        <PrintReport
          type={type}
          results={results.results}
          budget={finance?.budget_achat ?? null}
          surface={surface}
          savedId={savedId}
        />
      )}
    </main>
  );
}

function InvestSim({
  results, surface, communeInd, apport, taux,
}: {
  results: RankedZone[];
  surface: number;
  communeInd: Record<string, { nom: string; prix: number; loyer: number }>;
  apport: number;
  taux: number;
}) {
  const [code, setCode] = useState(results[0]?.zone_id ?? "");
  const [charges, setCharges] = useState(20);
  const [vacancy, setVacancy] = useState(5);
  const [sim, setSim] = useState<SimResult | null>(null);
  const ind = communeInd[code];

  const run = useCallback(async () => {
    if (!ind || !ind.loyer) return;
    try {
      setSim(await postSimulate({
        prix: Math.round(ind.prix * surface), surface, loyer_m2: ind.loyer,
        apport, taux_annuel: taux, duree_annees: 20,
        charges_pct: charges / 100, vacancy_pct: vacancy / 100,
      }));
    } catch { /* laisse l'état précédent */ }
  }, [ind, surface, apport, taux, charges, vacancy]);

  useEffect(() => { run(); }, [run]);
  const eur = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <section className="panel">
      <div className="card ctl">
        <h3 style={{ fontSize: "1rem", marginTop: 0 }}>Simulateur d'investissement <span className="hint" style={{ fontWeight: 400 }}>(indicatif)</span></h3>
        <div className="sim-controls">
          <label className="field">Commune
            <select value={code} onChange={(e) => setCode(e.target.value)}>
              {results.map((r) => <option key={r.zone_id} value={r.zone_id}>{communeInd[r.zone_id]?.nom ?? r.nom_commune}</option>)}
            </select>
          </label>
          <label className="field">Charges (% loyer)<input type="number" value={charges} min={0} max={50} onChange={(e) => setCharges(+e.target.value)} /></label>
          <label className="field">Vacance (%)<input type="number" value={vacancy} min={0} max={30} onChange={(e) => setVacancy(+e.target.value)} /></label>
        </div>

        {sim ? (
          <>
            <div className="sim-grid">
              <div><span className="k">Coût total</span><b>{eur(sim.cout_total)} €</b><small>prix {eur(sim.prix)} + frais {eur(sim.frais)}</small></div>
              <div><span className="k">Loyer</span><b>{eur(sim.loyer_mensuel)} €/mois</b><small>{eur(sim.loyer_annuel_brut)} €/an brut</small></div>
              <div><span className="k">Rendement brut</span><b>{sim.rendement_brut}%</b></div>
              <div><span className="k">Rendement net</span><b>{sim.rendement_net}%</b><small>charges + taxe foncière − vacance</small></div>
              <div><span className="k">Mensualité crédit</span><b>{eur(sim.mensualite_credit)} €</b><small>emprunt {eur(sim.emprunt)} € · 20 ans</small></div>
              <div className={sim.cashflow_mensuel >= 0 ? "cf pos" : "cf neg"}>
                <span className="k">Cash-flow</span><b>{sim.cashflow_mensuel >= 0 ? "+" : ""}{eur(sim.cashflow_mensuel)} €/mois</b>
                <small>{sim.cashflow_annuel >= 0 ? "+" : ""}{eur(sim.cashflow_annuel)} €/an</small>
              </div>
            </div>
            <p className="note">Estimation indicative — hors fiscalité (LMNP, déficit foncier…). Loyer estimé (modèle). Vous restez décisionnaire.</p>
          </>
        ) : (
          <p className="hint">{ind && !ind.loyer ? "Loyer indisponible pour cette commune." : "Chargement…"}</p>
        )}
      </div>
    </section>
  );
}

function PrintReport({
  type, results, budget, surface, savedId,
}: {
  type: ProfileType;
  results: RankedZone[];
  budget: number | null;
  surface: number;
  savedId: string | null;
}) {
  const eur = (n: number) => Math.round(n).toLocaleString("fr-FR");
  const today = new Date().toLocaleDateString("fr-FR");
  const profil = type === "home" ? "Résidence principale" : "Investissement";
  return (
    <div className="print-report" aria-hidden="true">
      <div className="pr-head">
        <div>
          <h1>Analyse immobilière — {profil}</h1>
          <p className="pr-sub">
            Budget d'achat ~ {budget ? eur(budget) : "—"} € · bien-type {surface} m² · éditée le {today}
          </p>
        </div>
        <div className="pr-brand">Copilote de décision immobilière</div>
      </div>

      <table className="pr-table">
        <thead>
          <tr>
            <th>#</th><th>Commune</th><th>Score</th><th>Bien-type</th>
            <th>Budget</th><th>Confiance</th><th>Facteurs clés</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.zone_id}>
              <td>{r.rank}</td>
              <td className="pr-nom">{r.nom_commune}</td>
              <td className="pr-score">{r.score}/100</td>
              <td>{r.bien_type_price != null ? `~ ${eur(r.bien_type_price)} €` : "—"}</td>
              <td>{r.within_budget == null ? "—" : r.within_budget ? "✓ dans le budget" : "✗ au-dessus"}</td>
              <td>{r.confidence_score != null ? `${r.confidence_score}%` : "—"}</td>
              <td className="pr-why">
                {[...r.breakdown].sort((a, b) => b.contribution - a.contribution).slice(0, 2).map((b) => b.label).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pr-foot">
        <p>
          <b>Méthode.</b> Classement personnalisé selon vos critères pondérés. Scores 0–100,
          normalisés et comparables entre zones ; chaque indicateur est sourcé et daté
          (DVF, INSEE, loyers, éducation, transports). « Bien-type » = prix estimé pour la
          surface cible. Les zones compatibles avec votre budget apparaissent en premier.
        </p>
        <p className="pr-disc">
          Aide à la décision — jamais un conseil en investissement. Vous restez décisionnaire.
          {savedId ? ` Projet suivi : réf. ${savedId}.` : ""} Généré par Copilote de décision immobilière.
        </p>
      </div>
    </div>
  );
}
