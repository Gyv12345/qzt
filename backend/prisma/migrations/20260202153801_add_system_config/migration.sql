-- CreateTable
CREATE TABLE "common_phrases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "bank" TEXT,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "common_phrases_userId_idx" ON "common_phrases"("userId");

-- CreateIndex
CREATE INDEX "common_phrases_category_idx" ON "common_phrases"("category");
