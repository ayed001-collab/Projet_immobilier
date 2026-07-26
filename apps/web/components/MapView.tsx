"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CommuneProps } from "@/lib/api";

// Échelle de couleurs séquentielle (prix au m²). Interpolation MapLibre.
const COLOR_STOPS: [number, string][] = [
  [3000, "#fee5d9"],
  [3500, "#fcae91"],
  [4000, "#fb6a4a"],
  [4500, "#de2d26"],
  [5000, "#a50f15"],
];

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<CommuneProps | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Style minimal, SANS fond de carte externe (fonctionne hors-ligne).
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#eef2f5" },
          },
        ],
      },
      center: [-0.6, 44.82],
      zoom: 10.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      try {
        const res = await fetch("/api/communes", { cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const geojson = await res.json();

        map.addSource("communes", { type: "geojson", data: geojson });

        map.addLayer({
          id: "communes-fill",
          type: "fill",
          source: "communes",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "has_data"], true],
              [
                "interpolate",
                ["linear"],
                ["get", "prix_m2"],
                ...COLOR_STOPS.flat(),
              ],
              "#cccccc",
            ],
            "fill-opacity": 0.75,
          },
        });

        map.addLayer({
          id: "communes-outline",
          type: "line",
          source: "communes",
          paint: { "line-color": "#ffffff", "line-width": 1 },
        });

        map.addLayer({
          id: "communes-label",
          type: "symbol",
          source: "communes",
          layout: {
            "text-field": ["get", "nom_commune"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#1a1a1a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.2,
          },
        });

        map.on("click", "communes-fill", (e) => {
          const f = e.features?.[0];
          if (f) setSelected(f.properties as CommuneProps);
        });
        map.on("mouseenter", "communes-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "communes-fill", () => {
          map.getCanvas().style.cursor = "";
        });
      } catch (err) {
        setError(
          "Impossible de charger les données. La Data Factory a-t-elle été exécutée et l'API démarrée ?"
        );
        // eslint-disable-next-line no-console
        console.error(err);
      }
    });

    return () => map.remove();
  }, []);

  return (
    <div className="map-wrap">
      <div ref={mapContainer} className="map" />

      <div className="legend">
        <strong>Prix au m² (DVF)</strong>
        <ul>
          {COLOR_STOPS.map(([v, c]) => (
            <li key={v}>
              <span className="swatch" style={{ background: c }} />
              {v.toLocaleString("fr-FR")} €/m²
            </li>
          ))}
          <li>
            <span className="swatch" style={{ background: "#cccccc" }} />
            Données insuffisantes
          </li>
        </ul>
      </div>

      {error && <div className="banner error">{error}</div>}

      {selected && (
        <aside className="fiche">
          <button className="close" onClick={() => setSelected(null)}>
            ×
          </button>
          <h2>{selected.nom_commune}</h2>
          {selected.has_data ? (
            <>
              <p className="price">
                {Number(selected.prix_m2).toLocaleString("fr-FR")} €/m²
              </p>
              <dl>
                <dt>Source</dt>
                <dd>{selected.source}</dd>
                <dt>Période</dt>
                <dd>{selected.periode}</dd>
                <dt>Observations</dt>
                <dd>{selected.obs_count} transactions</dd>
                <dt>Confiance des données</dt>
                <dd>
                  {selected.confidence_level} ({selected.confidence_score}%)
                </dd>
                <dt>Dernière mise à jour</dt>
                <dd>{selected.derniere_maj?.slice(0, 10)}</dd>
              </dl>
              <p className="method">
                Médiane des prix au m² des ventes de logements, après filtrage
                des valeurs aberrantes. Chiffre <strong>mesuré</strong> (DVF).
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
