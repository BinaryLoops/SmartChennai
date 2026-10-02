-- AlterTable
ALTER TABLE "EmergencyUnit" ADD COLUMN     "crewState" TEXT NOT NULL DEFAULT 'READY',
ADD COLUMN     "currentIncidentId" TEXT,
ADD COLUMN     "destinationFacilityId" TEXT,
ADD COLUMN     "eta" TIMESTAMP(3),
ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'AVAILABLE';

-- CreateTable
CREATE TABLE "HealthcareFacility" (
    "id" TEXT NOT NULL,
    "cityAssetId" TEXT NOT NULL,
    "facilityCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "zoneId" TEXT NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "icuBeds" INTEGER NOT NULL,
    "occupiedIcuBeds" INTEGER NOT NULL DEFAULT 0,
    "emergencyBeds" INTEGER NOT NULL,
    "occupiedEmergencyBeds" INTEGER NOT NULL DEFAULT 0,
    "ambulanceCapacity" INTEGER NOT NULL,
    "availableAmbulances" INTEGER NOT NULL DEFAULT 0,
    "staffAvailability" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "waitTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthcareFacility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthcareFacility_cityAssetId_key" ON "HealthcareFacility"("cityAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthcareFacility_facilityCode_key" ON "HealthcareFacility"("facilityCode");

-- CreateIndex
CREATE INDEX "HealthcareFacility_zoneId_idx" ON "HealthcareFacility"("zoneId");

-- CreateIndex
CREATE INDEX "HealthcareFacility_status_idx" ON "HealthcareFacility"("status");

-- AddForeignKey
ALTER TABLE "EmergencyUnit" ADD CONSTRAINT "EmergencyUnit_destinationFacilityId_fkey" FOREIGN KEY ("destinationFacilityId") REFERENCES "HealthcareFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthcareFacility" ADD CONSTRAINT "HealthcareFacility_cityAssetId_fkey" FOREIGN KEY ("cityAssetId") REFERENCES "CityAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthcareFacility" ADD CONSTRAINT "HealthcareFacility_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
