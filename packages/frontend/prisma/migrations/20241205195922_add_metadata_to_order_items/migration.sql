-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "OrderItem_order_id_idx" ON "OrderItem"("order_id");
