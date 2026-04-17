"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoOverlayRegion } from "./types";

declare global {
  interface Window {
    google?: typeof google;
    __initGoogleWorldMap?: () => void;
  }
}

type GoogleWorldMapProps = {
  regions: GeoOverlayRegion[];
};

type PolygonEntry = {
  regionId: string;
  polygon: google.maps.Polygon;
};

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#8fd2ff" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
];

export function GoogleWorldMap({ regions }: GoogleWorldMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const polygonsRef = useRef<PolygonEntry[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedId) ?? null,
    [regions, selectedId],
  );

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      setLoadError("Липсва NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      return;
    }

    if (window.google?.maps) {
      setApiReady(true);
      return;
    }

    const existing = document.getElementById("google-maps-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setApiReady(true));
      existing.addEventListener("error", () => setLoadError("Google Maps script failed to load"));
      return;
    }

    window.__initGoogleWorldMap = () => setApiReady(true);

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__initGoogleWorldMap`;
    script.onerror = () => setLoadError("Google Maps script failed to load");
    document.head.appendChild(script);

    return () => {
      window.__initGoogleWorldMap = undefined;
    };
  }, []);

  useEffect(() => {
    if (!apiReady || !window.google?.maps || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 10 },
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      disableDefaultUI: true,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
      styles: MAP_STYLE,
      backgroundColor: "#8fd2ff",
    });

    const infoWindow = new window.google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    const bounds = new window.google.maps.LatLngBounds();

    polygonsRef.current.forEach(({ polygon }) => polygon.setMap(null));
    polygonsRef.current = [];

    for (const region of regions) {
      for (const polygonPoints of region.polygons) {
        if (polygonPoints.length === 0) continue;

        const path = polygonPoints.map(([lng, lat]) => ({ lng, lat }));
        path.forEach((point) => bounds.extend(point));

        const polygon = new window.google.maps.Polygon({
          paths: path,
          strokeColor: "#eaf5ff",
          strokeOpacity: 0.95,
          strokeWeight: 1.5,
          fillColor: "#2f73ba",
          fillOpacity: 0.72,
          clickable: true,
        });

        polygon.setMap(map);
        polygonsRef.current.push({ regionId: region.id, polygon });

        polygon.addListener("mouseover", () => {
          polygon.setOptions({
            fillColor: "#58a8ff",
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          });
        });

        polygon.addListener("mouseout", () => {
          const isSelected = region.id === selectedId;
          polygon.setOptions({
            fillColor: isSelected ? "#58a8ff" : "#2f73ba",
            fillOpacity: isSelected ? 0.9 : 0.72,
            strokeColor: "#eaf5ff",
            strokeWeight: isSelected ? 2 : 1.5,
          });
        });

        polygon.addListener("click", (event: google.maps.MapMouseEvent) => {
          setSelectedId(region.id);

          const content = `
            <div style="min-width:220px;font-family:Arial,sans-serif;">
              <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${region.name}</div>
              <div style="font-size:13px;line-height:1.5;">
                <div><strong>File:</strong> ${region.fileName}</div>
                <div><strong>ID:</strong> ${region.id}</div>
                <div><strong>ISO:</strong> ${region.iso ?? "-"}</div>
                <div><strong>Group:</strong> ${region.group ?? "-"}</div>
                <div><strong>Shape type:</strong> ${region.shapeType ?? "-"}</div>
              </div>
            </div>
          `;

          infoWindow.setContent(content);
          if (event.latLng) {
            infoWindow.setPosition(event.latLng);
            infoWindow.open(map);
          }
        });
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 80);
    }

    const idleListener = map.addListener("idle", () => {
      if (map.getZoom() && (map.getZoom() as number) < 3) {
        map.setZoom(3);
      }
    });

    return () => {
      idleListener.remove();
      polygonsRef.current.forEach(({ polygon }) => polygon.setMap(null));
      polygonsRef.current = [];
      infoWindow.close();
    };
  }, [apiReady, regions, selectedId]);

  useEffect(() => {
    for (const entry of polygonsRef.current) {
      const isSelected = entry.regionId === selectedId;
      entry.polygon.setOptions({
        fillColor: isSelected ? "#58a8ff" : "#2f73ba",
        fillOpacity: isSelected ? 0.9 : 0.72,
        strokeColor: "#eaf5ff",
        strokeWeight: isSelected ? 2 : 1.5,
      });
    }
  }, [selectedId]);

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
          ref={mapRef}
          style={{
            width: "100%",
            minHeight: 760,
            borderRadius: 20,
            overflow: "hidden",
            background: "#8fd2ff",
          }}
        />

        {loadError ? (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(148, 39, 39, 0.18)",
              border: "1px solid rgba(255, 120, 120, 0.25)",
              color: "#ffd1d1",
            }}
          >
            {loadError}
          </div>
        ) : null}
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
          Zoom става от Google Maps. Drag става с натиснат ляв бутон. Отгоре се рисуват всички GeoJSON файлове от папката.
        </p>
      </aside>
    </div>
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
