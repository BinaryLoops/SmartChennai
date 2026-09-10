-- CreateEnum
CREATE TYPE "Role" AS ENUM ('citizen', 'operator', 'dept_head', 'dm', 'super_admin');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('traffic', 'fire', 'medical', 'flood');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('reported', 'verified', 'dispatched', 'resolved');

-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('citizen', 'sensor', 'department');

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

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrafficReading_junctionId_timestamp_idx" ON "TrafficReading"("junctionId", "timestamp");

-- CreateIndex
CREATE INDEX "Incident_status_severity_idx" ON "Incident"("status", "severity");

-- CreateIndex
CREATE INDEX "WaterSensor_zoneId_timestamp_idx" ON "WaterSensor"("zoneId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationSetting_key_key" ON "SimulationSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Junction" ADD CONSTRAINT "Junction_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficReading" ADD CONSTRAINT "TrafficReading_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterSensor" ADD CONSTRAINT "WaterSensor_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CCTVFeed" ADD CONSTRAINT "CCTVFeed_junctionId_fkey" FOREIGN KEY ("junctionId") REFERENCES "Junction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
