import MapView from "@/components/MapView";
import { fetchMeta, type Meta } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  let meta: Meta | null = null;
  try {
    meta = await fetchMeta();
  } catch {
    meta = null; // l'API n'est peut-être pas démarrée ; la carte affichera l'erreur
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>Copilote immobilier — Prix au m²</h1>
          <p className="subtitle">
            Incrément 0 · chaîne DVF → carte · {" "}
            {meta
              ? `${meta.communes_with_data} communes · ${meta.source} · ${meta.periode}`
              : "démarrez l'API pour charger les données"}
          </p>
        </div>
        <span className="badge">Aide à la décision — vous restez décisionnaire</span>
      </header>

      <MapView />

      <footer className="sourcebar">
        {meta?.avertissement ??
          "Chiffres sourcés et datés. Aide à la décision immobilière."}
        {meta?.derniere_maj
          ? ` · Dernière mise à jour : ${meta.derniere_maj.slice(0, 10)}`
          : ""}
      </footer>
    </main>
  );
}
