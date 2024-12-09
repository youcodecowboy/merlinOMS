-- CreateTable
CREATE TABLE "MaterialStock" (
    "id" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentQuantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderPoint" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialConsumption" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialStock_materialCode_key" ON "MaterialStock"("materialCode");

-- CreateIndex
CREATE INDEX "MaterialStock_materialCode_idx" ON "MaterialStock"("materialCode");

-- CreateIndex
CREATE INDEX "MaterialStock_type_idx" ON "MaterialStock"("type");

-- CreateIndex
CREATE INDEX "MaterialConsumption_materialId_idx" ON "MaterialConsumption"("materialId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_requestId_idx" ON "MaterialConsumption"("requestId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_type_idx" ON "MaterialConsumption"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_type_idx" ON "Location"("type");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
