import 'dotenv/config';
import { PrismaClient, AccountType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, scryptSync } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('Missing DATABASE_URL.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const worldImportDir = new URL('../private/world-import/', import.meta.url);
const regionsDir = new URL('./../private/world-import/regions/', import.meta.url);
const countriesFile = new URL('./../private/world-import/Country.json', import.meta.url);

const hashPassword = password => {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
};

const users = [
  { email: 'admin@gmail.com', nickname: 'Admin', password: '12345', accountType: AccountType.ADMIN },
  { email: 'shadowfox@gmail.com', nickname: 'ShadowFox', password: '123', accountType: AccountType.PLAYER },
  { email: 'novadrift@gmail.com', nickname: 'NovaDrift', password: '123', accountType: AccountType.PLAYER },
  { email: 'pixelrogue@gmail.com', nickname: 'PixelRogue', password: '123', accountType: AccountType.PLAYER },
  { email: 'stormbyte@gmail.com', nickname: 'StormByte', password: '123', accountType: AccountType.PLAYER },
  { email: 'echovex@gmail.com', nickname: 'EchoVex', password: '123', accountType: AccountType.PLAYER }
];

async function loadCountries() {
  const raw = await readFile(countriesFile, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data?.countries) || !data.countries.length) throw new Error('Country.json is invalid.');
  return data.countries;
}

async function loadRegions() {
  const filenames = (await readdir(regionsDir)).filter(name => name.toLowerCase().endsWith('.json')).sort();
  const regions = [];
  for (const filename of filenames) {
    const raw = await readFile(new URL(filename, regionsDir), 'utf8');
    const data = JSON.parse(raw);
    const feature = data?.features?.[0];
    const properties = feature?.properties || {};
    const geometry = feature?.geometry;
    if (!properties.regionId || !properties.code || !properties.name || !properties.countryId) {
      throw new Error(`Missing required properties in ${filename}`);
    }
    if (!geometry?.type || !geometry?.coordinates) throw new Error(`Invalid geometry in ${filename}`);
    regions.push({
      id: Number(properties.regionId),
      code: String(properties.code),
      name: String(properties.name),
      countryId: Number(properties.countryId),
      neighborIds: Array.isArray(properties.neighborIds) ? properties.neighborIds.map(Number) : [],
      resource: properties.resource == null ? null : String(properties.resource),
      geometryType: String(geometry.type),
      geometryJson: geometry,
      filename
    });
  }
  return regions;
}

function validateWorld(countries, regions) {
  const countryIds = new Set();
  const regionIds = new Set();
  const regionCodes = new Set();
  const regionsById = new Map(regions.map(region => [region.id, region]));
  for (const country of countries) {
    if (countryIds.has(country.countryId)) throw new Error(`Duplicate countryId ${country.countryId}`);
    countryIds.add(country.countryId);
    if (!Array.isArray(country.regionIds)) throw new Error(`Country ${country.code} has invalid regionIds`);
    for (const regionId of country.regionIds) {
      if (!regionsById.has(regionId)) throw new Error(`Country ${country.code} references missing regionId ${regionId}`);
    }
  }
  for (const region of regions) {
    if (regionIds.has(region.id)) throw new Error(`Duplicate regionId ${region.id}`);
    if (regionCodes.has(region.code)) throw new Error(`Duplicate region code ${region.code}`);
    regionIds.add(region.id);
    regionCodes.add(region.code);
    if (!countryIds.has(region.countryId)) throw new Error(`Region ${region.filename} has invalid countryId ${region.countryId}`);
    for (const neighborId of region.neighborIds) {
      if (!regionsById.has(neighborId)) throw new Error(`Region ${region.filename} references missing neighborId ${neighborId}`);
      if (neighborId === region.id) throw new Error(`Region ${region.filename} cannot neighbor itself`);
    }
  }
  for (const country of countries) {
    const expected = new Set(country.regionIds);
    const actual = new Set(regions.filter(region => region.countryId === country.countryId).map(region => region.id));
    for (const regionId of expected) if (!actual.has(regionId)) throw new Error(`Country ${country.code} missing region ${regionId}`);
    for (const regionId of actual) if (!expected.has(regionId)) throw new Error(`Country ${country.code} does not list region ${regionId}`);
  }
}

function buildNeighborRows(regions) {
  const regionIds = new Set(regions.map(region => region.id));
  const pairs = new Set();
  for (const region of regions) {
    for (const neighborId of region.neighborIds) {
      if (!regionIds.has(neighborId)) continue;
      const a = Math.min(region.id, neighborId);
      const b = Math.max(region.id, neighborId);
      pairs.add(`${a}:${b}`);
    }
  }
  const rows = [];
  for (const pair of pairs) {
    const [a, b] = pair.split(':').map(Number);
    rows.push({ regionId: a, neighborRegionId: b });
    rows.push({ regionId: b, neighborRegionId: a });
  }
  return rows;
}

async function seedUsers() {
  for (const user of users) {
    const { password, ...rest } = user;
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...rest, passwordHash: hashPassword(password), isActive: true, moderatorLevel: null },
      create: { ...rest, passwordHash: hashPassword(password), isActive: true, moderatorLevel: null }
    });
  }
}

async function seedWorld() {
  const countries = await loadCountries();
  const regions = await loadRegions();
  validateWorld(countries, regions);
  const neighbors = buildNeighborRows(regions);

  await prisma.regionOwnershipHistory.deleteMany();
  await prisma.seasonRegionState.deleteMany();
  await prisma.regionNeighbor.deleteMany();
  await prisma.region.deleteMany();
  await prisma.season.deleteMany();
  await prisma.country.deleteMany();

  await prisma.country.createMany({
    data: countries.map(country => ({
      id: Number(country.countryId),
      code: String(country.code),
      name: String(country.name),
      baseColor: String(country.color),
      isActive: true
    }))
  });

  await prisma.region.createMany({
    data: regions.map(region => ({
      id: region.id,
      countryId: region.countryId,
      code: region.code,
      name: region.name,
      resource: region.resource,
      geometryType: region.geometryType,
      geometryJson: region.geometryJson,
      isActive: true
    }))
  });

  if (neighbors.length) await prisma.regionNeighbor.createMany({ data: neighbors, skipDuplicates: true });

  const season = await prisma.season.create({
    data: {
      name: 'Season 1',
      startsAt: new Date(),
      isActive: true
    }
  });

  const colorByCountryId = new Map(countries.map(country => [Number(country.countryId), String(country.color)]));
  await prisma.seasonRegionState.createMany({
    data: regions.map(region => ({
      seasonId: season.id,
      regionId: region.id,
      currentOwnerCountryId: region.countryId,
      currentColor: colorByCountryId.get(region.countryId) || '#64748B',
      capturedAt: null
    }))
  });

  await prisma.regionOwnershipHistory.createMany({
    data: regions.map(region => ({
      seasonId: season.id,
      regionId: region.id,
      fromOwnerCountryId: null,
      toOwnerCountryId: region.countryId,
      fromColor: null,
      toColor: colorByCountryId.get(region.countryId) || '#64748B',
      changedAt: season.startsAt,
      reason: 'initial import'
    }))
  });
}

async function main() {
  await seedUsers();
  await seedWorld();
  console.log('Seed complete.');
}

main()
  .catch(error => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
