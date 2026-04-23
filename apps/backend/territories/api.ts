import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { JwtAuthGuard, RequireAccountTypes } from '../auth/guard';
import { TerritoriesLogic } from './logic';

@Controller('territories')
@UseGuards(JwtAuthGuard)
export class TerritoriesApi {
  constructor(private readonly logic:TerritoriesLogic){}

  @Get('map')
  @RequireAccountTypes(AccountType.ADMIN, AccountType.PLAYER)
  map(){
    return this.logic.map();
  }

  @Get('history/:regionCode')
  @RequireAccountTypes(AccountType.ADMIN)
  history(@Param('regionCode') regionCode:string){
    return this.logic.history(regionCode);
  }
}
