-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('ROAD', 'WATER', 'DRAINAGE', 'STREETLIGHT', 'WASTE', 'TRAFFIC', 'CCTV', 'PUBLIC_FACILITY', 'TRANSIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('SUBMITTED', 'RECEIVED', 'VERIFIED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateTable
CREATE TABLE "CitizenServiceRequest" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "sessionToken" TEXT,
    "category" "ServiceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "zoneId" TEXT,
    "ward" TEXT,
    "assetId" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "department" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "triagedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "inProgressAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "incidentId" TEXT,
    "workOrderId" TEXT,
    "rating" INTEGER,
    "ratingFeedback" TEXT,
    "ratedAt" TIMESTAMP(3),

    CONSTRAINT "CitizenServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestUpdate" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CitizenServiceRequest_referenceCode_key" ON "CitizenServiceRequest"("referenceCode");

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_sessionToken_idx" ON "CitizenServiceRequest"("sessionToken");

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_status_idx" ON "CitizenServiceRequest"("status");

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_category_idx" ON "CitizenServiceRequest"("category");

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_zoneId_idx" ON "CitizenServiceRequest"("zoneId");

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_assetId_idx" ON "CitizenServiceRequest"("assetId");

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_submittedAt_idx" ON "CitizenServiceRequest"("submittedAt" DESC);

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_incidentId_idx" ON "CitizenServiceRequest"("incidentId");

-- CreateIndex
CREATE INDEX "CitizenServiceRequest_workOrderId_idx" ON "CitizenServiceRequest"("workOrderId");

-- CreateIndex
CREATE INDEX "ServiceRequestUpdate_requestId_idx" ON "ServiceRequestUpdate"("requestId");

-- AddForeignKey
ALTER TABLE "CitizenServiceRequest" ADD CONSTRAINT "CitizenServiceRequest_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenServiceRequest" ADD CONSTRAINT "CitizenServiceRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CityAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenServiceRequest" ADD CONSTRAINT "CitizenServiceRequest_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenServiceRequest" ADD CONSTRAINT "CitizenServiceRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestUpdate" ADD CONSTRAINT "ServiceRequestUpdate_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CitizenServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
