-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_incidentId_fkey";

-- DropIndex
DROP INDEX "WorkOrder_incidentId_key";

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "actualCompletion" TIMESTAMP(3),
ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedCrewId" TEXT,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedCompletion" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "slaDueAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "workOrderCode" TEXT NOT NULL,
ADD COLUMN     "zoneId" TEXT,
ALTER COLUMN "incidentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "InfrastructureProject" (
    "id" TEXT NOT NULL,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "zoneId" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetPlanned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractorName" TEXT,
    "department" TEXT,
    "projectManager" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "InfrastructureProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceCrew" (
    "id" TEXT NOT NULL,
    "crewCode" TEXT NOT NULL,
    "department" TEXT,
    "specialization" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "currentWorkOrderId" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderUpdate" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProjectAssets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InfrastructureProject_projectCode_key" ON "InfrastructureProject"("projectCode");

-- CreateIndex
CREATE INDEX "InfrastructureProject_zoneId_idx" ON "InfrastructureProject"("zoneId");

-- CreateIndex
CREATE INDEX "InfrastructureProject_parentId_idx" ON "InfrastructureProject"("parentId");

-- CreateIndex
CREATE INDEX "InfrastructureProject_status_idx" ON "InfrastructureProject"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceCrew_crewCode_key" ON "MaintenanceCrew"("crewCode");

-- CreateIndex
CREATE INDEX "MaintenanceCrew_status_idx" ON "MaintenanceCrew"("status");

-- CreateIndex
CREATE INDEX "MaintenanceCrew_specialization_idx" ON "MaintenanceCrew"("specialization");

-- CreateIndex
CREATE INDEX "WorkOrderUpdate_workOrderId_idx" ON "WorkOrderUpdate"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectAssets_AB_unique" ON "_ProjectAssets"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectAssets_B_index" ON "_ProjectAssets"("B");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_workOrderCode_key" ON "WorkOrder"("workOrderCode");

-- CreateIndex
CREATE INDEX "WorkOrder_incidentId_idx" ON "WorkOrder"("incidentId");

-- CreateIndex
CREATE INDEX "WorkOrder_assetId_idx" ON "WorkOrder"("assetId");

-- CreateIndex
CREATE INDEX "WorkOrder_projectId_idx" ON "WorkOrder"("projectId");

-- CreateIndex
CREATE INDEX "WorkOrder_zoneId_idx" ON "WorkOrder"("zoneId");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedCrewId_idx" ON "WorkOrder"("assignedCrewId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CityAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InfrastructureProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedCrewId_fkey" FOREIGN KEY ("assignedCrewId") REFERENCES "MaintenanceCrew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfrastructureProject" ADD CONSTRAINT "InfrastructureProject_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "InfrastructureProject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InfrastructureProject" ADD CONSTRAINT "InfrastructureProject_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderUpdate" ADD CONSTRAINT "WorkOrderUpdate_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectAssets" ADD CONSTRAINT "_ProjectAssets_A_fkey" FOREIGN KEY ("A") REFERENCES "CityAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectAssets" ADD CONSTRAINT "_ProjectAssets_B_fkey" FOREIGN KEY ("B") REFERENCES "InfrastructureProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

