import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountType } from '@prisma/client';
import { verifyAccessToken, type AccessTokenPayload } from './token';

const ACCOUNT_TYPES_KEY='account-types';
export const RequireAccountTypes=(...accountTypes:AccountType[])=>SetMetadata(ACCOUNT_TYPES_KEY, accountTypes);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector:Reflector){}
  canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest<{headers:{authorization?:string};user?:AccessTokenPayload}>();
    const authorization=request.headers?.authorization?.trim();
    if(!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token.');
    const payload=verifyAccessToken(authorization.slice(7).trim());
    const allowed=this.reflector.getAllAndOverride<AccountType[]>(ACCOUNT_TYPES_KEY,[context.getHandler(),context.getClass()])||[];
    if(allowed.length&&!allowed.includes(payload.accountType)) throw new ForbiddenException('Insufficient permissions.');
    request.user=payload;
    return true;
  }
}
