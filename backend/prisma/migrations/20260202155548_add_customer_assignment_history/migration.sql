-- CreateTable
CREATE TABLE "customer_assignment_histories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "previousFollowUserId" TEXT,
    "newFollowUserId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_assignment_histories_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "customer_assignment_histories_customerId_idx" ON "customer_assignment_histories"("customerId");

-- CreateIndex
CREATE INDEX "customer_assignment_histories_newFollowUserId_idx" ON "customer_assignment_histories"("newFollowUserId");

-- CreateIndex
CREATE INDEX "customer_assignment_histories_assignedBy_idx" ON "customer_assignment_histories"("assignedBy");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");
