'use client';

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoOverlayRegion } from "./types";

type MapLibreWorldMapProps={
  regions:GeoOverlayRegion[];
  hoveredCode:string|null;
  selectedCode:string|null;
  onHoverCode:(code:string|null)=>void;
  onSelectCode:(code:string|null)=>void;
};

const WORLD_LAND_URL="https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const EMPTY_FC={ type:"FeatureCollection" as const, features:[] as any[] };

const polygonCoords=(geometry:GeoOverlayRegion["geometry"])=>geometry.type==="MultiPolygon"?geometry.coordinates:[geometry.coordinates];
const featureOf=(region:GeoOverlayRegion, color?:string)=>({
  type:"Feature" as const,
  id:region.code,
  properties:{
    code:region.code,
    name:region.name,
    countryCode:region.countryCode,
    countryName:region.countryName,
    color:color||region.color,
  },
  geometry:{ type:region.geometry.type, coordinates:region.geometry.coordinates }
});
const fcOf=(regions:GeoOverlayRegion[], color?:string)=>({
  type:"FeatureCollection" as const,
  features:regions.map(region=>featureOf(region,color))
});

function computeBounds(regions:GeoOverlayRegion[]):LngLatBoundsLike|null{
  let minLng=Infinity,maxLng=-Infinity,minLat=Infinity,maxLat=-Infinity;
  for(const region of regions){
    for(const polygon of polygonCoords(region.geometry) as any[]){
      for(const ring of polygon as any[]){
        for(const point of ring as any[]){
          const lng=Number(point?.[0]),lat=Number(point?.[1]);
          if(Number.isNaN(lng)||Number.isNaN(lat)) continue;
          if(lng<minLng) minLng=lng;
          if(lng>maxLng) maxLng=lng;
          if(lat<minLat) minLat=lat;
          if(lat>maxLat) maxLat=lat;
        }
      }
    }
  }
  return Number.isFinite(minLng)?[[minLng,minLat],[maxLng,maxLat]]:null;
}

const getSource=(map:MapLibreMap,id:string)=>map.getSource(id) as GeoJSONSource|undefined;
const setSourceData=(map:MapLibreMap,id:string,data:any)=>{const source=getSource(map,id);if(source) source.setData(data);};

function addFillAndLine(map:MapLibreMap, source:string, fillId:string, lineId:string, fillColor:any, fillOpacity:number, lineColor:string, lineWidth:number){
  map.addLayer({ id:fillId, type:"fill", source, paint:{ "fill-color":fillColor, "fill-opacity":fillOpacity } });
  map.addLayer({ id:lineId, type:"line", source, paint:{ "line-color":lineColor, "line-width":lineWidth } });
}

export function MapLibreWorldMap({ regions, hoveredCode, selectedCode, onHoverCode, onSelectCode }: MapLibreWorldMapProps){
  const containerRef=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<MapLibreMap|null>(null);
  const readyRef=useRef(false);

  const byCode=useMemo(()=>new Map(regions.map(region=>[region.code,region])),[regions]);
  const hoveredRegion=hoveredCode?byCode.get(hoveredCode)||null:null;
  const selectedRegion=selectedCode?byCode.get(selectedCode)||null:null;
  const hoverNeighborRegions=useMemo(()=>{
    if(!hoveredRegion||selectedRegion) return [];
    return hoveredRegion.neighbors.map(n=>byCode.get(n.code)).filter(Boolean) as GeoOverlayRegion[];
  },[hoveredRegion,selectedRegion,byCode]);
  const selectedNeighborRegions=useMemo(()=>{
    if(!selectedRegion) return [];
    return selectedRegion.neighbors.map(n=>byCode.get(n.code)).filter(Boolean) as GeoOverlayRegion[];
  },[selectedRegion,byCode]);

  const baseFC=useMemo(()=>fcOf(regions),[regions]);
  const hoverFC=useMemo(()=>hoveredRegion&&!selectedRegion?fcOf([hoveredRegion],"#FFFFFF"):EMPTY_FC,[hoveredRegion,selectedRegion]);
  const hoverNeighborsFC=useMemo(()=>fcOf(hoverNeighborRegions,"#FACC15"),[hoverNeighborRegions]);
  const selectedFC=useMemo(()=>selectedRegion?fcOf([selectedRegion],"#FFFFFF"):EMPTY_FC,[selectedRegion]);
  const selectedNeighborsFC=useMemo(()=>fcOf(selectedNeighborRegions,"#F59E0B"),[selectedNeighborRegions]);

  const syncData=()=>{
    const map=mapRef.current;
    if(!map||!readyRef.current||!map.isStyleLoaded()) return;
    setSourceData(map,"overlays",baseFC as any);
    setSourceData(map,"hover-neighbors",hoverNeighborsFC as any);
    setSourceData(map,"selected-neighbors",selectedNeighborsFC as any);
    setSourceData(map,"hover-region",hoverFC as any);
    setSourceData(map,"selected-region",selectedFC as any);
  };

  useEffect(()=>{
    if(!containerRef.current||mapRef.current) return;

    const map=new maplibregl.Map({
      container:containerRef.current,
      style:{
        version:8,
        sources:{
          "world-land":{ type:"geojson", data:WORLD_LAND_URL },
          "overlays":{ type:"geojson", data:baseFC as any },
          "hover-neighbors":{ type:"geojson", data:EMPTY_FC as any },
          "selected-neighbors":{ type:"geojson", data:EMPTY_FC as any },
          "hover-region":{ type:"geojson", data:EMPTY_FC as any },
          "selected-region":{ type:"geojson", data:EMPTY_FC as any }
        },
        layers:[
          { id:"ocean", type:"background", paint:{ "background-color":"#8fd2ff" } },
          { id:"world-land-fill", type:"fill", source:"world-land", paint:{ "fill-color":"#ffffff","fill-opacity":1 } },
          { id:"world-land-line", type:"line", source:"world-land", paint:{ "line-color":"#d8e1ea","line-width":0.7 } },
          { id:"overlay-fill", type:"fill", source:"overlays", paint:{ "fill-color":["get","color"], "fill-opacity":0.74 } },
          { id:"overlay-line", type:"line", source:"overlays", paint:{ "line-color":"#E2E8F0","line-width":1.0 } }
        ]
      },
      center:[25,45],
      zoom:5.2,
      attributionControl:false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass:true, visualizePitch:true }),"top-right");

    map.on("load",()=>{
      readyRef.current=true;
      addFillAndLine(map,"hover-neighbors","hover-neighbors-fill","hover-neighbors-line","#FACC15",0.86,"#92400E",1.8);
      addFillAndLine(map,"selected-neighbors","selected-neighbors-fill","selected-neighbors-line","#F59E0B",0.9,"#7C2D12",2.0);
      addFillAndLine(map,"hover-region","hover-region-fill","hover-region-line","#FFFFFF",0.92,"#111827",2.2);
      addFillAndLine(map,"selected-region","selected-region-fill","selected-region-line","#FFFFFF",0.98,"#111827",2.8);

      const pick=(point:maplibregl.PointLike)=>{
        const features=map.queryRenderedFeatures(point,{layers:["selected-region-fill","hover-region-fill","overlay-fill"]});
        const feature=features?.[0];
        const code=String(feature?.properties?.code||feature?.id||"");
        return code||null;
      };

      map.on("mouseenter","overlay-fill",()=>{ map.getCanvas().style.cursor="pointer"; });
      map.on("mousemove","overlay-fill",(event)=>{
        const code=pick(event.point);
        onHoverCode(code);
      });
      map.on("mouseleave","overlay-fill",()=>{
        map.getCanvas().style.cursor="";
        onHoverCode(null);
      });
      map.on("click","overlay-fill",(event)=>{
        const code=pick(event.point);
        onSelectCode(code);
      });
      map.on("click",(event)=>{
        const code=pick(event.point);
        if(!code) onSelectCode(null);
      });

      const bounds=computeBounds(regions);
      if(bounds) map.fitBounds(bounds,{ padding:32, duration:0, maxZoom:6.5 });
      syncData();
    });

    mapRef.current=map;
    return ()=>{
      readyRef.current=false;
      map.remove();
      mapRef.current=null;
    };
  },[]);

  useEffect(()=>{ syncData(); },[baseFC,hoverFC,hoverNeighborsFC,selectedFC,selectedNeighborsFC]);

  return <div style={{ borderRadius:24, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 25px 80px rgba(0,0,0,0.35)" }}>
    <div ref={containerRef} style={{ width:"100%", height:"min(78vh,860px)", background:"#8fd2ff" }} />
  </div>;
}
