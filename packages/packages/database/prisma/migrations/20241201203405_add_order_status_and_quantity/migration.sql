/*
  Warnings:

  - The values [WASH,QC,PACKING] on the enum `BinType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `RequestTimeline` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BinType_new" AS ENUM ('STORAGE', 'PROCESSING', 'SHIPPING', 'TEMPORARY');
ALTER TABLE "Bin" ALTER COLUMN "type" TYPE "BinType_new" USING ("type"::text::"BinType_new");
ALTER TYPE "BinType" RENAME TO "BinType_old";
ALTER TYPE "BinType_new" RENAME TO "BinType";
DROP TYPE "BinType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "batch_id" TEXT;

-- AlterTable
ALTER TABLE "RequestTimeline" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'WAREHOUSE';

-- CreateTable
CREATE TABLE "Timeline" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRequest" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "ProductionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Timeline_requestId_idx" ON "Timeline"("requestId");

-- CreateIndex
CREATE INDEX "ProductionRequest_sku_status_idx" ON "ProductionRequest"("sku", "status");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
