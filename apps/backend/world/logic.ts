import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';

@Injectable()
export class WorldLogic {
  async map(){
    const season=await prisma.season.findFirst({
      where:{ isActive:true },
      orderBy:{ startsAt:'desc' },
      select:{ id:true, name:true, startsAt:true, endsAt:true },
    });

    const [regions, states]=await Promise.all([
      prisma.region.findMany({
        where:{ isActive:true, country:{ isActive:true } },
        orderBy:[{ country:{ code:'asc' } },{ name:'asc' }],
        select:{
          id:true,
          code:true,
          name:true,
          geometryType:true,
          geometryJson:true,
          country:{ select:{ id:true, code:true, name:true, baseColor:true } },
          neighbors:{
            orderBy:{ neighbor:{ code:'asc' } },
            select:{
              neighbor:{
                select:{
                  id:true,
                  code:true,
                  name:true,
                  country:{ select:{ id:true, code:true, name:true, baseColor:true } }
                }
              }
            }
          },
        },
      }),
      season?prisma.seasonRegionState.findMany({
        where:{ seasonId:season.id },
        select:{
          regionId:true,
          currentColor:true,
          currentOwnerCountryId:true,
          capturedAt:true,
          currentOwnerCountry:{ select:{ id:true, code:true, name:true, baseColor:true } },
        },
      }):Promise.resolve([]),
    ]);

    const stateByRegionId=new Map(states.map(state=>[state.regionId,state]));

    return {
      season,
      regions:regions.map(region=>{
        const state=stateByRegionId.get(region.id)||null;
        const currentOwner=state?.currentOwnerCountry||null;
        return {
          id:region.id,
          code:region.code,
          name:region.name,
          countryId:region.country.id,
          countryCode:region.country.code,
          countryName:region.country.name,
          baseColor:region.country.baseColor,
          color:state?.currentColor||region.country.baseColor,
          ownerId:state?.currentOwnerCountryId!=null?String(state.currentOwnerCountryId):null,
          ownerCode:currentOwner?.code||null,
          ownerName:currentOwner?.name||null,
          capturedAt:state?.capturedAt||null,
          geometryType:region.geometryType,
          geometry:region.geometryJson,
          neighbors:region.neighbors.map(link=>({
            id:link.neighbor.id,
            code:link.neighbor.code,
            name:link.neighbor.name,
            countryId:link.neighbor.country.id,
            countryCode:link.neighbor.country.code,
            countryName:link.neighbor.country.name,
          })),
        };
      }),
    };
  }
}
