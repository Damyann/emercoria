import 'dotenv/config';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtAuthGuard } from '../auth/guard';
import { LoginApi } from '../login/api';
import { LoginLogic } from '../login/logic';
import { TerritoriesApi } from '../territories/api';
import { TerritoriesLogic } from '../territories/logic';
import { WorldApi } from '../world/api';
import { WorldLogic } from '../world/logic';

@Module({
  controllers:[LoginApi, WorldApi, TerritoriesApi],
  providers:[LoginLogic, WorldLogic, TerritoriesLogic, JwtAuthGuard],
})
class AppModule {}

async function bootstrap(){
  const app=await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger:true }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin:['http://localhost:3000'], credentials:true });
  app.useGlobalPipes(new ValidationPipe({ whitelist:true, transform:true, forbidNonWhitelisted:true }));
  const port=Number(process.env.PORT)||3001;
  const host=process.env.HOST||'0.0.0.0';
  await app.listen(port, host);
  console.log(`backend listening on http://${host}:${port}/api`);
}

void bootstrap();
