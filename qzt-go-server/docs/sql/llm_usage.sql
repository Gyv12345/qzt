-- ============================================================
-- llm_usage.sql — LLM 网关调用记账表（sys_llm_usage）
-- 用途：internal/pkg/llm 统一 LLM 网关（OpenAI 兼容协议）的 token 用量记账，
--       按用户+功能维度落库，为 AI 功能（GEO 监测/AI 测评等）的商业化计费预留。
--       纯日志表：只插入，无种子数据，无固定 ID 区间（自增）。
-- 执行方式：DBX MCP（连接「我的阿里云数据库」，database=qztgo）或手动 mysql 执行；
--       幂等（CREATE TABLE IF NOT EXISTS），可重复执行。
-- ============================================================

CREATE TABLE IF NOT EXISTS `sys_llm_usage` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id`           BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '发起用户ID(0=系统定时任务)',
  `feature`           VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '功能标识,如 geo.monitor/assessment.report',
  `provider`          VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '供应商标识(如 openai-compat)',
  `model`             VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '模型名',
  `prompt_tokens`     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '输入token数',
  `completion_tokens` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '输出token数',
  `total_tokens`      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总token数',
  `from_cache`        TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否命中响应缓存(未消耗供应商额度)',
  `latency_ms`        INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '调用耗时(毫秒)',
  `status`            VARCHAR(16)  NOT NULL DEFAULT 'ok' COMMENT 'ok=成功 error=失败',
  `err_msg`           VARCHAR(255) NOT NULL DEFAULT '' COMMENT '失败原因摘要(截断,不含prompt)',
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_feature_created` (`user_id`, `feature`, `created_at`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='LLM 网关调用记账';
