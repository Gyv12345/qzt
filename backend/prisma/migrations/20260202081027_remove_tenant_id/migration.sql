/*
  Warnings:

  - You are about to drop the column `tenantId` on the `conditions` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `contracts` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `follow_records` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `log_details` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `logs` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `product_flows` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `service_teams` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `triggers` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `tenantId` on the `workflows` table. All the data in the column will be lost.

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
    CONSTRAINT "conditions_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_conditions" ("field", "id", "logic", "operator", "parentId", "triggerId", "value") SELECT "field", "id", "logic", "operator", "parentId", "triggerId", "value" FROM "conditions";
DROP TABLE "conditions";
ALTER TABLE "new_conditions" RENAME TO "conditions";
CREATE INDEX "conditions_triggerId_idx" ON "conditions"("triggerId");
CREATE TABLE "new_contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "serviceStart" DATETIME NOT NULL,
    "serviceEnd" DATETIME NOT NULL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contracts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contracts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_contracts" ("amount", "contractNo", "createdAt", "customerId", "id", "paidAmount", "productId", "remark", "serviceEnd", "serviceStart", "status", "updatedAt") SELECT "amount", "contractNo", "createdAt", "customerId", "id", "paidAmount", "productId", "remark", "serviceEnd", "serviceStart", "status", "updatedAt" FROM "contracts";
DROP TABLE "contracts";
ALTER TABLE "new_contracts" RENAME TO "contracts";
CREATE UNIQUE INDEX "contracts_contractNo_key" ON "contracts"("contractNo");
CREATE INDEX "contracts_customerId_idx" ON "contracts"("customerId");
CREATE INDEX "contracts_status_idx" ON "contracts"("status");
CREATE TABLE "new_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "customerLevel" INTEGER NOT NULL DEFAULT 0,
    "sourceChannel" INTEGER,
    "followUserId" TEXT,
    "tags" TEXT,
    "remark" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_customers" ("address", "companyName", "contactEmail", "contactName", "contactPhone", "createdAt", "customerLevel", "followUserId", "id", "name", "remark", "sourceChannel", "status", "tags", "updatedAt") SELECT "address", "companyName", "contactEmail", "contactName", "contactPhone", "createdAt", "customerLevel", "followUserId", "id", "name", "remark", "sourceChannel", "status", "tags", "updatedAt" FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE INDEX "customers_followUserId_idx" ON "customers"("followUserId");
CREATE INDEX "customers_customerLevel_idx" ON "customers"("customerLevel");
CREATE TABLE "new_follow_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "nextTime" DATETIME,
    "images" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "follow_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "follow_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_follow_records" ("content", "createdAt", "customerId", "id", "images", "nextTime", "type", "updatedAt", "userId") SELECT "content", "createdAt", "customerId", "id", "images", "nextTime", "type", "updatedAt", "userId" FROM "follow_records";
DROP TABLE "follow_records";
ALTER TABLE "new_follow_records" RENAME TO "follow_records";
CREATE INDEX "follow_records_customerId_idx" ON "follow_records"("customerId");
CREATE INDEX "follow_records_userId_idx" ON "follow_records"("userId");
CREATE TABLE "new_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "contractId" TEXT,
    "amount" REAL NOT NULL,
    "count" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "isOverLimit" BOOLEAN NOT NULL DEFAULT false,
    "overAmount" REAL,
    "overCount" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_invoices" ("amount", "contractId", "count", "createdAt", "customerId", "id", "isOverLimit", "month", "overAmount", "overCount", "remark", "updatedAt") SELECT "amount", "contractId", "count", "createdAt", "customerId", "id", "isOverLimit", "month", "overAmount", "overCount", "remark", "updatedAt" FROM "invoices";
DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";
CREATE INDEX "invoices_customerId_month_idx" ON "invoices"("customerId", "month");
CREATE TABLE "new_log_details" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "log_details_logId_fkey" FOREIGN KEY ("logId") REFERENCES "logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_log_details" ("actionType", "config", "createdAt", "error", "id", "logId", "result", "status", "workflowId") SELECT "actionType", "config", "createdAt", "error", "id", "logId", "result", "status", "workflowId" FROM "log_details";
DROP TABLE "log_details";
ALTER TABLE "new_log_details" RENAME TO "log_details";
CREATE INDEX "log_details_logId_idx" ON "log_details"("logId");
CREATE TABLE "new_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerId" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_logs" ("createdAt", "duration", "entityId", "entityType", "error", "id", "status", "triggerId") SELECT "createdAt", "duration", "entityId", "entityType", "error", "id", "status", "triggerId" FROM "logs";
DROP TABLE "logs";
ALTER TABLE "new_logs" RENAME TO "logs";
CREATE INDEX "logs_triggerId_createdAt_idx" ON "logs"("triggerId", "createdAt");
CREATE TABLE "new_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "voucherUrl" TEXT,
    "payTime" DATETIME,
    "status" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payments" ("amount", "contractId", "createdAt", "id", "method", "payTime", "remark", "status", "updatedAt", "voucherUrl") SELECT "amount", "contractId", "createdAt", "id", "method", "payTime", "remark", "status", "updatedAt", "voucherUrl" FROM "payments";
DROP TABLE "payments";
ALTER TABLE "new_payments" RENAME TO "payments";
CREATE INDEX "payments_contractId_idx" ON "payments"("contractId");
CREATE TABLE "new_product_flows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "product_flows_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_product_flows" ("config", "createdAt", "enabled", "id", "name", "productId", "type", "updatedAt") SELECT "config", "createdAt", "enabled", "id", "name", "productId", "type", "updatedAt" FROM "product_flows";
DROP TABLE "product_flows";
ALTER TABLE "new_product_flows" RENAME TO "product_flows";
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "invoiceLimit" REAL NOT NULL DEFAULT 0,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "overLimitPrice" REAL NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("code", "createdAt", "description", "id", "invoiceCount", "invoiceLimit", "name", "overLimitPrice", "price", "status", "updatedAt") SELECT "code", "createdAt", "description", "id", "invoiceCount", "invoiceLimit", "name", "overLimitPrice", "price", "status", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
CREATE TABLE "new_service_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_teams_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_teams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_service_teams" ("createdAt", "customerId", "id", "roleCode", "userId") SELECT "createdAt", "customerId", "id", "roleCode", "userId" FROM "service_teams";
DROP TABLE "service_teams";
ALTER TABLE "new_service_teams" RENAME TO "service_teams";
CREATE INDEX "service_teams_userId_idx" ON "service_teams"("userId");
CREATE UNIQUE INDEX "service_teams_customerId_userId_roleCode_key" ON "service_teams"("customerId", "userId", "roleCode");
CREATE TABLE "new_triggers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_triggers" ("code", "createdAt", "enabled", "entityType", "id", "name", "type", "updatedAt") SELECT "code", "createdAt", "enabled", "entityType", "id", "name", "type", "updatedAt" FROM "triggers";
DROP TABLE "triggers";
ALTER TABLE "new_triggers" RENAME TO "triggers";
CREATE UNIQUE INDEX "triggers_code_key" ON "triggers"("code");
CREATE INDEX "triggers_entityType_idx" ON "triggers"("entityType");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatar", "createdAt", "email", "id", "name", "password", "phone", "status", "updatedAt", "username") SELECT "avatar", "createdAt", "email", "id", "name", "password", "phone", "status", "updatedAt", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE TABLE "new_workflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "workflows_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workflows" ("actionType", "config", "enabled", "id", "order", "triggerId") SELECT "actionType", "config", "enabled", "id", "order", "triggerId" FROM "workflows";
DROP TABLE "workflows";
ALTER TABLE "new_workflows" RENAME TO "workflows";
CREATE INDEX "workflows_triggerId_idx" ON "workflows"("triggerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
