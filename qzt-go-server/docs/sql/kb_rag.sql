-- kb_rag.sql — P17 知识库 RAG 配套建表与权限种子
-- 用途：知识库文档切片表（向量检索数据源）+ 重建索引接口/按钮的 API 与菜单种子 + RAG 运行时开关。
-- ID 分配：sys_api 790（当前最大 789）；sys_menu 2295（当前最大 2294，挂知识库文档管理 741 下）；sys_config 50（当前最大 49）。
-- 授权：super_admin(1) + sales_director(9)（role 8 为 test_role 测试遗留，不授）。
-- 幂等：CREATE TABLE IF NOT EXISTS + 固定 ID ON DUPLICATE KEY + casbin NOT EXISTS。
-- 执行方式：DBX MCP 执行（database=qztgo）或手动 mysql。casbin 运行期插入不生效，须重启 qzt-server。

-- ======================================================================
-- 1. kb_chunk 文档切片表
-- ======================================================================
CREATE TABLE IF NOT EXISTS `kb_chunk` (
  `id`          bigint unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint unsigned NOT NULL COMMENT '文档ID',
  `seq`         int NOT NULL COMMENT '片内序号(从0递增)',
  `content`     text NOT NULL COMMENT '切片正文(纯文本,已剥HTML)',
  `embedding`   json DEFAULT NULL COMMENT '嵌入向量JSON([]float64)',
  `vector_dim`  int NOT NULL DEFAULT 0 COMMENT '向量维度(换模型后对账用)',
  `status`      varchar(16) NOT NULL DEFAULT 'ready' COMMENT 'ready/failed',
  `error`       varchar(255) NOT NULL DEFAULT '' COMMENT '失败原因摘要',
  `char_count`  int NOT NULL DEFAULT 0 COMMENT '切片字符数',
  `created_at`  datetime(3) DEFAULT NULL,
  `updated_at`  datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_kb_chunk_doc_seq` (`document_id`, `seq`),
  KEY `idx_kb_chunk_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='知识库文档切片(P17 RAG)';

-- ======================================================================
-- 2. sys_api 790：重建索引接口
-- ======================================================================
INSERT INTO `sys_api` (`id`, `path`, `method`, `group`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
  (790, '/kb/documents/:id/reindex', 'POST', 'KB', '知识库文档重建向量索引', NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `description`=VALUES(`description`), `updated_at`=NOW(3);

-- ======================================================================
-- 3. sys_menu 2295：重建索引按钮（挂文档管理 741 下）
-- ======================================================================
INSERT INTO `sys_menu`
  (`id`, `parent_id`, `name`, `path`, `component`, `icon`, `sort`, `type`, `permission`, `visible`, `status`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (2295, 741, '重建索引', '', '', '', 5, 2, 'kb:document:reindex', 1, 1, NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `updated_at`=NOW(3);

INSERT INTO `sys_role_menu` (`sys_role_id`, `sys_menu_id`)
VALUES (1,2295),(9,2295)
ON DUPLICATE KEY UPDATE `sys_role_id`=`sys_role_id`;

-- ======================================================================
-- 4. casbin 授权（幂等 NOT EXISTS；运行期插入不生效，须重启 qzt-server）
-- ======================================================================
INSERT INTO `casbin_rule` (`ptype`, `v0`, `v1`, `v2`)
SELECT 'p', rc.code, a.path, a.method FROM
  (SELECT 'super_admin' AS code UNION SELECT 'sales_director') rc
  JOIN sys_api a ON a.id = 790
WHERE NOT EXISTS (
  SELECT 1 FROM casbin_rule cr
  WHERE cr.ptype='p' AND cr.v0=rc.code AND cr.v1=a.path AND cr.v2=a.method
);

-- ======================================================================
-- 5. sys_config 50：RAG 总开关（admin 界面可控，默认关；开=1 需同时配 KB_EMBEDDING_API_KEY）
-- ======================================================================
INSERT INTO `sys_config`
  (`id`, `group`, `key`, `name`, `value`, `type`, `options`, `is_public`, `editable`, `builtin`, `sort`, `remark`, `created_at`, `updated_at`, `deleted_at`)
VALUES
  (50, 'kb', 'kb.rag_enabled', '知识库RAG召回开关', '0', 'bool', NULL, 0, 1, 1, 1, '开启后知识库文档切片向量化并在 GEO 写稿时召回事实依据；需先在 .env 配置 KB_EMBEDDING_API_KEY，默认关闭', NOW(3), NOW(3), NULL)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `remark`=VALUES(`remark`), `updated_at`=NOW(3);
