'use client';

import { useMemo, useState } from "react";
import { MapLibreWorldMap } from "./maplibre-world-map";
import type { GeoOverlayRegion } from "./types";

type MapScreenProps={regions:GeoOverlayRegion[];seasonName:string|null;loading:boolean;error:string|null;};

export function MapScreen({ regions, seasonName, loading, error }: MapScreenProps){
  const [hoveredCode,setHoveredCode]=useState<string|null>(null);
  const [selectedCode,setSelectedCode]=useState<string|null>(null);
  const byCode=useMemo(()=>new Map(regions.map(region=>[region.code,region])),[regions]);
  const selectedRegion=selectedCode?byCode.get(selectedCode)||null:null;
  const hoveredRegion=!selectedRegion&&hoveredCode?byCode.get(hoveredCode)||null:null;
  const activeRegion=selectedRegion||hoveredRegion||null;

  return <main style={{minHeight:"100vh",background:"#08111b",color:"#edf6ff",padding:"24px",fontFamily:"Inter, Arial, sans-serif"}}>
    <div style={{maxWidth:1700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:18}}>
        <div>
          <h1 style={{margin:0,fontSize:40}}>World Map</h1>
          <p style={{marginTop:10,marginBottom:0,color:"#a5bfd8"}}>Активен сезон: <strong>{seasonName||"няма"}</strong>. Hover показва временни съседи. Click заключва региона и съседите му.</p>
        </div>
      </div>
      {loading?<div style={{padding:"48px 0",color:"#a5bfd8"}}>Зареждане...</div>:error?<div style={{padding:"24px 0",color:"#ffb4b4"}}>{error}</div>:<div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 340px",gap:20,alignItems:"start"}}>
        <MapLibreWorldMap regions={regions} hoveredCode={hoveredCode} selectedCode={selectedCode} onHoverCode={setHoveredCode} onSelectCode={setSelectedCode} />
        <aside style={{position:"sticky",top:24,border:"1px solid rgba(255,255,255,0.08)",borderRadius:24,padding:20,background:"linear-gradient(180deg, rgba(7,25,45,0.96), rgba(3,14,26,0.96))",boxShadow:"0 25px 80px rgba(0,0,0,0.28)"}}>
          <div style={{fontSize:13,textTransform:"uppercase",letterSpacing:1.2,color:"#7fb4eb",marginBottom:10}}>{selectedRegion?"Избран регион":hoveredRegion?"Hover регион":"Информация"}</div>
          {!activeRegion?<div style={{color:"#a5bfd8",lineHeight:1.65}}>Кликни на регион, за да заключиш избора и съседите му. Само с hover съседите се показват временно.</div>:<>
            <div style={{fontSize:28,fontWeight:700,lineHeight:1.2,marginBottom:6}}>{activeRegion.name}</div>
            <div style={{color:"#8ab4df",marginBottom:18}}>{activeRegion.countryName}</div>
            <div style={{display:"grid",gap:10}}>
              <InfoRow label="Region ID" value={String(activeRegion.id)} />
              <InfoRow label="Code" value={activeRegion.code} />
              <InfoRow label="Оригинално е на" value={activeRegion.originalOwnerCountryName||activeRegion.countryName} />
              <InfoRow label="Владее се сега от" value={activeRegion.currentOwnerCountryName||activeRegion.countryName} />
              <InfoRow label="Resource" value={activeRegion.resource||"—"} />
              <InfoRow label="Съседи" value={activeRegion.neighbors.length?activeRegion.neighbors.map(neighbor=>`${neighbor.name} (#${neighbor.id})`).join(", "):"Няма"} />
            </div>
          </>}
        </aside>
      </div>}
    </div>
  </main>;
}
function InfoRow({ label, value }:{label:string;value:string}){
  return <div style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"12px 14px",background:"rgba(255,255,255,0.02)"}}>
    <div style={{fontSize:12,textTransform:"uppercase",letterSpacing:1,color:"#76a6d4",marginBottom:6}}>{label}</div>
    <div style={{fontSize:15,lineHeight:1.55,color:"#edf6ff",wordBreak:"break-word"}}>{value}</div>
  </div>;
}
