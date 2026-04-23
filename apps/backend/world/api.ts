import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { JwtAuthGuard, RequireAccountTypes } from '../auth/guard';
import { WorldLogic } from './logic';

@Controller('world')
@UseGuards(JwtAuthGuard)
export class WorldApi {
  constructor(private readonly logic: WorldLogic) {}

  @Get('map')
  @RequireAccountTypes(AccountType.ADMIN, AccountType.PLAYER)
  map(){
    return this.logic.map();
  }
}
