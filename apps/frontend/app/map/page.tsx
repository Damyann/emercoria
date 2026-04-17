import { promises as fs } from "node:fs";
import path from "node:path";
import { MapScreen } from "../../map/map-screen";
import type { GeoOverlayRegion } from "../../map/types";

async function dirExists(dirPath: string) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveRegionsDir() {
  const candidates = [
    path.join(process.cwd(), "map", "regions"),
    path.join(process.cwd(), "apps", "frontend", "map", "regions"),
    path.join(process.cwd(), "apps/frontend/map/regions"),
  ];

  for (const candidate of candidates) {
    if (await dirExists(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRingSet(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value) || value.length === 0) return [];

  const outerRing = value[0];
  if (!Array.isArray(outerRing)) return [];

  return outerRing
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (Number.isNaN(lng) || Number.isNaN(lat)) return null;
      return [lng, lat] as [number, number];
    })
    .filter((point): point is [number, number] => point !== null);
}

function extractPolygons(geometry: { type?: string; coordinates?: unknown }): Array<Array<[number, number]>> {
  if (!geometry.type || !geometry.coordinates) return [];

  if (geometry.type === "Polygon") {
    return [toRingSet(geometry.coordinates)];
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates
      .map((polygon) => toRingSet(polygon))
      .filter((polygon) => polygon.length > 0);
  }

  return [];
}

function normalizeGeoJson(input: unknown, fileName: string, index: number): GeoOverlayRegion | null {
  if (!input || typeof input !== "object") return null;

  const featureCollection = input as {
    features?: Array<{
      properties?: Record<string, unknown>;
      geometry?: {
        type?: string;
        coordinates?: unknown;
      };
    }>;
  };

  const feature = featureCollection.features?.[0];
  if (!feature?.properties || !feature.geometry) return null;

  const name =
    typeof feature.properties.shapeName === "string"
      ? feature.properties.shapeName
      : typeof feature.properties.name === "string"
        ? feature.properties.name
        : `${fileName.replace(/\.json$/i, "")}-${index + 1}`;

  const polygons = extractPolygons(feature.geometry);
  if (polygons.length === 0) return null;

  return {
    id: slugify(name || fileName),
    fileName,
    name,
    iso: typeof feature.properties.shapeISO === "string" ? feature.properties.shapeISO : null,
    group: typeof feature.properties.shapeGroup === "string" ? feature.properties.shapeGroup : null,
    shapeType: typeof feature.properties.shapeType === "string" ? feature.properties.shapeType : null,
    polygons,
  };
}

async function loadOverlayRegions(): Promise<GeoOverlayRegion[]> {
  const regionsDir = await resolveRegionsDir();

  let files: string[] = [];
  try {
    files = (await fs.readdir(regionsDir)).filter((file) => file.toLowerCase().endsWith(".json"));
  } catch {
    return [];
  }

  const loaded = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(regionsDir, file), "utf8");
      return { file, data: JSON.parse(raw) as unknown };
    }),
  );

  return loaded
    .flatMap(({ file, data }, index) => {
      const region = normalizeGeoJson(data, file, index);
      return region ? [region] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function MapPage() {
  const regions = await loadOverlayRegions();
  return <MapScreen regions={regions} />;
}
