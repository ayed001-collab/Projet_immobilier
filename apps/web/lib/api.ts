// Contrat de lecture avec l'API (Incrément 1).

export interface IndicatorValue {
  value: number;
  unit: string;
  millesime: string;
  source: string;
  nature: string; // measure | calc | model | editorial | forecast
  is_estimated: boolean;
  label: string;
  direction: string; // higher_better | lower_better | context
}

export interface ScoreContribution {
  criterion: string;
  label: string;
  weight: number;
  subscore: number;
  contribution: number;
}

export interface ProfileScore {
  score: number;
  breakdown: ScoreContribution[];
  scoring_version: string;
}

export interface CommuneProps {
  code_commune: string;
  nom_commune: string;
  has_data: boolean;
  confidence_score: number | null;
  confidence_level: string | null;
  home_score?: number | null;
  investment_score?: number | null;
  scores?: { subscores?: Record<string, number>; home?: ProfileScore; investment?: ProfileScore };
  indicators: Record<string, IndicatorValue>;
  history?: Record<string, { millesime: string; value: number }[]>;
}

export interface Layer {
  code: string;
  label: string;
  unit: string;
  category: string;
  nature: string;
  direction: string;
  is_estimated: boolean;
  source: string;
}

export interface Meta {
  communes_total: number;
  communes_with_data: number;
  indicators: string[];
  departement?: string;
  dvf_millesimes?: string[];
  global_dq_score?: number;
  run_finished?: string;
  avertissement?: string;
}

const base =
  typeof window === "undefined"
    ? process.env.API_URL || "http://localhost:8000"
    : "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export const fetchMeta = () => get<Meta>("/api/meta");
export const fetchLayers = () => get<Layer[]>("/api/layers");
export const fetchCommunes = () => get<GeoJSON.FeatureCollection>("/api/communes");
