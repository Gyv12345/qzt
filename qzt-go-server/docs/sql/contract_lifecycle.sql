-- ======================================================================
-- contract_lifecycle.sql P30-#2 合同生命周期(变更留痕/归档/分类/统计/到期提醒)
-- ----------------------------------------------------------------------
-- 用途:
--   1) 新表 crm_contract_change 合同变更留痕(金额/结束日期变更前后快照);
--   2) crm_contract 追加 4 列: category / archived_at / archived_by / expire_reminded_on;
--   3) sys_api 5 条新端点(ID 区间 866-870)+ 绑定到现有合同菜单(89 列表 / 91 编辑);
--   4) sys_config 种子 contract.expire_remind_days(group=contract, 默认 30, 热生效);
--   5) sys_job id=29 contractExpireRemind 每日 09:30 到期提醒。
--
-- ID 分配区间:
--   sys_api 866-870(执行前已复核 SELECT MAX(id)=865,无冲突)
--   sys_job  29(执行前已复核 MAX(id)=28,无冲突)
--   sys_config 用固定 key 幂等(NOT EXISTS 防重,不占显式 ID)
--   sys_menu_api 用 (sys_menu_id, sys_api_id) 幂等绑定
--
-- 执行方式: DBX MCP 连「我的阿里云数据库」 database=qztgo 分段执行;
--   ⚠️ ALTER 段为普通语句写法(未用 PREPARE 块),主会话执行前先
--      information_schema.COLUMNS 判列,列已存在则跳过该条,逐条手动执行。
--
-- 决策备注: 电子签不做(2026-08 既定决策),本文件不涉及任何电子签表/字段。
-- ======================================================================

-- ──────────────────────────────────────────────────────────────────────
-- 1. 新表 crm_contract_change(幂等)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_contract_change (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contract_id BIGINT UNSIGNED NOT NULL COMMENT '合同ID',
  before_amount DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '变更前金额',
  after_amount DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT '变更后金额',
  before_end_date DATE NULL COMMENT '变更前结束日期',
  after_end_date DATE NULL COMMENT '变更后结束日期',
  reason VARCHAR(255) NOT NULL COMMENT '变更原因',
  created_by BIGINT UNSIGNED NOT NULL COMMENT '操作人',
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_cc_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM 合同变更记录';

-- ──────────────────────────────────────────────────────────────────────
-- 2. crm_contract 追加列(普通 ALTER 语句,逐条判列执行;已存在则跳过)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE crm_contract
  ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT '' COMMENT '合同分类';
ALTER TABLE crm_contract
  ADD COLUMN archived_at DATETIME(3) NULL COMMENT '归档时间';
ALTER TABLE crm_contract
  ADD COLUMN archived_by BIGINT UNSIGNED NULL COMMENT '归档人';
ALTER TABLE crm_contract
  ADD COLUMN expire_reminded_on DATE NULL COMMENT '到期提醒已提醒日(防重)';

-- ──────────────────────────────────────────────────────────────────────
-- 3. sys_api 登记(显式 ID 866-870,ON DUPLICATE 幂等)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO sys_api (id, `path`, `method`, `group`, description) VALUES
  (866, '/crm/contracts/stats', 'GET', '合同管理', '合同统计(总额/分阶段/本月签订/临期)'),
  (867, '/crm/contracts/:id/changes', 'GET', '合同管理', '合同变更记录列表'),
  (868, '/crm/contracts/:id/changes', 'POST', '合同管理', '提交合同变更(金额/结束日期)'),
  (869, '/crm/contracts/:id/archive', 'POST', '合同管理', '合同归档'),
  (870, '/crm/contracts/:id/unarchive', 'POST', '合同管理', '合同取消归档')
ON DUPLICATE KEY UPDATE
  `group` = VALUES(`group`), description = VALUES(description), deleted_at = NULL;

-- 绑定菜单:查询类挂「合同管理」菜单(89, crm:contract:list);
-- 写操作挂「编辑合同」按钮(91, crm:contract:edit),复用现有合同权限码语义。
INSERT INTO sys_menu_api (sys_menu_id, sys_api_id) VALUES
  (89, 866), (89, 867), (91, 868), (91, 869), (91, 870)
ON DUPLICATE KEY UPDATE sys_menu_id = VALUES(sys_menu_id);

-- ──────────────────────────────────────────────────────────────────────
-- 4. sys_config 种子:合同到期提醒阈值(天),运行时热生效
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO `sys_config` (`group`, `key`, `name`, `value`, `type`, `is_public`, `editable`, `builtin`, `sort`, `remark`)
SELECT 'contract', 'contract.expire_remind_days', '合同到期提醒阈值(天)', '30', 'int', 0, 1, 1, 1, '结束日期距今 ≤ 该天数的未归档已签/执行中合同纳入到期提醒'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `sys_config` WHERE `key` = 'contract.expire_remind_days');

-- ──────────────────────────────────────────────────────────────────────
-- 5. sys_job id=29 合同到期提醒(每日 09:30,6 段式 cron)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO sys_job (id, job_name, job_group, cron_expression, bean_class, status, remark)
VALUES (29, '合同到期提醒', 'crm', '0 30 9 * * *', 'contractExpireRemind', 1,
        '每日 09:30 扫描 stage IN(SIGNED,EXECUTING) 且 end_date=今天+阈值(默认30天,contract.expire_remind_days)的未归档合同,通知负责人并置 expire_reminded_on 防重')
ON DUPLICATE KEY UPDATE
  job_name = VALUES(job_name), job_group = VALUES(job_group),
  cron_expression = VALUES(cron_expression), bean_class = VALUES(bean_class),
  status = VALUES(status), remark = VALUES(remark), deleted_at = NULL;
