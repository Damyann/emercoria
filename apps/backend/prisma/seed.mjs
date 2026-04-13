import 'dotenv/config';
import { PrismaClient, AccountType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, scryptSync } from 'node:crypto';

const databaseUrl=process.env.DATABASE_URL?.trim();
if(!databaseUrl) throw new Error('Missing DATABASE_URL.');
const prisma=new PrismaClient({ adapter:new PrismaPg({ connectionString:databaseUrl }) });
const hashPassword=password=>{const salt=randomBytes(16);const key=scryptSync(password,salt,64);return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;};
const users=[
  { email:'admin@gmail.com', nickname:'Admin', password:'12345', accountType:AccountType.ADMIN },
  { email:'shadowfox@gmail.com', nickname:'ShadowFox', password:'123', accountType:AccountType.PLAYER },
  { email:'novadrift@gmail.com', nickname:'NovaDrift', password:'123', accountType:AccountType.PLAYER },
  { email:'pixelrogue@gmail.com', nickname:'PixelRogue', password:'123', accountType:AccountType.PLAYER },
  { email:'stormbyte@gmail.com', nickname:'StormByte', password:'123', accountType:AccountType.PLAYER },
  { email:'echovex@gmail.com', nickname:'EchoVex', password:'123', accountType:AccountType.PLAYER },
];

async function main(){
  for(const user of users){
    const { password, ...rest }=user;
    await prisma.user.upsert({ where:{ email:user.email }, update:{ ...rest, passwordHash:hashPassword(password), isActive:true, moderatorLevel:null }, create:{ ...rest, passwordHash:hashPassword(password), isActive:true, moderatorLevel:null } });
  }
  console.log(`Seeded ${users.length} users.`);
}

main().catch(error=>{console.error('Seed failed:',error);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
