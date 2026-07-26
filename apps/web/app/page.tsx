import MapView from "@/components/MapView";
import { fetchMeta, type Meta } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  let meta: Meta | null = null;
  try {
    meta = await fetchMeta();
  } catch {
    meta = null;
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>Copilote immobilier — indicateurs territoriaux</h1>
          <p className="subtitle">
            Incrément 1 · Data Factory multi-sources ·{" "}
            {meta
              ? `${meta.communes_with_data} communes · ${meta.indicators.length} indicateurs · DQ global ${meta.global_dq_score}`
              : "démarrez l'API pour charger les données"}
          </p>
        </div>
        <span className="badge">Aide à la décision — vous restez décisionnaire</span>
      </header>

      <MapView />

      <footer className="sourcebar">
        {meta?.avertissement ??
          "Chiffres sourcés, datés et assortis d'un niveau de confiance."}
        {meta?.run_finished ? ` · Données publiées le ${meta.run_finished.slice(0, 10)}` : ""}
      </footer>
    </main>
  );
}
