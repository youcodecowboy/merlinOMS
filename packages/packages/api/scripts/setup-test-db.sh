#!/bin/bash

# Use codecowboy user
PGUSER=codecowboy

# Drop and recreate test database
psql -c "DROP DATABASE IF EXISTS oms_test;"
psql -c "CREATE DATABASE oms_test;"

# First create migrations table
psql -d oms_test -c "CREATE TABLE IF NOT EXISTS _prisma_migrations (id VARCHAR(36) PRIMARY KEY,checksum VARCHAR(64) NOT NULL,finished_at TIMESTAMP,migration_name VARCHAR(255) NOT NULL,logs TEXT,rolled_back_at TIMESTAMP,started_at TIMESTAMP NOT NULL DEFAULT now(),applied_steps_count INTEGER NOT NULL DEFAULT 0);"

# Then run migrations with force
DATABASE_URL="postgresql://codecowboy@localhost:5432/oms_test" pnpm prisma migrate reset --force --schema=../database/prisma/schema.prisma

# Run deploy again to ensure all migrations are applied
DATABASE_URL="postgresql://codecowboy@localhost:5432/oms_test" pnpm prisma migrate deploy --schema=../database/prisma/schema.prisma