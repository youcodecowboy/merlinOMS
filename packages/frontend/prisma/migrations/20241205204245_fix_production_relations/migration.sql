/*
  Warnings:

  - You are about to drop the column `batch_id` on the `ProductionRequest` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `ProductionRequest` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `ProductionRequest` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `ProductionRequest` table. All the data in the column will be lost.
  - Added the required column `orderIdsJson` to the `ProductionRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProductionRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProductionRequest" DROP CONSTRAINT "ProductionRequest_batch_id_fkey";

-- DropIndex
DROP INDEX "ProductionRequest_sku_status_idx";

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "ProductionRequest" DROP COLUMN "batch_id",
DROP COLUMN "created_at",
DROP COLUMN "metadata",
DROP COLUMN "updated_at",
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "legacyBatchId" TEXT,
ADD COLUMN     "orderIdsJson" TEXT NOT NULL,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'PRODUCTION',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qrCodesPdf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternRequest" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatternRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatternRequest_batchId_key" ON "PatternRequest"("batchId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRequest" ADD CONSTRAINT "ProductionRequest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRequest" ADD CONSTRAINT "ProductionRequest_legacyBatchId_fkey" FOREIGN KEY ("legacyBatchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternRequest" ADD CONSTRAINT "PatternRequest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
