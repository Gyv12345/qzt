-- Migration: Convert status/paymentMethod from Int to String enum
-- This migration converts the following fields:
-- 1. Contract.status: Int (0,1,2) -> String (UNPAID, PARTIAL, PAID)
-- 2. Payment.method: String (1,2,3,4) -> String (BANK_TRANSFER, WECHAT, ALIPAY, CASH)
-- 3. Payment.status: Int (0,1) -> String (PENDING, CONFIRMED, CANCELLED)
-- 4. Contact.status: Int (0,1) -> String (ACTIVE, INACTIVE)
-- 5. Invoice.status: Add new field with default PENDING

-- Step 1: Add new temporary columns for the string enums
ALTER TABLE contracts ADD COLUMN status_new TEXT;
ALTER TABLE payments ADD COLUMN method_new TEXT;
ALTER TABLE payments ADD COLUMN status_new TEXT;
ALTER TABLE contacts ADD COLUMN status_new TEXT;

-- Step 2: Migrate Contract.status: 0->UNPAID, 1->PARTIAL, 2->PAID
UPDATE contracts SET status_new = CASE
  WHEN status = 0 THEN 'UNPAID'
  WHEN status = 1 THEN 'PARTIAL'
  WHEN status = 2 THEN 'PAID'
  ELSE 'UNPAID'
END;

-- Step 3: Migrate Payment.method: 1->BANK_TRANSFER, 2->WECHAT, 3->ALIPAY, 4->CASH
UPDATE payments SET method_new = CASE
  WHEN method = '1' THEN 'BANK_TRANSFER'
  WHEN method = '2' THEN 'WECHAT'
  WHEN method = '3' THEN 'ALIPAY'
  WHEN method = '4' THEN 'CASH'
  ELSE 'BANK_TRANSFER'
END;

-- Step 4: Migrate Payment.status: 0->PENDING, 1->CONFIRMED
UPDATE payments SET status_new = CASE
  WHEN status = 0 THEN 'PENDING'
  WHEN status = 1 THEN 'CONFIRMED'
  ELSE 'PENDING'
END;

-- Step 5: Migrate Contact.status: 1->ACTIVE, 0->INACTIVE
UPDATE contacts SET status_new = CASE
  WHEN status = 1 THEN 'ACTIVE'
  WHEN status = 0 THEN 'INACTIVE'
  ELSE 'ACTIVE'
END;

-- Step 6: Drop old columns and rename new ones
-- Contract
ALTER TABLE contracts DROP COLUMN status;
ALTER TABLE contracts RENAME COLUMN status_new TO status;

-- Payment
ALTER TABLE payments DROP COLUMN method;
ALTER TABLE payments RENAME COLUMN method_new TO method;
ALTER TABLE payments DROP COLUMN status;
ALTER TABLE payments RENAME COLUMN status_new TO status;

-- Contact
ALTER TABLE contacts DROP COLUMN status;
ALTER TABLE contacts RENAME COLUMN status_new TO status;

-- Step 7: Add Invoice.status column (new field, no migration needed)
ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'PENDING';
ALTER TABLE invoices ADD COLUMN issued_at DATETIME;
