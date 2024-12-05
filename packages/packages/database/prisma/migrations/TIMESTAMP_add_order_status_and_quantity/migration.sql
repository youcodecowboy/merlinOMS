-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1; 