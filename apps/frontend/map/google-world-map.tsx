'use client';

import { MapLibreWorldMap } from "./maplibre-world-map";
import type { GeoOverlayRegion } from "./types";

type GoogleWorldMapProps={
  regions:GeoOverlayRegion[];
  hoveredCode:string|null;
  selectedCode:string|null;
  onHoverCode:(code:string|null)=>void;
  onSelectCode:(code:string|null)=>void;
};

export function GoogleWorldMap(props:GoogleWorldMapProps){
  return <MapLibreWorldMap {...props} />;
}
