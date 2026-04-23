import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { AccountType, ModeratorLevel } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type AccessTokenPayload={sub:string;email:string;nickname:string;accountType:AccountType;moderatorLevel:ModeratorLevel|null;iss:string;iat:number;exp:number;};
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
const decode=(value:string)=>JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as Record<string,unknown>;
const secret=()=>{const value=process.env.JWT_SECRET?.trim();if(!value) throw new InternalServerErrorException('Missing JWT_SECRET.');return value;};
const issuer=()=>process.env.JWT_ISSUER?.trim()||'backend';
const ttl=()=>Math.max(300, Number(process.env.JWT_TTL_SECONDS)||86400);
const sign=(header:string, body:string)=>createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');

export function signAccessToken(payload:Omit<AccessTokenPayload,'iss'|'iat'|'exp'>){
  const now=Math.floor(Date.now()/1000);
  const header=encode({ alg:'HS256', typ:'JWT' });
  const body=encode({ iss:issuer(), iat:now, exp:now+ttl(), ...payload });
  return { accessToken:`${header}.${body}.${sign(header, body)}`, expiresIn:ttl() };
}

export function verifyAccessToken(value?:string|null){
  if(!value) throw new UnauthorizedException('Missing token.');
  const [header, body, signature]=value.split('.');
  if(!header||!body||!signature) throw new UnauthorizedException('Invalid token.');
  const expected=Buffer.from(sign(header, body));
  const actual=Buffer.from(signature);
  if(actual.length!==expected.length||!timingSafeEqual(actual, expected)) throw new UnauthorizedException('Invalid token signature.');
  const payload=decode(body) as AccessTokenPayload;
  if(payload.iss!==issuer()) throw new UnauthorizedException('Invalid token issuer.');
  if(!payload.exp||payload.exp<=Math.floor(Date.now()/1000)) throw new UnauthorizedException('Token expired.');
  return payload;
}
