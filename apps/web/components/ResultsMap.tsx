"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RankedZone } from "@/lib/api";

const RAMP = [
  0, "#d73027", 40, "#fee08b", 60, "#d9ef8b", 80, "#1a9850", 100, "#006837",
];

export default function ResultsMap({ results }: { results: RankedZone[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<RankedZone | null>(null);
  const byZone = useRef<Record<string, RankedZone>>({});

  useEffect(() => {
    byZone.current = Object.fromEntries(results.map((r) => [r.zone_id, r]));
    if (!container.current) return;

    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "bg", type: "background", paint: { "background-color": "#eef2f5" } }],
      },
      center: [-0.6, 44.82],
      zoom: 10.3,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      try {
        const geo: GeoJSON.FeatureCollection = await (
          await fetch("/api/communes", { cache: "no-store" })
        ).json();
        // Injecte le score personnalisé de chaque zone dans le geojson.
        geo.features = geo.features.map((f) => {
          const code = (f.properties as { code_commune: string }).code_commune;
          const r = byZone.current[code];
          return {
            ...f,
            properties: {
              ...f.properties,
              _score: r?.score ?? null,
              _has: r != null,
              _within: r?.within_budget ?? null,
            },
          };
        });
        map.addSource("z", { type: "geojson", data: geo });
        map.addLayer({
          id: "z-fill", type: "fill", source: "z",
          paint: {
            "fill-color": [
              "case", ["==", ["get", "_has"], true],
              ["interpolate", ["linear"], ["get", "_score"], ...RAMP], "#ccc",
            ] as unknown as maplibregl.ExpressionSpecification,
            "fill-opacity": 0.8,
          },
        });
        // Contour rouge pour les zones hors budget.
        map.addLayer({
          id: "z-line", type: "line", source: "z",
          paint: {
            "line-color": ["case", ["==", ["get", "_within"], false], "#b30000", "#ffffff"],
            "line-width": ["case", ["==", ["get", "_within"], false], 2.2, 1],
          } as unknown as maplibregl.LineLayerSpecification["paint"],
        });
        map.addLayer({
          id: "z-label", type: "symbol", source: "z",
          layout: { "text-field": ["get", "nom_commune"], "text-size": 12 },
          paint: { "text-color": "#1a1a1a", "text-halo-color": "#fff", "text-halo-width": 1.2 },
        });
        map.on("click", "z-fill", (e) => {
          const code = (e.features?.[0]?.properties as { code_commune?: string })?.code_commune;
          if (code) setSelected(byZone.current[code] ?? null);
        });
        map.on("mouseenter", "z-fill", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "z-fill", () => { map.getCanvas().style.cursor = ""; });
      } catch {
        /* la liste reste utilisable sans la carte */
      }
    });
    return () => map.remove();
  }, [results]);

  const eur = (n: number) => Math.round(n).toLocaleString("fr-FR");

  return (
    <div className="results-map">
      <div ref={container} className="rmap" />
      <div className="legend">
        <strong>Score personnalisé</strong>
        <div className="gradient">
          <span>0</span>
          <span className="bar score-bar" />
          <span>100</span>
        </div>
        <small>Contour rouge = bien-type au-dessus du budget</small>
      </div>
      {selected && (
        <aside className="rpopup">
          <button className="close" onClick={() => setSelected(null)}>×</button>
          <h3>#{selected.rank} · {selected.nom_commune}</h3>
          <p className="rbig">{selected.score}/100</p>
          {selected.bien_type_price != null && (
            <p className={selected.within_budget ? "ok" : "ko"}>
              Bien-type ~ {eur(selected.bien_type_price)} €
              {selected.within_budget ? " ✓ dans le budget" : " ✗ au-dessus du budget"}
            </p>
          )}
          <ul className="rbreak">
            {[...selected.breakdown].sort((a, b) => b.contribution - a.contribution).map((b) => (
              <li key={b.criterion}>
                <span>{b.label}</span>
                <span>{b.contribution} pts</span>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
