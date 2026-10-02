-- CreateEnum
CREATE TYPE "PredictionRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "PredictionSnapshot" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metric" TEXT NOT NULL,
    "horizonMinutes" INTEGER NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "riskLevel" "PredictionRiskLevel" NOT NULL DEFAULT 'LOW',
    "method" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "actualValue" DOUBLE PRECISION,
    "error" DOUBLE PRECISION,
    "scenarioId" TEXT,

    CONSTRAINT "PredictionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PredictionSnapshot_domain_entityId_generatedAt_idx" ON "PredictionSnapshot"("domain", "entityId", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "PredictionSnapshot_metric_generatedAt_idx" ON "PredictionSnapshot"("metric", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "PredictionSnapshot_expiresAt_idx" ON "PredictionSnapshot"("expiresAt");

-- CreateIndex
CREATE INDEX "PredictionSnapshot_riskLevel_generatedAt_idx" ON "PredictionSnapshot"("riskLevel", "generatedAt" DESC);

