-- Create AuthToken table
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- Create RequestTimeline table
CREATE TABLE "RequestTimeline" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestTimeline_pkey" PRIMARY KEY ("id")
);

-- Create StatusHistory table
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE UNIQUE INDEX "AuthToken_token_key" ON "AuthToken"("token");
CREATE INDEX "AuthToken_user_id_type_idx" ON "AuthToken"("user_id", "type");
CREATE INDEX "AuthToken_token_type_idx" ON "AuthToken"("token", "type");
CREATE INDEX "RequestTimeline_request_id_idx" ON "RequestTimeline"("request_id");
CREATE INDEX "RequestTimeline_operator_id_idx" ON "RequestTimeline"("operator_id");
CREATE INDEX "StatusHistory_entity_type_entity_id_idx" ON "StatusHistory"("entity_type", "entity_id");
CREATE INDEX "StatusHistory_changed_by_idx" ON "StatusHistory"("changed_by");

-- Add foreign key constraints
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestTimeline" ADD CONSTRAINT "RequestTimeline_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestTimeline" ADD CONSTRAINT "RequestTimeline_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 