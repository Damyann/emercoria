import { Injectable, InternalServerErrorException, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { LoginDto } from './dto';

const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const isBcrypt=(value:string)=>/^\$2[aby]\$\d{2}\$/.test(value);
const databaseUrl=()=>{const value=process.env.DATABASE_URL?.trim();if(!value) throw new InternalServerErrorException('Missing DATABASE_URL.');return value;};
function verifyScrypt(password:string, storedHash:string){const [,saltHex,keyHex]=storedHash.split('$');if(!saltHex||!keyHex) return false;const actual=scryptSync(password, Buffer.from(saltHex,'hex'), 64);const expected=Buffer.from(keyHex,'hex');return actual.length===expected.length&&timingSafeEqual(actual, expected);}
function verifyPlain(password:string, storedHash:string){const actual=Buffer.from(password);const expected=Buffer.from(storedHash);return actual.length===expected.length&&timingSafeEqual(actual, expected);}
function verifyPassword(password:string, storedHash:string){if(!storedHash) return false;if(storedHash.startsWith('scrypt$')) return verifyScrypt(password, storedHash);if(isBcrypt(storedHash)) return false;return verifyPlain(password, storedHash);}
function signToken(payload:Record<string,unknown>){const secret=process.env.JWT_SECRET?.trim();if(!secret) throw new InternalServerErrorException('Missing JWT_SECRET.');const now=Math.floor(Date.now()/1000);const ttl=Math.max(300, Number(process.env.JWT_TTL_SECONDS)||86400);const header=encode({ alg:'HS256', typ:'JWT' });const body=encode({ iss:process.env.JWT_ISSUER||'backend', iat:now, exp:now+ttl, ...payload });const signature=createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');return { accessToken:`${header}.${body}.${signature}`, expiresIn:ttl };}

@Injectable()
export class LoginLogic implements OnModuleDestroy {
  private readonly prisma=new PrismaClient({ adapter:new PrismaPg({ connectionString:databaseUrl() }) });
  async onModuleDestroy(){await this.prisma.$disconnect();}
  async login({ email, password }: LoginDto){
    const user=await this.prisma.user.findUnique({ where:{ email:normalizeEmail(email) }, select:{ id:true, email:true, nickname:true, accountType:true, moderatorLevel:true, isActive:true, passwordHash:true } });
    if(!user?.isActive||!verifyPassword(password, user.passwordHash)) throw new UnauthorizedException('Невалиден имейл или парола.');
    const token=signToken({ sub:user.id, email:user.email, nickname:user.nickname, accountType:user.accountType, moderatorLevel:user.moderatorLevel });
    await this.prisma.user.update({ where:{ id:user.id }, data:{ lastLoginAt:new Date() } });
    return { ...token, tokenType:'Bearer', user:{ id:user.id, email:user.email, nickname:user.nickname, accountType:user.accountType, moderatorLevel:user.moderatorLevel } };
  }
}
