/**
 * STAR ADD-ON #1 — City Asset Registry Seed
 *
 * Run:  node scratch/asset_registry_seed.js
 *
 * IDEMPOTENT: Uses upsert on assetCode. Running multiple times is safe.
 * LINKED ASSETS: For existing domain entities (CCTV, WaterSensor, Junction,
 *   EmergencyUnit, EnvironmentSensor, GarbageBin, StreetLight), creates a
 *   CityAsset with refType + refId. The API resolves live status from the
 *   domain entity — no data duplication.
 * STANDALONE ASSETS: Hospitals, police stations, fire stations, bus stops,
 *   schools, parks, shelters etc. are seeded with synthetic coordinates
 *   distributed across Chennai zones. The asset_simulation worker updates
 *   their health scores over time.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Deterministic RNG (seeded) so coordinates are stable across re-runs ──────
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Chennai zone centroids (realistic city coordinates)
const ZONE_CENTROIDS = {
  'Tiruvottiyur':      { lat: 13.1570, lng: 80.3020 },
  'Manali':            { lat: 13.1650, lng: 80.2560 },
  'Madhavaram':        { lat: 13.1490, lng: 80.2320 },
  'Tondiarpet':        { lat: 13.1170, lng: 80.2900 },
  'Royapuram':         { lat: 13.1120, lng: 80.2950 },
  'Thiru Vi Ka Nagar': { lat: 13.0900, lng: 80.2620 },
  'Ambattur':          { lat: 13.0980, lng: 80.1620 },
  'Anna Nagar':        { lat: 13.0850, lng: 80.2100 },
  'Teynampet':         { lat: 13.0470, lng: 80.2550 },
  'Kodambakkam':       { lat: 13.0520, lng: 80.2230 },
  'Valasaravakkam':    { lat: 13.0560, lng: 80.1760 },
  'Alandur':           { lat: 13.0010, lng: 80.2040 },
  'Adyar':             { lat: 13.0067, lng: 80.2568 },
  'Perungudi':         { lat: 12.9670, lng: 80.2430 },
  'Sholinganallur':    { lat: 12.9010, lng: 80.2280 },
};

function jitter(rng, range = 0.025) {
  return (rng() - 0.5) * range * 2;
}

function pickStatus(rng, offlineChance = 0.05, degradedChance = 0.1, maintenanceChance = 0.05) {
  const r = rng();
  if (r < offlineChance) return 'OFFLINE';
  if (r < offlineChance + degradedChance) return 'DEGRADED';
  if (r < offlineChance + degradedChance + maintenanceChance) return 'MAINTENANCE';
  return 'HEALTHY';
}

function healthFromStatus(status, rng) {
  switch (status) {
    case 'HEALTHY':     return 80 + Math.floor(rng() * 20);   // 80-100
    case 'DEGRADED':    return 40 + Math.floor(rng() * 35);   // 40-74
    case 'MAINTENANCE': return 20 + Math.floor(rng() * 30);   // 20-49
    case 'OFFLINE':     return Math.floor(rng() * 20);         // 0-19
    default:            return 50;
  }
}

function cctvStatusToAsset(cctvStatus) {
  return cctvStatus === 'online' ? 'HEALTHY' : 'OFFLINE';
}

function waterLevelToStatus(waterLevel) {
  if (waterLevel > 160) return 'OFFLINE';
  if (waterLevel > 120) return 'DEGRADED';
  return 'HEALTHY';
}

function garbageBinToStatus(binStatus) {
  if (binStatus === 'offline') return 'OFFLINE';
  if (binStatus === 'overflowing') return 'DEGRADED';
  return 'HEALTHY';
}

function streetLightToStatus(lightStatus) {
  if (lightStatus === 'offline') return 'OFFLINE';
  if (lightStatus === 'fault') return 'DEGRADED';
  return 'HEALTHY';
}

function publicVehicleToStatus(vehicleStatus) {
  if (vehicleStatus === 'offline') return 'OFFLINE';
  if (vehicleStatus === 'delayed') return 'DEGRADED';
  return 'HEALTHY';
}

async function upsertAsset(data) {
  return prisma.cityAsset.upsert({
    where: { assetCode: data.assetCode },
    update: {
      status: data.status,
      healthScore: data.healthScore,
      lastSeenAt: data.lastSeenAt,
      metadata: data.metadata,
    },
    create: data,
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  STAR ADD-ON #1 — City Asset Registry Seed');
  console.log('═══════════════════════════════════════════════════════');

  // ── Load existing zones ──────────────────────────────────────────────────
  const zones = await prisma.zone.findMany();
  if (!zones.length) {
    console.error('❌  No zones found. Run base seed first (npm run prisma:seed).');
    process.exit(1);
  }

  const zoneByName = new Map(zones.map(z => [z.name, z]));
  console.log(`✓  Loaded ${zones.length} zones`);

  let totalCreated = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // LINKED ASSETS — wrap existing domain entities in CityAsset records
  // refType + refId → API resolves live status from the domain entity
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1. CCTVFeed → SAFETY/cctv_camera ─────────────────────────────────────
  console.log('\n── Linking CCTVFeed → CityAsset (SAFETY / cctv_camera)...');
  const cctvFeeds = await prisma.cCTVFeed.findMany({
    include: { junction: { include: { zone: true } } }
  });

  let cctvIdx = 1;
  for (const feed of cctvFeeds) {
    const status = cctvStatusToAsset(feed.status);
    const rng = seededRandom(cctvIdx * 7919);
    await upsertAsset({
      assetCode: `CCTV-${String(cctvIdx).padStart(3, '0')}`,
      name: `Camera @ ${feed.junction.name}`,
      assetType: 'cctv_camera',
      category: 'SAFETY',
      lat: feed.lat,
      lng: feed.lng,
      zoneId: feed.junction.zoneId,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'CCTVFeed',
      refId: feed.id,
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        junctionId: feed.junction.id,
        junctionName: feed.junction.name,
        zoneName: feed.junction.zone?.name,
        lastEvent: feed.lastEvent,
      }
    });
    cctvIdx++;
  }
  console.log(`  ✓  ${cctvFeeds.length} CCTV cameras linked`);
  totalCreated += cctvFeeds.length;

  // ── 2. WaterSensor → WATER/water_sensor ──────────────────────────────────
  console.log('── Linking WaterSensor → CityAsset (WATER / water_sensor)...');
  const waterSensors = await prisma.waterSensor.findMany({
    include: { zone: true }
  });

  let wsIdx = 1;
  for (const sensor of waterSensors) {
    const status = waterLevelToStatus(sensor.waterLevel);
    const rng = seededRandom(wsIdx * 6271);
    await upsertAsset({
      assetCode: `WS-${String(wsIdx).padStart(3, '0')}`,
      name: `Water Sensor — ${sensor.zone.name}`,
      assetType: 'water_sensor',
      category: 'WATER',
      lat: sensor.lat,
      lng: sensor.lng,
      zoneId: sensor.zoneId,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'WaterSensor',
      refId: sensor.id,
      isDemo: true,
      lastSeenAt: sensor.timestamp,
      metadata: {
        zoneName: sensor.zone.name,
        waterLevelCm: sensor.waterLevel,
        threshold: { watch: 80, warning: 120, danger: 160 }
      }
    });
    wsIdx++;
  }
  console.log(`  ✓  ${waterSensors.length} water sensors linked`);
  totalCreated += waterSensors.length;

  // ── 3. Junction → MOBILITY/junction ──────────────────────────────────────
  console.log('── Linking Junction → CityAsset (MOBILITY / junction)...');
  const junctions = await prisma.junction.findMany({
    include: { zone: true }
  });

  let jIdx = 1;
  for (const junction of junctions) {
    const rng = seededRandom(jIdx * 5381);
    const status = rng() > 0.9 ? 'DEGRADED' : 'HEALTHY';
    await upsertAsset({
      assetCode: `JXN-${String(jIdx).padStart(3, '0')}`,
      name: junction.name,
      assetType: 'junction',
      category: 'MOBILITY',
      lat: junction.lat,
      lng: junction.lng,
      zoneId: junction.zoneId,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'Junction',
      refId: junction.id,
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: { zoneName: junction.zone.name }
    });
    jIdx++;
  }
  console.log(`  ✓  ${junctions.length} junctions linked`);
  totalCreated += junctions.length;

  // ── 4. EmergencyUnit → SAFETY/emergency_unit ─────────────────────────────
  console.log('── Linking EmergencyUnit → CityAsset (SAFETY / emergency_unit)...');
  const emergencyUnits = await prisma.emergencyUnit.findMany();

  let euIdx = 1;
  for (const unit of emergencyUnits) {
    const status = unit.isAvailable ? 'HEALTHY' : 'DEGRADED';
    const rng = seededRandom(euIdx * 4933);
    await upsertAsset({
      assetCode: `EMG-${String(euIdx).padStart(3, '0')}`,
      name: unit.name,
      assetType: unit.type === 'ambulance' ? 'ambulance' : 'fire_truck',
      category: 'SAFETY',
      lat: unit.lat,
      lng: unit.lng,
      zoneId: null,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'EmergencyUnit',
      refId: unit.id,
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: { unitType: unit.type, isAvailable: unit.isAvailable }
    });
    euIdx++;
  }
  console.log(`  ✓  ${emergencyUnits.length} emergency units linked`);
  totalCreated += emergencyUnits.length;

  // ── 5. EnvironmentSensor → ENVIRONMENT/env_sensor ─────────────────────────
  console.log('── Linking EnvironmentSensor → CityAsset (ENVIRONMENT / env_sensor)...');
  const envSensors = await prisma.environmentSensor.findMany({
    include: { zone: true }
  });

  let envIdx = 1;
  for (const sensor of envSensors) {
    const status = sensor.status === 'online' ? 'HEALTHY' : 'OFFLINE';
    const rng = seededRandom(envIdx * 3557);
    await upsertAsset({
      assetCode: `ENV-${String(envIdx).padStart(3, '0')}`,
      name: `AQI Sensor — ${sensor.zone.name}`,
      assetType: 'env_sensor',
      category: 'ENVIRONMENT',
      lat: sensor.lat,
      lng: sensor.lng,
      zoneId: sensor.zoneId,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'EnvironmentSensor',
      refId: sensor.id,
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        aqi: sensor.aqi,
        pm25: sensor.pm25,
        temperature: sensor.temperature,
        humidity: sensor.humidity,
        zoneName: sensor.zone.name,
      }
    });
    envIdx++;
  }
  console.log(`  ✓  ${envSensors.length} environment sensors linked`);
  totalCreated += envSensors.length;

  // ── 6. GarbageBin → WASTE/garbage_bin ────────────────────────────────────
  console.log('── Linking GarbageBin → CityAsset (WASTE / garbage_bin)...');
  const garbageBins = await prisma.garbageBin.findMany({
    include: { zone: true }
  });

  let gbIdx = 1;
  for (const bin of garbageBins) {
    const status = garbageBinToStatus(bin.status);
    const rng = seededRandom(gbIdx * 2311);
    await upsertAsset({
      assetCode: `BIN-${String(gbIdx).padStart(3, '0')}`,
      name: `Waste Bin — ${bin.zone.name}`,
      assetType: 'garbage_bin',
      category: 'WASTE',
      lat: bin.lat,
      lng: bin.lng,
      zoneId: bin.zoneId,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'GarbageBin',
      refId: bin.id,
      isDemo: true,
      lastSeenAt: bin.updatedAt,
      metadata: {
        fillPercentage: bin.fillPercentage,
        lastCollected: bin.lastCollected,
        zoneName: bin.zone.name,
      }
    });
    gbIdx++;
  }
  console.log(`  ✓  ${garbageBins.length} garbage bins linked`);
  totalCreated += garbageBins.length;

  // ── 7. StreetLight → ENERGY/street_light ──────────────────────────────────
  console.log('── Linking StreetLight → CityAsset (ENERGY / street_light)...');
  const streetLights = await prisma.streetLight.findMany({
    include: { zone: true }
  });

  let slIdx = 1;
  for (const light of streetLights) {
    const status = streetLightToStatus(light.status);
    const rng = seededRandom(slIdx * 1979);
    await upsertAsset({
      assetCode: `SL-${String(slIdx).padStart(3, '0')}`,
      name: `Street Light — ${light.zone.name}`,
      assetType: 'street_light',
      category: 'ENERGY',
      lat: light.lat,
      lng: light.lng,
      zoneId: light.zoneId,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'StreetLight',
      refId: light.id,
      isDemo: true,
      lastSeenAt: light.updatedAt,
      metadata: {
        powerConsumption: light.powerConsumption,
        dimmingLevel: light.dimmingLevel,
        zoneName: light.zone.name,
      }
    });
    slIdx++;
  }
  console.log(`  ✓  ${streetLights.length} street lights linked`);
  totalCreated += streetLights.length;

  // ── 8. PublicVehicle → MOBILITY/bus ───────────────────────────────────────
  console.log('── Linking PublicVehicle → CityAsset (MOBILITY / bus)...');
  const publicVehicles = await prisma.publicVehicle.findMany();

  let pvIdx = 1;
  for (const vehicle of publicVehicles) {
    const status = publicVehicleToStatus(vehicle.status);
    const rng = seededRandom(pvIdx * 1543);
    await upsertAsset({
      assetCode: `BUS-${String(pvIdx).padStart(3, '0')}`,
      name: `MTC Bus ${vehicle.routeId}`,
      assetType: 'bus',
      category: 'MOBILITY',
      lat: vehicle.lat,
      lng: vehicle.lng,
      zoneId: null,
      status,
      healthScore: healthFromStatus(status, rng),
      refType: 'PublicVehicle',
      refId: vehicle.id,
      isDemo: true,
      lastSeenAt: vehicle.updatedAt,
      metadata: {
        routeId: vehicle.routeId,
        speed: vehicle.speed,
        occupancy: vehicle.occupancy,
        vehicleStatus: vehicle.status,
      }
    });
    pvIdx++;
  }
  console.log(`  ✓  ${publicVehicles.length} buses linked`);
  totalCreated += publicVehicles.length;

  // ══════════════════════════════════════════════════════════════════════════
  // STANDALONE ASSETS — realistic synthetic Chennai infrastructure
  // No domain entity exists; status + healthScore are simulated directly
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n── Seeding standalone synthetic assets...');

  // ─── Hospitals ────────────────────────────────────────────────────────────
  const hospitals = [
    { name: 'Rajiv Gandhi Government General Hospital', lat: 13.0827, lng: 80.2819, zone: 'Royapuram' },
    { name: 'Government Stanley Medical College Hospital', lat: 13.1067, lng: 80.2937, zone: 'Tondiarpet' },
    { name: 'Government Kilpauk Medical College Hospital', lat: 13.0845, lng: 80.2313, zone: 'Anna Nagar' },
    { name: 'Madras Medical College Hospital', lat: 13.0827, lng: 80.2827, zone: 'Royapuram' },
    { name: 'Government Omandurar Multi Speciality Hospital', lat: 13.0535, lng: 80.2710, zone: 'Teynampet' },
    { name: 'Government Hospital — Adyar', lat: 13.0042, lng: 80.2554, zone: 'Adyar' },
    { name: 'Government Hospital — Sholinganallur', lat: 12.9020, lng: 80.2290, zone: 'Sholinganallur' },
    { name: 'Government Hospital — Ambattur', lat: 13.0985, lng: 80.1635, zone: 'Ambattur' },
    { name: 'Government Hospital — Tiruvottiyur', lat: 13.1565, lng: 80.3028, zone: 'Tiruvottiyur' },
    { name: 'ESI Hospital — Alandur', lat: 13.0025, lng: 80.2045, zone: 'Alandur' },
  ];

  let hospIdx = 1;
  for (const h of hospitals) {
    const rng = seededRandom(hospIdx * 8191);
    const status = pickStatus(rng, 0.02, 0.08, 0.05);
    const zone = zoneByName.get(h.zone);
    await upsertAsset({
      assetCode: `HOSP-${String(hospIdx).padStart(3, '0')}`,
      name: h.name,
      assetType: 'hospital',
      category: 'HEALTHCARE',
      lat: h.lat,
      lng: h.lng,
      zoneId: zone?.id ?? null,
      status,
      healthScore: healthFromStatus(status, rng),
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        capacity: 200 + Math.floor(rng() * 800),
        emergencyBeds: 20 + Math.floor(rng() * 80),
        currentOccupancy: Math.floor(rng() * 100),
        ambulanceCount: 2 + Math.floor(rng() * 8),
        type: 'government',
      }
    });
    hospIdx++;
  }
  console.log(`  ✓  ${hospitals.length} hospitals seeded`);
  totalCreated += hospitals.length;

  // ─── Police Stations ──────────────────────────────────────────────────────
  const policeStations = [
    { name: 'Tiruvottiyur Police Station', zone: 'Tiruvottiyur', lat: 13.1560, lng: 80.3015 },
    { name: 'Tondiarpet Police Station', zone: 'Tondiarpet', lat: 13.1165, lng: 80.2895 },
    { name: 'Royapuram Police Station', zone: 'Royapuram', lat: 13.1115, lng: 80.2945 },
    { name: 'Anna Nagar Police Station', zone: 'Anna Nagar', lat: 13.0840, lng: 80.2105 },
    { name: 'Teynampet Police Station', zone: 'Teynampet', lat: 13.0460, lng: 80.2545 },
    { name: 'Kodambakkam Police Station', zone: 'Kodambakkam', lat: 13.0515, lng: 80.2235 },
    { name: 'Adyar Police Station', zone: 'Adyar', lat: 13.0060, lng: 80.2560 },
    { name: 'Sholinganallur Police Station', zone: 'Sholinganallur', lat: 12.9010, lng: 80.2275 },
    { name: 'Ambattur Police Station', zone: 'Ambattur', lat: 13.0975, lng: 80.1625 },
    { name: 'Alandur Police Station', zone: 'Alandur', lat: 13.0015, lng: 80.2035 },
    { name: 'Madhavaram Police Station', zone: 'Madhavaram', lat: 13.1485, lng: 80.2325 },
    { name: 'Perungudi Police Station', zone: 'Perungudi', lat: 12.9665, lng: 80.2425 },
  ];

  let psIdx = 1;
  for (const ps of policeStations) {
    const rng = seededRandom(psIdx * 7369);
    const status = pickStatus(rng, 0.01, 0.05, 0.03);
    const zone = zoneByName.get(ps.zone);
    await upsertAsset({
      assetCode: `PS-${String(psIdx).padStart(3, '0')}`,
      name: ps.name,
      assetType: 'police_station',
      category: 'SAFETY',
      lat: ps.lat,
      lng: ps.lng,
      zoneId: zone?.id ?? null,
      status,
      healthScore: healthFromStatus(status, rng),
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        officersOnDuty: 10 + Math.floor(rng() * 40),
        vehiclesAvailable: 2 + Math.floor(rng() * 8),
        jurisdiction: ps.zone,
      }
    });
    psIdx++;
  }
  console.log(`  ✓  ${policeStations.length} police stations seeded`);
  totalCreated += policeStations.length;

  // ─── Fire Stations ────────────────────────────────────────────────────────
  const fireStations = [
    { name: 'Tiruvottiyur Fire Station', zone: 'Tiruvottiyur', lat: 13.1555, lng: 80.3010 },
    { name: 'Tondiarpet Fire Station', zone: 'Tondiarpet', lat: 13.1160, lng: 80.2890 },
    { name: 'Royapuram Fire Station', zone: 'Royapuram', lat: 13.1110, lng: 80.2940 },
    { name: 'Anna Nagar Fire Station', zone: 'Anna Nagar', lat: 13.0835, lng: 80.2095 },
    { name: 'Teynampet Fire Station', zone: 'Teynampet', lat: 13.0455, lng: 80.2540 },
    { name: 'Adyar Fire Station', zone: 'Adyar', lat: 13.0055, lng: 80.2555 },
    { name: 'Ambattur Fire Station', zone: 'Ambattur', lat: 13.0970, lng: 80.1620 },
    { name: 'Alandur Fire Station', zone: 'Alandur', lat: 13.0010, lng: 80.2030 },
  ];

  let fsIdx = 1;
  for (const fs of fireStations) {
    const rng = seededRandom(fsIdx * 6551);
    const status = pickStatus(rng, 0.01, 0.04, 0.04);
    const zone = zoneByName.get(fs.zone);
    await upsertAsset({
      assetCode: `FS-${String(fsIdx).padStart(3, '0')}`,
      name: fs.name,
      assetType: 'fire_station',
      category: 'SAFETY',
      lat: fs.lat,
      lng: fs.lng,
      zoneId: zone?.id ?? null,
      status,
      healthScore: healthFromStatus(status, rng),
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        fireTrucks: 2 + Math.floor(rng() * 5),
        personnelOnDuty: 8 + Math.floor(rng() * 20),
      }
    });
    fsIdx++;
  }
  console.log(`  ✓  ${fireStations.length} fire stations seeded`);
  totalCreated += fireStations.length;

  // ─── Bus Stops (MTC) ──────────────────────────────────────────────────────
  const busStopNames = [
    'Kathipara Junction', 'CMBT', 'Koyambedu Market', 'Anna Nagar Tower',
    'Alandur Metro', 'Vadapalani', 'Ashok Nagar', 'Tambaram', 'Chrompet',
    'Guindy', 'Adyar Signal', 'Thiruvanmiyur', 'Perungudi', 'Sholinganallur',
    'Ambattur OT', 'Padi', 'Manali', 'Tondiarpet Bus Stand', 'Royapuram',
    'Broadway', 'Park Town', 'Egmore', 'Nungambakkam', 'Kodambakkam',
    'Valasaravakkam', 'Porur', 'Mogappair', 'Kolathur', 'Villivakkam',
  ];

  const busStopZones = zones.slice();
  let bsIdx = 1;
  for (const stopName of busStopNames) {
    const zone = busStopZones[bsIdx % busStopZones.length];
    const centroid = ZONE_CENTROIDS[zone.name] || { lat: 13.07, lng: 80.22 };
    const rng = seededRandom(bsIdx * 5639);
    const status = pickStatus(rng, 0.03, 0.07, 0.02);
    await upsertAsset({
      assetCode: `BS-${String(bsIdx).padStart(3, '0')}`,
      name: `${stopName} Bus Stop`,
      assetType: 'bus_stop',
      category: 'MOBILITY',
      lat: centroid.lat + jitter(rng, 0.015),
      lng: centroid.lng + jitter(rng, 0.015),
      zoneId: zone.id,
      status,
      healthScore: healthFromStatus(status, rng),
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        routesServed: 3 + Math.floor(rng() * 12),
        shelterAvailable: rng() > 0.3,
        digitalDisplay: rng() > 0.6,
        avgDailyPassengers: 800 + Math.floor(rng() * 4000),
      }
    });
    bsIdx++;
  }
  console.log(`  ✓  ${busStopNames.length} bus stops seeded`);
  totalCreated += busStopNames.length;

  // ─── Schools ──────────────────────────────────────────────────────────────
  const schoolNames = [
    'Government Higher Secondary School — Anna Nagar',
    'Government Higher Secondary School — Adyar',
    'Government Higher Secondary School — Ambattur',
    'Government Higher Secondary School — Tondiarpet',
    'Government Higher Secondary School — Sholinganallur',
    'Government Higher Secondary School — Kodambakkam',
    'Government Higher Secondary School — Perungudi',
    'Government Higher Secondary School — Valasaravakkam',
    'Government Higher Secondary School — Tiruvottiyur',
    'Government Higher Secondary School — Madhavaram',
    'Government Higher Secondary School — Manali',
    'Government Higher Secondary School — Alandur',
  ];

  const schoolZoneOrder = ['Anna Nagar','Adyar','Ambattur','Tondiarpet','Sholinganallur','Kodambakkam','Perungudi','Valasaravakkam','Tiruvottiyur','Madhavaram','Manali','Alandur'];
  let scIdx = 1;
  for (const scName of schoolNames) {
    const zoneName = schoolZoneOrder[scIdx - 1] || zones[scIdx % zones.length].name;
    const zone = zoneByName.get(zoneName) || zones[scIdx % zones.length];
    const centroid = ZONE_CENTROIDS[zone.name] || { lat: 13.07, lng: 80.22 };
    const rng = seededRandom(scIdx * 4219);
    const status = pickStatus(rng, 0.01, 0.04, 0.06);
    await upsertAsset({
      assetCode: `SCH-${String(scIdx).padStart(3, '0')}`,
      name: scName,
      assetType: 'school',
      category: 'PUBLIC_FACILITIES',
      lat: centroid.lat + jitter(rng, 0.018),
      lng: centroid.lng + jitter(rng, 0.018),
      zoneId: zone.id,
      status,
      healthScore: healthFromStatus(status, rng),
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        studentCount: 400 + Math.floor(rng() * 1600),
        teacherCount: 20 + Math.floor(rng() * 60),
        type: 'government',
      }
    });
    scIdx++;
  }
  console.log(`  ✓  ${schoolNames.length} schools seeded`);
  totalCreated += schoolNames.length;

  // ─── Parks ────────────────────────────────────────────────────────────────
  const parkNames = [
    'Nandanam Anna Park', 'Chetput Park', 'Elliot Beach Park', 'Thiruvanmiyur Beach Park',
    'Nehru Park — Thiruvanmiyur', 'Mogappair West Park', 'Ambattur Industrial Park Green',
    'Manali Park', 'Tondiarpet Public Garden',
  ];

  let pkIdx = 1;
  for (const pkName of parkNames) {
    const zone = zones[pkIdx % zones.length];
    const centroid = ZONE_CENTROIDS[zone.name] || { lat: 13.07, lng: 80.22 };
    const rng = seededRandom(pkIdx * 3761);
    const status = pickStatus(rng, 0.02, 0.06, 0.04);
    await upsertAsset({
      assetCode: `PARK-${String(pkIdx).padStart(3, '0')}`,
      name: pkName,
      assetType: 'park',
      category: 'PUBLIC_FACILITIES',
      lat: centroid.lat + jitter(rng, 0.02),
      lng: centroid.lng + jitter(rng, 0.02),
      zoneId: zone.id,
      status,
      healthScore: healthFromStatus(status, rng),
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        areaHa: 1 + Math.floor(rng() * 15),
        facilities: ['walking_track', 'benches', 'lighting'].filter(() => rng() > 0.4),
        maintenanceStatus: status === 'MAINTENANCE' ? 'Under renovation' : 'Normal',
      }
    });
    pkIdx++;
  }
  console.log(`  ✓  ${parkNames.length} parks seeded`);
  totalCreated += parkNames.length;

  // ─── Shelters (Flood / Emergency) ─────────────────────────────────────────
  let shelterIdx = 1;
  for (const zone of zones) {
    const centroid = ZONE_CENTROIDS[zone.name] || { lat: 13.07, lng: 80.22 };
    const rng = seededRandom(shelterIdx * 3023);
    const status = pickStatus(rng, 0.02, 0.05, 0.05);
    await upsertAsset({
      assetCode: `SHLT-${String(shelterIdx).padStart(3, '0')}`,
      name: `Emergency Shelter — ${zone.name}`,
      assetType: 'shelter',
      category: 'SAFETY',
      lat: centroid.lat + jitter(rng, 0.012),
      lng: centroid.lng + jitter(rng, 0.012),
      zoneId: zone.id,
      status,
      healthScore: healthFromStatus(status, rng),
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        capacity: 200 + Math.floor(rng() * 800),
        currentOccupancy: 0,
        type: 'flood_shelter',
        foodStockDays: Math.floor(rng() * 14),
        powerBackup: rng() > 0.3,
      }
    });
    shelterIdx++;
  }
  console.log(`  ✓  ${zones.length} emergency shelters seeded`);
  totalCreated += zones.length;

  // ─── Road Projects (Urban Development) ───────────────────────────────────
  const roadProjects = [
    { name: 'IT Corridor Road Widening — Sholinganallur to Perungudi', zone: 'Sholinganallur', progress: 72 },
    { name: 'Anna Salai Elevated Corridor Phase 2', zone: 'Teynampet', progress: 45 },
    { name: 'Ambattur Industrial Road Resurfacing', zone: 'Ambattur', progress: 88 },
    { name: 'Madhavaram Ring Road Extension', zone: 'Madhavaram', progress: 31 },
    { name: 'Adyar Bridge Rehabilitation', zone: 'Adyar', progress: 55 },
    { name: 'Tondiarpet Port Road Widening', zone: 'Tondiarpet', progress: 90 },
    { name: 'Valasaravakkam Outer Ring Road Link', zone: 'Valasaravakkam', progress: 18 },
  ];

  let rpIdx = 1;
  for (const rp of roadProjects) {
    const zone = zoneByName.get(rp.zone);
    const centroid = ZONE_CENTROIDS[rp.zone] || { lat: 13.07, lng: 80.22 };
    const rng = seededRandom(rpIdx * 2699);
    const status = rp.progress >= 85 ? 'HEALTHY' : rp.progress >= 30 ? 'DEGRADED' : 'MAINTENANCE';
    await upsertAsset({
      assetCode: `PROJ-${String(rpIdx).padStart(3, '0')}`,
      name: rp.name,
      assetType: 'road_project',
      category: 'PROJECTS',
      lat: centroid.lat + jitter(rng, 0.01),
      lng: centroid.lng + jitter(rng, 0.01),
      zoneId: zone?.id ?? null,
      status,
      healthScore: rp.progress,
      isDemo: true,
      lastSeenAt: new Date(),
      metadata: {
        progressPercent: rp.progress,
        contractorName: 'TNRDC Demo Contractor',
        budgetCrore: 50 + Math.floor(rng() * 450),
        startDate: new Date(Date.now() - rng() * 180 * 86400000).toISOString(),
        estimatedCompletion: new Date(Date.now() + rng() * 180 * 86400000).toISOString(),
        workersOnSite: 20 + Math.floor(rng() * 180),
        slaStatus: rp.progress < 30 ? 'AT_RISK' : 'ON_TRACK',
      }
    });
    rpIdx++;
  }
  console.log(`  ✓  ${roadProjects.length} road projects seeded`);
  totalCreated += roadProjects.length;

  // ── Final summary ─────────────────────────────────────────────────────────
  const finalCount = await prisma.cityAsset.count();
  const byCategory = await prisma.cityAsset.groupBy({
    by: ['category'],
    _count: { _all: true },
  });
  const byStatus = await prisma.cityAsset.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  ✅  Asset Registry Seed Complete`);
  console.log(`  Total assets in registry: ${finalCount}`);
  console.log('\n  By Category:');
  for (const row of byCategory) {
    console.log(`    ${row.category.padEnd(20)} ${row._count._all}`);
  }
  console.log('\n  By Status:');
  for (const row of byStatus) {
    console.log(`    ${row.status.padEnd(20)} ${row._count._all}`);
  }
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch(e => { console.error('❌  Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
