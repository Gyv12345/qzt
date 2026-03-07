-- CreateTable
CREATE TABLE "webhook_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_templates_code_key" ON "webhook_templates"("code");

-- CreateIndex
CREATE INDEX "webhook_templates_platform_idx" ON "webhook_templates"("platform");

-- CreateIndex
CREATE INDEX "webhook_templates_code_idx" ON "webhook_templates"("code");
