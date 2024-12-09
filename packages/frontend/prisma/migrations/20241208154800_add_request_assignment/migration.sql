-- Add assigned_to field to Request table
ALTER TABLE "Request" ADD COLUMN "assigned_to" TEXT;

-- Add foreign key constraint
ALTER TABLE "Request" ADD CONSTRAINT "Request_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for assigned_to
CREATE INDEX "Request_assigned_to_idx" ON "Request"("assigned_to"); 