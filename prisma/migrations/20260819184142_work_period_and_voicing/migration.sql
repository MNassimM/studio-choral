-- CreateEnum
CREATE TYPE "MusicalPeriod" AS ENUM ('MEDIEVAL', 'RENAISSANCE', 'BAROQUE', 'CLASSICAL', 'ROMANTIC', 'MODERN', 'CONTEMPORARY');

-- AlterTable
ALTER TABLE "works" ADD COLUMN     "period" "MusicalPeriod",
ADD COLUMN     "voicing" TEXT;

-- CreateIndex
CREATE INDEX "works_period_idx" ON "works"("period");
