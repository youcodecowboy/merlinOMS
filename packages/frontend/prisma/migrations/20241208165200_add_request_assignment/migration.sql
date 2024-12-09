-- Add assigned_to field to Request table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Request' AND column_name = 'assigned_to') THEN
        ALTER TABLE "Request" ADD COLUMN "assigned_to" TEXT;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Request_assigned_to_fkey') THEN
        ALTER TABLE "Request" ADD CONSTRAINT "Request_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index if it doesn't exist
CREATE INDEX IF NOT EXISTS "Request_assigned_to_idx" ON "Request"("assigned_to"); 