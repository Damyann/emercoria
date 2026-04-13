import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginDto } from './dto';
import { LoginLogic } from './logic';

@Controller('login')
export class LoginApi {
  constructor(private readonly logic: LoginLogic) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.logic.login(body);
  }
}
