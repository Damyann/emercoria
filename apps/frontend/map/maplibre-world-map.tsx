"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoOverlayRegion } from "./types";

type MapLibreWorldMapProps = {
  regions: GeoOverlayRegion[];
};

function buildFeatureCollection(regions: GeoOverlayRegion[]) {
  return {
    type: "FeatureCollection" as const,
    features: regions.map((region) => ({
      type: "Feature" as const,
      id: region.id,
      properties: {
        id: region.id,
        fileName: region.fileName,
        name: region.name,
        iso: region.iso ?? "",
        group: region.group ?? "",
        shapeType: region.shapeType ?? "",
      },
      geometry: {
        type: region.polygons.length > 1 ? "MultiPolygon" : "Polygon",
        coordinates:
          region.polygons.length > 1
            ? region.polygons.map((polygon) => [polygon.map(([lng, lat]) => [lng, lat])])
            : [polygonToCoords(region.polygons[0] ?? [])],
      },
    })),
  };
}

function polygonToCoords(polygon: Array<[number, number]>) {
  return polygon.map(([lng, lat]) => [lng, lat]);
}

function computeBounds(regions: GeoOverlayRegion[]): LngLatBoundsLike | null {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const region of regions) {
    for (const polygon of region.polygons) {
      for (const [lng, lat] of polygon) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  if (!Number.isFinite(minLng)) return null;

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

const WORLD_LAND_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

export function MapLibreWorldMap({ regions }: MapLibreWorldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedId) ?? null,
    [regions, selectedId],
  );

  const featureCollection = useMemo(() => buildFeatureCollection(regions), [regions]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "world-land": {
            type: "geojson",
            data: WORLD_LAND_URL,
          },
          overlays: {
            type: "geojson",
            data: featureCollection as any,
          },
        },
        layers: [
          {
            id: "ocean",
            type: "background",
            paint: {
              "background-color": "#8fd2ff",
            },
          },
          {
            id: "world-land-fill",
            type: "fill",
            source: "world-land",
            paint: {
              "fill-color": "#ffffff",
              "fill-opacity": 1,
            },
          },
          {
            id: "world-land-line",
            type: "line",
            source: "world-land",
            paint: {
              "line-color": "#d8e1ea",
              "line-width": 0.7,
            },
          },
          {
            id: "overlay-fill",
            type: "fill",
            source: "overlays",
            paint: {
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#58a8ff",
                ["boolean", ["feature-state", "hover"], false],
                "#58a8ff",
                "#2f73ba",
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                0.92,
                ["boolean", ["feature-state", "hover"], false],
                0.9,
                0.74,
              ],
            },
          },
          {
            id: "overlay-line",
            type: "line",
            source: "overlays",
            paint: {
              "line-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#ffffff",
                ["boolean", ["feature-state", "hover"], false],
                "#ffffff",
                "#d9ecff",
              ],
              "line-width": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                2,
                ["boolean", ["feature-state", "hover"], false],
                2,
                1.2,
              ],
            },
          },
        ],
      },
      center: [10, 30],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 12,
      dragRotate: false,
      touchPitch: false,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "280px",
    });

    map.on("load", () => {
      map.getCanvas().style.cursor = "grab";
      setIsMapReady(true);

      const bounds = computeBounds(regions);
      if (bounds && regions.length > 0) {
        map.fitBounds(bounds, { padding: 80, duration: 0 });
      }
    });

    map.on("mouseenter", "overlay-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "overlay-fill", () => {
      map.getCanvas().style.cursor = "grab";
      if (hoveredIdRef.current) {
        map.setFeatureState({ source: "overlays", id: hoveredIdRef.current }, { hover: false });
        hoveredIdRef.current = null;
      }
      popupRef.current?.remove();
    });

    map.on("mousemove", "overlay-fill", (event) => {
      const feature = event.features?.[0];
      if (!feature || feature.id == null) return;

      const featureId = String(feature.id);

      if (hoveredIdRef.current && hoveredIdRef.current !== featureId) {
        map.setFeatureState({ source: "overlays", id: hoveredIdRef.current }, { hover: false });
      }

      hoveredIdRef.current = featureId;
      map.setFeatureState({ source: "overlays", id: featureId }, { hover: true });

      const name = String(feature.properties?.name ?? "");
      const fileName = String(feature.properties?.fileName ?? "");

      popupRef.current
        ?.setLngLat(event.lngLat)
        .setHTML(
          `<div style="font-family:Arial,sans-serif;">
            <div style="font-size:16px;font-weight:700;margin-bottom:6px;">${name}</div>
            <div style="font-size:12px;color:#5b6b7b;">${fileName}</div>
          </div>`,
        )
        .addTo(map);
    });

    map.on("click", "overlay-fill", (event) => {
      const feature = event.features?.[0];
      if (!feature || feature.id == null) return;
      setSelectedId(String(feature.id));
    });

    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const source = map.getSource("overlays") as GeoJSONSource | undefined;
    if (source) {
      source.setData(featureCollection as any);
    }

    const bounds = computeBounds(regions);
    if (bounds && regions.length > 0) {
      map.fitBounds(bounds, { padding: 80, duration: 0 });
    }
  }, [featureCollection, regions, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    for (const region of regions) {
      map.setFeatureState({ source: "overlays", id: region.id }, { selected: region.id === selectedId });
    }
  }, [regions, selectedId, isMapReady]);

  function resetWorldView() {
    mapRef.current?.easeTo({
      center: [10, 30],
      zoom: 1.5,
      duration: 700,
    });
  }

  function fitOverlayView() {
    const bounds = computeBounds(regions);
    if (!bounds || !mapRef.current) return;
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 700 });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 18,
        alignItems: "start",
      }}
    >
      <section
        style={{
          background: "linear-gradient(180deg, #102236 0%, #0a131f 100%)",
          border: "1px solid #1d3852",
          borderRadius: 28,
          padding: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            minHeight: 760,
            borderRadius: 20,
            overflow: "hidden",
            background: "#8fd2ff",
          }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <ControlButton onClick={resetWorldView}>World view</ControlButton>
          <ControlButton onClick={fitOverlayView}>Fit overlay</ControlButton>
        </div>
      </section>

      <aside
        style={{
          background: "linear-gradient(180deg, #0b1826 0%, #08111b 100%)",
          border: "1px solid #1d3852",
          borderRadius: 24,
          padding: 18,
          minHeight: 280,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 28 }}>
          {selectedRegion ? selectedRegion.name : "Overlay info"}
        </h2>

        <div style={{ display: "grid", gap: 12 }}>
          <InfoRow label="Loaded json" value={String(regions.length)} />
          <InfoRow label="Selected" value={selectedRegion?.id ?? "-"} />
          <InfoRow label="File" value={selectedRegion?.fileName ?? "-"} />
          <InfoRow label="ISO" value={selectedRegion?.iso ?? "-"} />
          <InfoRow label="Shape type" value={selectedRegion?.shapeType ?? "-"} />
        </div>

        <p style={{ color: "#9bb8d3", lineHeight: 1.6, marginTop: 16 }}>
          Това оправя грешката “Style is not done loading.”
        </p>
      </aside>
    </div>
  );
}

function ControlButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid rgba(170, 205, 238, 0.22)",
        background: "rgba(10, 21, 34, 0.9)",
        color: "#eef6ff",
        borderRadius: 14,
        padding: "10px 14px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(18, 31, 48, 0.88)",
        border: "1px solid rgba(112, 158, 204, 0.22)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#89a7c2",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
