// Contrat de lecture avec l'API (Incrément 0).
// Les appels passent par /api/* (réécrit vers l'API FastAPI par next.config.js).

export interface CommuneProps {
  code_commune: string;
  nom_commune: string;
  has_data: boolean;
  prix_m2?: number;
  obs_count?: number;
  periode?: string;
  confidence_score?: number;
  confidence_level?: string;
  source?: string;
  millesime?: string;
  derniere_maj?: string;
  is_estimated?: boolean;
}

export interface Meta {
  indicator: string;
  communes_total: number;
  communes_with_data: number;
  source?: string;
  periode?: string;
  derniere_maj?: string;
  methode?: string;
  avertissement?: string;
}

const base =
  typeof window === "undefined"
    ? process.env.API_URL || "http://localhost:8000"
    : "";

export async function fetchCommunes(): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch(`${base}/api/communes`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API /communes: ${res.status}`);
  return res.json();
}

export async function fetchMeta(): Promise<Meta> {
  const res = await fetch(`${base}/api/meta`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API /meta: ${res.status}`);
  return res.json();
}
