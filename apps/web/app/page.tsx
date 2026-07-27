import Link from "next/link";
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
    <main className="home">
      <section className="hero">
        <h1>Trouvez la meilleure ville pour votre projet immobilier</h1>
        <p className="lede">
          Des données publiques fiables, un classement personnalisé et expliqué.
          Vous restez décisionnaire.
        </p>

        <div className="doors">
          <Link href="/projet?type=home" className="door">
            <span className="emoji">🏠</span>
            <strong>Ma résidence principale</strong>
            <small>Où vivre selon mon budget, mes trajets, les écoles…</small>
            <span className="cta">Commencer →</span>
          </Link>
          <Link href="/projet?type=investment" className="door">
            <span className="emoji">📈</span>
            <strong>Investir</strong>
            <small>Où investir selon le rendement, le potentiel, le risque…</small>
            <span className="cta">Commencer →</span>
          </Link>
        </div>

        <p className="explore">
          Ou <Link href="/carte">explorer directement la carte des indicateurs</Link>.
        </p>

        {meta && (
          <p className="proof">
            {meta.communes_with_data} communes · {meta.indicators.length} indicateurs
            sourcés · DQ global {meta.global_dq_score}
            {meta.run_finished ? ` · mis à jour le ${meta.run_finished.slice(0, 10)}` : ""}
          </p>
        )}
      </section>
    </main>
  );
}
