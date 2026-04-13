import { Module } from '@nestjs/common';
import { LoginApi } from './api';
import { LoginLogic } from './logic';

@Module({ controllers: [LoginApi], providers: [LoginLogic] })
export class LoginSetup {}
