-- ============================================================
-- 业务表编号字段补齐
-- ------------------------------------------------------------
-- 为缺少编号的业务表补 _no 列(VARCHAR(64)),配合 numbergen 公共包自动生成编号。
-- 幂等:列已存在则跳过。
-- ============================================================

-- crm_opportunity.opportunity_no (商机编号)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_opportunity' AND COLUMN_NAME = 'opportunity_no');
SET @ddl := IF(@col = 0, 'ALTER TABLE crm_opportunity ADD COLUMN opportunity_no VARCHAR(64) NULL DEFAULT NULL COMMENT ''商机编号'' AFTER name', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- crm_customer_contact.contact_no (联系人编号)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_customer_contact' AND COLUMN_NAME = 'contact_no');
SET @ddl := IF(@col = 0, 'ALTER TABLE crm_customer_contact ADD COLUMN contact_no VARCHAR(64) NULL DEFAULT NULL COMMENT ''联系人编号'' AFTER name', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- follow_up_record.follow_no (跟进编号)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_record' AND COLUMN_NAME = 'follow_no');
SET @ddl := IF(@col = 0, 'ALTER TABLE follow_up_record ADD COLUMN follow_no VARCHAR(64) NULL DEFAULT NULL COMMENT ''跟进编号'' AFTER id', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- hrm_leave.leave_no (请假单号)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_leave' AND COLUMN_NAME = 'leave_no');
SET @ddl := IF(@col = 0, 'ALTER TABLE hrm_leave ADD COLUMN leave_no VARCHAR(64) NULL DEFAULT NULL COMMENT ''请假单号'' AFTER id', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- hrm_overtime.overtime_no (加班单号)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hrm_overtime' AND COLUMN_NAME = 'overtime_no');
SET @ddl := IF(@col = 0, 'ALTER TABLE hrm_overtime ADD COLUMN overtime_no VARCHAR(64) NULL DEFAULT NULL COMMENT ''加班单号'' AFTER id', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
