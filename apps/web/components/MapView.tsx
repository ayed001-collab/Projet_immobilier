"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CommuneProps, Layer } from "@/lib/api";

const RAMP = ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"];

// Couches de score (calculées), affichées en tête du sélecteur.
const SCORE_LAYERS: Layer[] = [
  { code: "home_score", label: "Home Score", unit: "/100", category: "score",
    nature: "score", direction: "higher_better", is_estimated: false,
    source: "Scoring (résidence principale)" },
  { code: "investment_score", label: "Investment Score", unit: "/100", category: "score",
    nature: "score", direction: "higher_better", is_estimated: false,
    source: "Scoring (investissement)" },
];
const SCORE_CODES = new Set(SCORE_LAYERS.map((l) => l.code));

function valueForFeature(props: CommuneProps, code: string): number | undefined {
  if (SCORE_CODES.has(code)) {
    const v = (props as unknown as Record<string, unknown>)[code];
    return typeof v === "number" ? v : undefined;
  }
  return props.indicators?.[code]?.value;
}

function ramp(min: number, max: number): (number | string)[] {
  const stops: (number | string)[] = [];
  RAMP.forEach((c, i) => {
    stops.push(min + ((max - min) * i) / (RAMP.length - 1), c);
  });
  return stops;
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geoRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const [layers, setLayers] = useState<Layer[]>(SCORE_LAYERS);
  const [active, setActive] = useState<string>("home_score");
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const [selected, setSelected] = useState<CommuneProps | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeLayer = layers.find((l) => l.code === active);

  // Recolore la carte selon la couche active (valeurs aplaties dans _val).
  function applyLayer(code: string) {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !map.getSource("communes")) return;

    const isScore = SCORE_CODES.has(code);
    const vals: number[] = [];
    const features = geo.features.map((f) => {
      const v = valueForFeature(f.properties as CommuneProps, code);
      if (typeof v === "number") vals.push(v);
      return { ...f, properties: { ...f.properties, _val: v ?? null, _has: v != null } };
    });
    const fc = { ...geo, features } as GeoJSON.FeatureCollection;
    (map.getSource("communes") as maplibregl.GeoJSONSource).setData(fc);

    // Les scores ont une échelle fixe 0–100 ; les indicateurs, une échelle data.
    const min = isScore ? 0 : vals.length ? Math.min(...vals) : 0;
    const max = isScore ? 100 : vals.length ? Math.max(...vals) : 1;
    setRange([min, max]);
    map.setPaintProperty("communes-fill", "fill-color", [
      "case",
      ["==", ["get", "_has"], true],
      ["interpolate", ["linear"], ["get", "_val"], ...ramp(min, max === min ? min + 1 : max)],
      "#cccccc",
    ] as unknown as maplibregl.ExpressionSpecification);
  }

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "bg", type: "background", paint: { "background-color": "#eef2f5" } }],
      },
      center: [-0.6, 44.82],
      zoom: 10.5,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      try {
        const [layersRes, geoRes] = await Promise.all([
          fetch("/api/layers", { cache: "no-store" }),
          fetch("/api/communes", { cache: "no-store" }),
        ]);
        if (!layersRes.ok || !geoRes.ok) throw new Error("API");
        const ls: Layer[] = await layersRes.json();
        const geo: GeoJSON.FeatureCollection = await geoRes.json();
        setLayers([...SCORE_LAYERS, ...ls]);
        geoRef.current = geo;

        map.addSource("communes", { type: "geojson", data: geo });
        map.addLayer({ id: "communes-fill", type: "fill", source: "communes", paint: { "fill-opacity": 0.78 } });
        map.addLayer({ id: "communes-outline", type: "line", source: "communes", paint: { "line-color": "#fff", "line-width": 1 } });
        map.addLayer({
          id: "communes-label", type: "symbol", source: "communes",
          layout: { "text-field": ["get", "nom_commune"], "text-size": 12 },
          paint: { "text-color": "#1a1a1a", "text-halo-color": "#fff", "text-halo-width": 1.2 },
        });

        map.on("click", "communes-fill", (e) => {
          const f = e.features?.[0];
          if (f) setSelected(f.properties as unknown as CommuneProps);
        });
        map.on("mouseenter", "communes-fill", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "communes-fill", () => { map.getCanvas().style.cursor = ""; });

        applyLayer("home_score");
      } catch {
        setError("Impossible de charger les données. Data Factory exécutée et API démarrée ?");
      }
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyLayer(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // La fiche récupère les indicateurs complets depuis le geojson en cache
  // (le clic MapLibre sérialise les objets imbriqués en chaîne).
  const selectedFull =
    selected &&
    (geoRef.current?.features.find(
      (f) => (f.properties as CommuneProps).code_commune === selected.code_commune
    )?.properties as CommuneProps | undefined);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />

      <div className="layerbar">
        {layers.map((l) => (
          <button
            key={l.code}
            className={l.code === active ? "chip active" : "chip"}
            onClick={() => setActive(l.code)}
            title={l.source}
          >
            {l.label}
            {l.is_estimated ? " •est." : ""}
          </button>
        ))}
      </div>

      {activeLayer && (
        <div className="legend">
          <strong>{activeLayer.label}</strong> <span className="unit">({activeLayer.unit})</span>
          <div className="gradient">
            <span>{Math.round(range[0]).toLocaleString("fr-FR")}</span>
            <span className="bar" />
            <span>{Math.round(range[1]).toLocaleString("fr-FR")}</span>
          </div>
          <small>
            Source : {activeLayer.source}
            {activeLayer.is_estimated ? " · donnée estimée" : ""}
          </small>
        </div>
      )}

      {error && <div className="banner error">{error}</div>}

      {selectedFull && (
        <aside className="fiche">
          <button className="close" onClick={() => setSelected(null)}>×</button>
          <h2>{selectedFull.nom_commune}</h2>
          {selectedFull.confidence_score != null && (
            <div className={`conf conf-${(selectedFull.confidence_level || "").toLowerCase()}`}>
              Confiance des données : {selectedFull.confidence_level} ({selectedFull.confidence_score}%)
            </div>
          )}
          {selectedFull.has_data ? (
            <>
              <div className="scores">
                <ScoreBadge label="🏠 Home Score" data={selectedFull.scores?.home} />
                <ScoreBadge label="📈 Investment" data={selectedFull.scores?.investment} />
              </div>
              <Sparkline history={selectedFull.history?.prix_m2} />
              <ul className="indicators">
                {Object.entries(selectedFull.indicators).map(([code, ind]) => (
                  <li key={code}>
                    <span className="ilabel">{ind.label}</span>
                    <span className="ivalue">
                      {ind.value.toLocaleString("fr-FR")} {ind.unit}
                      {ind.is_estimated && <em className="est"> est.</em>}
                    </span>
                    <small className="isrc">{ind.source} · {ind.millesime}</small>
                  </li>
                ))}
              </ul>
              <p className="method">
                Chaque chiffre est <strong>sourcé et daté</strong>. « est. » = estimation
                (modèle), sinon mesure ou calcul. Aide à la décision — vous restez décisionnaire.
              </p>
            </>
          ) : (
            <p>Données insuffisantes pour cette commune.</p>
          )}
        </aside>
      )}
    </div>
  );
}

function ScoreBadge({ label, data }: { label: string; data?: import("@/lib/api").ProfileScore }) {
  if (!data) return null;
  const top = [...data.breakdown].sort((a, b) => b.contribution - a.contribution).slice(0, 2);
  return (
    <div className="scorebadge">
      <div className="scorehead">
        <span>{label}</span>
        <strong>{data.score}/100</strong>
      </div>
      <div className="scorebar">
        <span style={{ width: `${data.score}%` }} />
      </div>
      <small>Surtout : {top.map((t) => t.label).join(", ")}</small>
    </div>
  );
}

function Sparkline({ history }: { history?: { millesime: string; value: number }[] }) {
  if (!history || history.length < 2) return null;
  const w = 240, h = 46, pad = 4;
  const vals = history.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const pts = history.map((p, i) => {
    const x = pad + (i * (w - 2 * pad)) / (history.length - 1);
    const y = h - pad - ((p.value - min) / (max - min || 1)) * (h - 2 * pad);
    return `${x},${y}`;
  });
  const first = history[0].value, last = history[history.length - 1].value;
  const pct = (((last - first) / first) * 100).toFixed(1);
  return (
    <div className="spark">
      <svg width={w} height={h}>
        <polyline points={pts.join(" ")} fill="none" stroke="#08519c" strokeWidth={2} />
      </svg>
      <small>
        Prix au m² {history[0].millesime}→{history[history.length - 1].millesime} :{" "}
        <strong>{Number(pct) >= 0 ? "+" : ""}{pct}%</strong>
      </small>
    </div>
  );
}
