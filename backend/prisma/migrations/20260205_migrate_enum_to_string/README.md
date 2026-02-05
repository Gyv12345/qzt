# Migration: Convert status/paymentMethod from Int to String enum

## Summary
This migration converts integer-based status fields and payment method to string enums for better type safety and readability.

## Changes

### Contract.status
- Before: Int (0=未付款, 1=部分付款, 2=已付款)
- After: String (UNPAID, PARTIAL, PAID)

### Payment.method
- Before: String ('1'=银行转账, '2'=微信, '3'=支付宝, '4'=现金)
- After: String (BANK_TRANSFER, WECHAT, ALIPAY, CASH)

### Payment.status
- Before: Int (0=待确认, 1=已确认)
- After: String (PENDING, CONFIRMED, CANCELLED)

### Contact.status
- Before: Int (1=启用, 0=禁用)
- After: String (ACTIVE, INACTIVE)

### Invoice
- Added status column: String (PENDING, ISSUED, CANCELLED)
- Added issuedAt column for the invoice date

## Rollback
To rollback this migration:
1. Add temporary columns with Int/String types
2. Migrate data back
3. Drop new columns, rename old ones back
