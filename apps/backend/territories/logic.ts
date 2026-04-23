import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';

@Injectable()
export class TerritoriesLogic {
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
          resource:true,
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
                  country:{ select:{ id:true, code:true, name:true } }
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
          resource:region.resource,
          countryId:region.country.id,
          countryCode:region.country.code,
          countryName:region.country.name,
          originalOwnerCountryId:region.country.id,
          originalOwnerCountryCode:region.country.code,
          originalOwnerCountryName:region.country.name,
          currentOwnerCountryId:state?.currentOwnerCountryId??region.country.id,
          currentOwnerCountryCode:currentOwner?.code||region.country.code,
          currentOwnerCountryName:currentOwner?.name||region.country.name,
          countryColor:region.country.baseColor,
          color:state?.currentColor||region.country.baseColor,
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

  async history(regionCode:string){
    const code=regionCode.trim().toLowerCase();
    const region=await prisma.region.findUnique({
      where:{ code },
      select:{ id:true, code:true, name:true, country:{ select:{ id:true, code:true, name:true } } },
    });
    if(!region) throw new NotFoundException('Region not found.');

    const events=await prisma.regionOwnershipHistory.findMany({
      where:{ regionId:region.id },
      orderBy:{ changedAt:'desc' },
      select:{
        changedAt:true,
        fromColor:true,
        toColor:true,
        reason:true,
        season:{ select:{ name:true } },
        fromOwnerCountry:{ select:{ id:true, code:true, name:true } },
        toOwnerCountry:{ select:{ id:true, code:true, name:true } },
      },
    });

    return {
      region:{
        id:region.id,
        code:region.code,
        name:region.name,
        originalOwnerCountry:region.country,
      },
      events:events.map(event=>({
        season:event.season.name,
        changedAt:event.changedAt,
        fromColor:event.fromColor,
        toColor:event.toColor,
        reason:event.reason,
        fromOwnerCountry:event.fromOwnerCountry?{
          id:event.fromOwnerCountry.id,
          code:event.fromOwnerCountry.code,
          name:event.fromOwnerCountry.name,
        }:null,
        toOwnerCountry:event.toOwnerCountry?{
          id:event.toOwnerCountry.id,
          code:event.toOwnerCountry.code,
          name:event.toOwnerCountry.name,
        }:null,
      })),
    };
  }
}
