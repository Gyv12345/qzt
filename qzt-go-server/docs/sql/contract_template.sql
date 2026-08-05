-- ============================================================
-- 合同模板（正文套打）
-- ------------------------------------------------------------
-- crm_contract_template：预设带 ${变量} 占位符的 Markdown 正文。
--   打印合同时选模板 → 后端用合同实际数据替换变量 → 输出可打印文档。
--   模板与合同分离（不改 crm_contract），是独立的格式化文档资源。
-- enabled：1=启用 0=停用（列表默认只查启用，可查停用）。
-- 权限/审批：配置类资源，不走数据权限，不接审批。
--
-- 变量（系统内置变量，TemplateRenderer 正则 \${(\w+)} 替换）：
--   合同 contractNo/contractName/totalAmount/receivedAmount/unreceivedAmount/signedDate/startDate/endDate/stage
--   客户 customerName/customerNo/customerLevel/customerSource/customerIndustry
--   工商抬头 titleName/taxNo/bankName/bankAccount/titleAddress/titlePhone
--   负责人 ownerName/ownerPhone
--   系统 currentDate(yyyy-MM-dd)
-- ============================================================

-- 1. 建表（幂等）
SET @tbl := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_contract_template');
SET @ddl := IF(@tbl = 0,
  'CREATE TABLE crm_contract_template (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT ''模板名称'',
    content LONGTEXT NOT NULL COMMENT ''Markdown正文(含${变量}占位符)'',
    remark VARCHAR(500) NULL COMMENT ''说明'',
    enabled TINYINT NOT NULL DEFAULT 1 COMMENT ''1启用 0停用'',
    owner_id BIGINT UNSIGNED NULL COMMENT ''创建人'',
    created_at DATETIME(3) NULL,
    updated_at DATETIME(3) NULL,
    deleted_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    KEY idx_ct_enabled (enabled, deleted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=''合同模板''',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 菜单（挂在「合同管理」id=89 下）
INSERT INTO sys_menu (id, parent_id, name, path, component, icon, sort, type, permission, visible, status)
VALUES
  (542, 89, '合同模板', '/crm/contract-template', 'crm/contract-template/index', 'file-text', 30, 1, 'crm:contractTemplate:list', 1, 1),
  (543, 542, '模板新增', NULL, NULL, '#', 1, 2, 'crm:contractTemplate:add', 0, 1),
  (544, 542, '模板修改', NULL, NULL, '#', 2, 2, 'crm:contractTemplate:edit', 0, 1),
  (545, 542, '模板删除', NULL, NULL, '#', 3, 2, 'crm:contractTemplate:delete', 0, 1)
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  path = VALUES(path),
  component = VALUES(component),
  permission = VALUES(permission),
  deleted_at = NULL,
  updated_at = NOW(3);

-- 3. 给超管角色（id=1）授权
INSERT IGNORE INTO sys_role_menu (sys_role_id, sys_menu_id) VALUES
  (1, 542), (1, 543), (1, 544), (1, 545);
