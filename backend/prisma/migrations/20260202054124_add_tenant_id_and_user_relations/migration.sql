/*
  Warnings:

  - Added the required column `tenantId` to the `conditions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `log_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `workflows` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conditions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "logic" TEXT NOT NULL DEFAULT 'AND',
    "parentId" TEXT,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "conditions_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_conditions" ("field", "id", "logic", "operator", "parentId", "triggerId", "value") SELECT "field", "id", "logic", "operator", "parentId", "triggerId", "value" FROM "conditions";
DROP TABLE "conditions";
ALTER TABLE "new_conditions" RENAME TO "conditions";
CREATE INDEX "conditions_triggerId_idx" ON "conditions"("triggerId");
CREATE INDEX "conditions_tenantId_idx" ON "conditions"("tenantId");
CREATE TABLE "new_follow_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "nextTime" DATETIME,
    "images" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "follow_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "follow_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_follow_records" ("content", "createdAt", "customerId", "id", "images", "nextTime", "tenantId", "type", "updatedAt", "userId") SELECT "content", "createdAt", "customerId", "id", "images", "nextTime", "tenantId", "type", "updatedAt", "userId" FROM "follow_records";
DROP TABLE "follow_records";
ALTER TABLE "new_follow_records" RENAME TO "follow_records";
CREATE INDEX "follow_records_tenantId_customerId_idx" ON "follow_records"("tenantId", "customerId");
CREATE INDEX "follow_records_tenantId_userId_idx" ON "follow_records"("tenantId", "userId");
CREATE TABLE "new_log_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "log_details_logId_fkey" FOREIGN KEY ("logId") REFERENCES "logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_log_details" ("actionType", "config", "createdAt", "error", "id", "logId", "result", "status", "workflowId") SELECT "actionType", "config", "createdAt", "error", "id", "logId", "result", "status", "workflowId" FROM "log_details";
DROP TABLE "log_details";
ALTER TABLE "new_log_details" RENAME TO "log_details";
CREATE INDEX "log_details_logId_idx" ON "log_details"("logId");
CREATE INDEX "log_details_tenantId_idx" ON "log_details"("tenantId");
CREATE TABLE "new_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_logs" ("createdAt", "duration", "entityId", "entityType", "error", "id", "status", "triggerId") SELECT "createdAt", "duration", "entityId", "entityType", "error", "id", "status", "triggerId" FROM "logs";
DROP TABLE "logs";
ALTER TABLE "new_logs" RENAME TO "logs";
CREATE INDEX "logs_triggerId_createdAt_idx" ON "logs"("triggerId", "createdAt");
CREATE INDEX "logs_tenantId_idx" ON "logs"("tenantId");
CREATE TABLE "new_service_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_teams_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_teams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_service_teams" ("createdAt", "customerId", "id", "roleCode", "tenantId", "userId") SELECT "createdAt", "customerId", "id", "roleCode", "tenantId", "userId" FROM "service_teams";
DROP TABLE "service_teams";
ALTER TABLE "new_service_teams" RENAME TO "service_teams";
CREATE INDEX "service_teams_tenantId_idx" ON "service_teams"("tenantId");
CREATE INDEX "service_teams_tenantId_userId_idx" ON "service_teams"("tenantId", "userId");
CREATE UNIQUE INDEX "service_teams_customerId_userId_roleCode_key" ON "service_teams"("customerId", "userId", "roleCode");
CREATE TABLE "new_workflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "workflows_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workflows" ("actionType", "config", "enabled", "id", "order", "triggerId") SELECT "actionType", "config", "enabled", "id", "order", "triggerId" FROM "workflows";
DROP TABLE "workflows";
ALTER TABLE "new_workflows" RENAME TO "workflows";
CREATE INDEX "workflows_triggerId_idx" ON "workflows"("triggerId");
CREATE INDEX "workflows_tenantId_idx" ON "workflows"("tenantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
