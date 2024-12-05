/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status1` on the `InventoryItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status2` on the `InventoryItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `OrderItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "status1",
ADD COLUMN     "status1" TEXT NOT NULL,
DROP COLUMN "status2",
ADD COLUMN     "status2" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryItem_status1_status2_idx" ON "InventoryItem"("status1", "status2");
