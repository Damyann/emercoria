'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapScreen } from "../../map/map-screen";
import type { GeoOverlayRegion, WorldMapResponse } from "../../map/types";

const API_BASE=(process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/,"")||"http://localhost:3001/api");
const STORAGE_KEY="emercoria.session";

function readToken(){
  if(typeof window==="undefined") return null;
  try{return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)||"null")?.accessToken||null;}catch{return null;}
}
function normalizeRegion(region:any):GeoOverlayRegion{
  const code=String(region.code||region.slug||region.id);
  return {
    id:Number(region.id),
    code,
    name:String(region.name||code),
    resource:region.resource==null?null:String(region.resource),
    countryId:Number(region.countryId),
    countryCode:String(region.countryCode||""),
    countryName:String(region.countryName||""),
    baseColor:String(region.baseColor||region.countryColor||region.color||"#64748B"),
    color:String(region.color||region.baseColor||region.countryColor||"#64748B"),
    originalOwnerCountryId:region.originalOwnerCountryId!=null?Number(region.originalOwnerCountryId):region.countryId!=null?Number(region.countryId):null,
    originalOwnerCountryCode:region.originalOwnerCountryCode??region.countryCode??null,
    originalOwnerCountryName:region.originalOwnerCountryName??region.countryName??null,
    currentOwnerCountryId:region.currentOwnerCountryId??region.ownerId??region.countryId??null,
    currentOwnerCountryCode:region.currentOwnerCountryCode??region.ownerCode??region.countryCode??null,
    currentOwnerCountryName:region.currentOwnerCountryName??region.ownerName??region.countryName??null,
    capturedAt:region.capturedAt??null,
    geometryType:String(region.geometryType||region.geometry?.type||"Polygon"),
    geometry:{ type:(region.geometry?.type||region.geometryType||"Polygon"), coordinates:region.geometry?.coordinates??region.geometry },
    neighbors:Array.isArray(region.neighbors)?region.neighbors.map((neighbor:any)=>({
      id:Number(neighbor.id),
      code:String(neighbor.code||neighbor.slug||neighbor.id),
      name:String(neighbor.name||neighbor.code||neighbor.id),
      countryId:Number(neighbor.countryId),
      countryCode:String(neighbor.countryCode||""),
      countryName:String(neighbor.countryName||""),
    })):[]
  };
}
async function fetchMap(token:string){
  const endpoints=["/territories/map","/world/map"];
  let lastError:Error|null=null;
  for(const endpoint of endpoints){
    try{
      const res=await fetch(`${API_BASE}${endpoint}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      if(res.status===401||res.status===403) return { unauthorized:true as const };
      const data=await res.json().catch(()=>null) as WorldMapResponse | null;
      if(!res.ok||!data) throw new Error("Неуспешно зареждане на картата.");
      return { unauthorized:false as const, data };
    }catch(err){
      lastError=err instanceof Error?err:new Error("Неуспешно зареждане на картата.");
    }
  }
  throw lastError||new Error("Неуспешно зареждане на картата.");
}

export default function MapPage(){
  const router=useRouter();
  const [regions,setRegions]=useState<GeoOverlayRegion[]>([]);
  const [seasonName,setSeasonName]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{
    const token=readToken();
    if(!token){router.replace("/login");return;}
    let cancelled=false;
    (async()=>{
      try{
        setLoading(true);setError(null);
        const result=await fetchMap(token);
        if(result.unauthorized){
          window.sessionStorage.removeItem(STORAGE_KEY);
          router.replace("/login");
          return;
        }
        if(cancelled) return;
        setSeasonName(result.data?.season?.name||null);
        setRegions((result.data?.regions||[]).map(normalizeRegion));
      }catch(err){
        if(!cancelled) setError(err instanceof Error?err.message:"Неуспешно зареждане на картата.");
      }finally{
        if(!cancelled) setLoading(false);
      }
    })();
    return ()=>{cancelled=true;};
  },[router]);

  return <MapScreen regions={regions} seasonName={seasonName} loading={loading} error={error} />;
}
