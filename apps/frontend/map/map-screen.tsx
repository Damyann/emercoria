"use client";

import { MapLibreWorldMap } from "./maplibre-world-map";
import type { GeoOverlayRegion } from "./types";

type MapScreenProps = {
  regions: GeoOverlayRegion[];
};

export function MapScreen({ regions }: MapScreenProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#08111b",
        color: "#edf6ff",
        padding: "24px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <h1 style={{ margin: 0, marginBottom: 10, fontSize: 40 }}>MapLibre World Overlay</h1>
        <p style={{ marginTop: 0, marginBottom: 18, color: "#a5bfd8" }}>
          Бяла суша, син океан и всички JSON региони от <code>apps/frontend/map/regions</code> отгоре.
        </p>

        <MapLibreWorldMap regions={regions} />
      </div>
    </main>
  );
}
