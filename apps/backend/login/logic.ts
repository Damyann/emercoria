import { Injectable, UnauthorizedException } from '@nestjs/common';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { prisma } from '../prisma/client';
import { LoginDto } from './dto';
import { signAccessToken } from '../auth/token';

const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const isBcrypt=(value:string)=>/^\$2[aby]\$\d{2}\$/.test(value);

function verifyScrypt(password:string, storedHash:string){
  const [,saltHex,keyHex]=storedHash.split('$');
  if(!saltHex||!keyHex) return false;
  const actual=scryptSync(password, Buffer.from(saltHex,'hex'), 64);
  const expected=Buffer.from(keyHex,'hex');
  return actual.length===expected.length&&timingSafeEqual(actual, expected);
}

function verifyPlain(password:string, storedHash:string){
  const actual=Buffer.from(password);
  const expected=Buffer.from(storedHash);
  return actual.length===expected.length&&timingSafeEqual(actual, expected);
}

function verifyPassword(password:string, storedHash:string){
  if(!storedHash) return false;
  if(storedHash.startsWith('scrypt$')) return verifyScrypt(password, storedHash);
  if(isBcrypt(storedHash)) return false;
  return verifyPlain(password, storedHash);
}

@Injectable()
export class LoginLogic {
  async login({ email, password }: LoginDto){
    const user=await prisma.user.findUnique({
      where:{ email:normalizeEmail(email) },
      select:{ id:true, email:true, nickname:true, accountType:true, moderatorLevel:true, isActive:true, passwordHash:true },
    });
    if(!user?.isActive||!verifyPassword(password, user.passwordHash)) throw new UnauthorizedException('Невалиден имейл или парола.');
    const token=signAccessToken({ sub:user.id, email:user.email, nickname:user.nickname, accountType:user.accountType, moderatorLevel:user.moderatorLevel });
    await prisma.user.update({ where:{ id:user.id }, data:{ lastLoginAt:new Date() } });
    return { ...token, tokenType:'Bearer', user:{ id:user.id, email:user.email, nickname:user.nickname, accountType:user.accountType, moderatorLevel:user.moderatorLevel } };
  }
}
