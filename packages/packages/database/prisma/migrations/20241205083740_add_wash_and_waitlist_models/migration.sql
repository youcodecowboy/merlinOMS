-- CreateEnum
CREATE TYPE "WashGroup" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "WashCode" AS ENUM ('RAW', 'BRW', 'STA', 'IND', 'ONX', 'JAG');

-- AlterTable
ALTER TABLE "ProductionRequest" ADD COLUMN     "batch_id" TEXT;

-- CreateTable
CREATE TABLE "ProductionWaitlist" (
    "id" TEXT NOT NULL,
    "production_request_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SKUComponent" (
    "id" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "waist" INTEGER NOT NULL,
    "shape" TEXT NOT NULL,
    "length" INTEGER NOT NULL,
    "wash" "WashCode" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SKUComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WashMapping" (
    "id" TEXT NOT NULL,
    "target_wash" TEXT NOT NULL,
    "source_wash" TEXT NOT NULL,
    "wash_group" "WashGroup" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WashMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionWaitlist_order_item_id_key" ON "ProductionWaitlist"("order_item_id");

-- CreateIndex
CREATE INDEX "ProductionWaitlist_production_request_id_position_idx" ON "ProductionWaitlist"("production_request_id", "position");

-- CreateIndex
CREATE INDEX "SKUComponent_style_waist_shape_idx" ON "SKUComponent"("style", "waist", "shape");

-- CreateIndex
CREATE UNIQUE INDEX "SKUComponent_style_waist_shape_length_wash_key" ON "SKUComponent"("style", "waist", "shape", "length", "wash");

-- CreateIndex
CREATE INDEX "WashMapping_wash_group_idx" ON "WashMapping"("wash_group");

-- CreateIndex
CREATE UNIQUE INDEX "WashMapping_target_wash_source_wash_key" ON "WashMapping"("target_wash", "source_wash");

-- AddForeignKey
ALTER TABLE "ProductionRequest" ADD CONSTRAINT "ProductionRequest_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionWaitlist" ADD CONSTRAINT "ProductionWaitlist_production_request_id_fkey" FOREIGN KEY ("production_request_id") REFERENCES "ProductionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionWaitlist" ADD CONSTRAINT "ProductionWaitlist_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
