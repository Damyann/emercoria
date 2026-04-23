import { InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  var __emercoriaPrisma: PrismaClient | undefined;
}

function databaseUrl(){
  const value=process.env.DATABASE_URL?.trim();
  if(!value) throw new InternalServerErrorException('Missing DATABASE_URL.');
  return value;
}

export const prisma=globalThis.__emercoriaPrisma??new PrismaClient({ adapter:new PrismaPg({ connectionString:databaseUrl() }) });
if(process.env.NODE_ENV!=='production') globalThis.__emercoriaPrisma=prisma;
