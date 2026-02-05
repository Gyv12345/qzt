-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "wechat" TEXT,
    "position" TEXT,
    "department" TEXT,
    "avatar" TEXT,
    "birthdate" DATETIME,
    "tags" TEXT,
    "remark" TEXT,
    "ownerUserId" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contacts_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_contacts" ("avatar", "birthdate", "createdAt", "department", "email", "id", "name", "phone", "position", "remark", "status", "tags", "updatedAt", "wechat") SELECT "avatar", "birthdate", "createdAt", "department", "email", "id", "name", "phone", "position", "remark", "status", "tags", "updatedAt", "wechat" FROM "contacts";
DROP TABLE "contacts";
ALTER TABLE "new_contacts" RENAME TO "contacts";
CREATE UNIQUE INDEX "contacts_phone_key" ON "contacts"("phone");
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");
CREATE INDEX "contacts_ownerUserId_idx" ON "contacts"("ownerUserId");
CREATE INDEX "contacts_status_idx" ON "contacts"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
