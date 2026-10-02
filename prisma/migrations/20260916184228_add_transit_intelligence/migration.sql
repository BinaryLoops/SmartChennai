-- CreateEnum
CREATE TYPE "Role" AS ENUM ('citizen', 'traffic_operator', 'emergency_operator', 'water_operator', 'executive', 'super_admin');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('traffic', 'fire', 'medical', 'flood');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('reported', 'verified', 'dispatched', 'resolved', 'arrived', 'in_progress');

-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('citizen', 'sensor', 'department');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('ambulance', 'fire_truck');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('MOBILITY', 'WATER', 'SAFETY', 'HEALTHCARE', 'ENVIRONMENT', 'WASTE', 'ENERGY', 'PUBLIC_FACILITIES', 'PROJECTS');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'OFFLINE', 'MAINTENANCE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundary" JSONB NOT NULL,
    "population" INTEGER NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Junction" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Junction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalOverride" (
    "id" TEXT NOT NULL,
    "junctionId" TEXT NOT NULL,
    "greenDuration" INTEGER NOT NULL DEFAULT 45,
    "redDuration" INTEGER NOT NULL DEFAULT 45,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "SignalOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "junctionId" TEXT,
    "actionType" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "operatorId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficReading" (
    "id" TEXT NOT NULL,
    "junctionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehiclesPerHour" INTEGER NOT NULL,
    "avgSpeed" DOUBLE PRECISION NOT NULL,
    "congestionLevel" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TrafficReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmergencyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "severity" INTEGER NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'reported',
    "source" "IncidentSource" NOT NULL,
    "reportedBy" INTEGER NOT NULL DEFAULT 1,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "unitId" TEXT,
    "description" TEXT,
    "priorityScore" DOUBLE PRECISION,
    "referenceId" TEXT,
    "resolutionNotes" TEXT,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterSensor" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "waterLevel" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterSensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterReading" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waterLevel" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WaterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CCTVFeed" (
    "id" TEXT NOT NULL,
    "junctionId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "lastEvent" TEXT,

    CONSTRAINT "CCTVFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'global',
    "monsoonEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "citizenSatWeight" INTEGER NOT NULL DEFAULT 10,
    "floodWeight" INTEGER NOT NULL DEFAULT 25,
    "incidentWeight" INTEGER NOT NULL DEFAULT 10,
    "rateLimitMax" INTEGER NOT NULL DEFAULT 100,
    "rateLimitWindow" INTEGER NOT NULL DEFAULT 900000,
    "responseWeight" INTEGER NOT NULL DEFAULT 25,
    "slaThresholdMins" INTEGER NOT NULL DEFAULT 30,
    "trafficWeight" INTEGER NOT NULL DEFAULT 30,
    "demoModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scenarioMode" TEXT NOT NULL DEFAULT 'normal',
    "simSpeedMultiplier" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SimulationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'citizen',
    "department" TEXT,
    "preferredLocale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityAsset" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "zoneId" TEXT,
    "ward" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'UNKNOWN',
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "refType" TEXT,
    "refId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "energyAssetId" TEXT,

    CONSTRAINT "CityAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "zoneId" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "relatedIncidentId" TEXT,

    CONSTRAINT "CityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentSensor" (
    "id" TEXT NOT NULL,
    "aqi" INTEGER NOT NULL DEFAULT 50,
    "pm25" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 32.0,
    "humidity" DOUBLE PRECISION NOT NULL DEFAULT 60.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "co" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "no2" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "noise" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "pm10" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "rainfall" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sensorType" TEXT NOT NULL DEFAULT 'MULTISENSOR',
    "uv" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "windSpeed" DOUBLE PRECISION NOT NULL DEFAULT 5.0,

    CONSTRAINT "EnvironmentSensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarbageBin" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "fillPercentage" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "lastCollected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fillRate" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "predictedOverflow" TIMESTAMP(3),
    "priorityScore" DOUBLE PRECISION,
    "assignedVehicleId" TEXT,

    CONSTRAINT "GarbageBin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteVehicle" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "currentLoad" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRoute" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "startTime" TIMESTAMP(3),
    "completionTime" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "binId" TEXT,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "eta" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WasteRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicVehicle" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'bus',
    "routeId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occupancy" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreetLight" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'online',
    "powerConsumption" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimmingLevel" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "energyAssetId" TEXT,

    CONSTRAINT "StreetLight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyAsset" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TRANSFORMER',
    "zoneId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "capacity" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "currentLoad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "temperature" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "powerState" TEXT DEFAULT 'ON',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "EnergyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetrySample" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetrySample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "assignedTeam" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitRoute" (
    "id" TEXT NOT NULL,
    "routeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedDurationMin" INTEGER NOT NULL DEFAULT 0,
    "polyline" TEXT,
    "activeVehicles" INTEGER NOT NULL DEFAULT 0,
    "scheduledFrequency" INTEGER NOT NULL DEFAULT 15,
    "currentDemand" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransitRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitStop" (
    "id" TEXT NOT NULL,
    "stopCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "zoneId" TEXT,
    "shelterStatus" TEXT NOT NULL DEFAULT 'NORMAL',
    "accessibilityStatus" TEXT NOT NULL DEFAULT 'ACCESSIBLE',
    "passengerDemand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentWaitingPassengers" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransitStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitRouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "stopIndex" INTEGER NOT NULL,
    "distanceFromStart" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "TransitRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitTrip" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "tripCode" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "currentStopIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TransitTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitVehicle" (
    "id" TEXT NOT NULL,
    "vehicleCode" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'BUS',
    "status" TEXT NOT NULL DEFAULT 'IN_SERVICE',
    "routeId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occupancy" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL DEFAULT 60,
    "currentStopId" TEXT,
    "nextStopId" TEXT,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "healthStatus" TEXT NOT NULL DEFAULT 'HEALTHY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransitVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignalOverride_junctionId_key" ON "SignalOverride"("junctionId");

-- CreateIndex
CREATE INDEX "AuditLog_junctionId_timestamp_idx" ON "AuditLog"("junctionId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_incidentId_timestamp_idx" ON "AuditLog"("incidentId", "timestamp");

-- CreateIndex
CREATE INDEX "TrafficReading_junctionId_timestamp_idx" ON "TrafficReading"("junctionId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_referenceId_key" ON "Incident"("referenceId");

-- CreateIndex
CREATE INDEX "Incident_status_severity_idx" ON "Incident"("status", "severity");

-- CreateIndex
CREATE INDEX "WaterSensor_zoneId_timestamp_idx" ON "WaterSensor"("zoneId", "timestamp");

-- CreateIndex
CREATE INDEX "WaterReading_sensorId_timestamp_idx" ON "WaterReading"("sensorId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationSetting_key_key" ON "SimulationSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CityAsset_assetCode_key" ON "CityAsset"("assetCode");

-- CreateIndex
CREATE INDEX "CityAsset_assetType_idx" ON "CityAsset"("assetType");

-- CreateIndex
CREATE INDEX "CityAsset_category_idx" ON "CityAsset"("category");

-- CreateIndex
CREATE INDEX "CityAsset_refType_refId_idx" ON "CityAsset"("refType", "refId");

-- CreateIndex
CREATE INDEX "CityAsset_status_idx" ON "CityAsset"("status");

-- CreateIndex
CREATE INDEX "CityAsset_zoneId_idx" ON "CityAsset"("zoneId");

-- CreateIndex
CREATE INDEX "CityAsset_energyAssetId_idx" ON "CityAsset"("energyAssetId");

-- CreateIndex
CREATE INDEX "CityEvent_assetId_idx" ON "CityEvent"("assetId");

-- CreateIndex
CREATE INDEX "CityEvent_timestamp_idx" ON "CityEvent"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "CityEvent_zoneId_idx" ON "CityEvent"("zoneId");

-- CreateIndex
CREATE INDEX "GarbageBin_zoneId_idx" ON "GarbageBin"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "WasteVehicle_assetCode_key" ON "WasteVehicle"("assetCode");

-- CreateIndex
CREATE INDEX "WasteRoute_vehicleId_idx" ON "WasteRoute"("vehicleId");

-- CreateIndex
CREATE INDEX "WasteRouteStop_routeId_idx" ON "WasteRouteStop"("routeId");

-- CreateIndex
CREATE INDEX "WasteRouteStop_binId_idx" ON "WasteRouteStop"("binId");

-- CreateIndex
CREATE INDEX "StreetLight_zoneId_idx" ON "StreetLight"("zoneId");

-- CreateIndex
CREATE INDEX "StreetLight_energyAssetId_idx" ON "StreetLight"("energyAssetId");

-- CreateIndex
CREATE INDEX "EnergyAsset_zoneId_idx" ON "EnergyAsset"("zoneId");

-- CreateIndex
CREATE INDEX "EnergyAsset_parentId_idx" ON "EnergyAsset"("parentId");

-- CreateIndex
CREATE INDEX "TelemetrySample_assetId_timestamp_idx" ON "TelemetrySample"("assetId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "TelemetrySample_metric_timestamp_idx" ON "TelemetrySample"("metric", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "TelemetrySample_timestamp_idx" ON "TelemetrySample"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_incidentId_key" ON "WorkOrder"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "TransitRoute_routeCode_key" ON "TransitRoute"("routeCode");

-- CreateIndex
CREATE UNIQUE INDEX "TransitStop_stopCode_key" ON "TransitStop"("stopCode");

-- CreateIndex
CREATE INDEX "TransitStop_zoneId_idx" ON "TransitStop"("zoneId");

-- CreateIndex
CREATE INDEX "TransitRouteStop_routeId_idx" ON "TransitRouteStop"("routeId");

-- CreateIndex
CREATE INDEX "TransitRouteStop_stopId_idx" ON "TransitRouteStop"("stopId");

-- CreateIndex
CREATE UNIQUE INDEX "TransitRouteStop_routeId_stopIndex_key" ON "TransitRouteStop"("routeId", "stopIndex");

-- CreateIndex
CREATE INDEX "TransitTrip_routeId_idx" ON "TransitTrip"("routeId");

-- CreateIndex
CREATE INDEX "TransitTrip_vehicleId_idx" ON "TransitTrip"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "TransitVehicle_vehicleCode_key" ON "TransitVehicle"("vehicleCode");

-- CreateIndex
CREATE INDEX "TransitVehicle_routeId_idx" ON "TransitVehicle"("routeId");

-- AddForeignKey
ALTER TABLE "Junction" ADD CONSTRAINT "Junction_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalOverride" ADD CONSTRAINT "SignalOverride_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficReading" ADD CONSTRAINT "TrafficReading_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "EmergencyUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterSensor" ADD CONSTRAINT "WaterSensor_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterReading" ADD CONSTRAINT "WaterReading_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "WaterSensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CCTVFeed" ADD CONSTRAINT "CCTVFeed_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityAsset" ADD CONSTRAINT "CityAsset_energyAssetId_fkey" FOREIGN KEY ("energyAssetId") REFERENCES "EnergyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityEvent" ADD CONSTRAINT "CityEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CityAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityEvent" ADD CONSTRAINT "CityEvent_relatedIncidentId_fkey" FOREIGN KEY ("relatedIncidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityEvent" ADD CONSTRAINT "CityEvent_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarbageBin" ADD CONSTRAINT "GarbageBin_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "WasteVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarbageBin" ADD CONSTRAINT "GarbageBin_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRoute" ADD CONSTRAINT "WasteRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "WasteVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRouteStop" ADD CONSTRAINT "WasteRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "WasteRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRouteStop" ADD CONSTRAINT "WasteRouteStop_binId_fkey" FOREIGN KEY ("binId") REFERENCES "GarbageBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetLight" ADD CONSTRAINT "StreetLight_energyAssetId_fkey" FOREIGN KEY ("energyAssetId") REFERENCES "EnergyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreetLight" ADD CONSTRAINT "StreetLight_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyAsset" ADD CONSTRAINT "EnergyAsset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EnergyAsset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EnergyAsset" ADD CONSTRAINT "EnergyAsset_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetrySample" ADD CONSTRAINT "TelemetrySample_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CityAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitStop" ADD CONSTRAINT "TransitStop_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitRouteStop" ADD CONSTRAINT "TransitRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransitRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitRouteStop" ADD CONSTRAINT "TransitRouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TransitStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitTrip" ADD CONSTRAINT "TransitTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransitRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitTrip" ADD CONSTRAINT "TransitTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransitVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitVehicle" ADD CONSTRAINT "TransitVehicle_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransitRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
