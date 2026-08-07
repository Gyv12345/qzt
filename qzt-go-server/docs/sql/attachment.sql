-- attachment.sql
-- 用途：通用附件系统建表 + Casbin API 权限种子。
-- 执行方式：通过 DBX MCP 或 mysql 手动执行（全部幂等）。
--
-- 附件表 sys_attachment 是多态表（biz_type + resource_id），与 sys_field_change_log 同构。
-- 所有业务详情页的「附件」Tab 共用此表。文件本身存 OSS 双桶或本地磁盘，
-- 本表只记录元数据（文件名/object_key/url/大小/可见性/上传人）。
--
-- ID 区间分配：
--   sys_attachment: 自增，无固定区间
--   sys_api: 430-433（附件 CRUD + 签名下载）

-- 1. 通用附件表
CREATE TABLE IF NOT EXISTS sys_attachment (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  biz_type     VARCHAR(32)     NOT NULL COMMENT '业务类型(CUSTOMER/CONTRACT/OPPORTUNITY/EMPLOYEE/...)',
  resource_id  BIGINT UNSIGNED NOT NULL COMMENT '资源ID',
  file_name    VARCHAR(255)    NOT NULL COMMENT '原始文件名',
  object_key   VARCHAR(500)    NOT NULL COMMENT '存储路径(OSS key 或本地相对路径)',
  url          VARCHAR(500)    NOT NULL COMMENT '访问URL(公共=明文直链;私有=objectKey,需走/api/file/sign)',
  size         BIGINT          NOT NULL DEFAULT 0 COMMENT '文件大小(字节)',
  content_type VARCHAR(100)    NOT NULL DEFAULT '' COMMENT 'MIME类型',
  visibility   VARCHAR(10)     NOT NULL DEFAULT 'private' COMMENT 'public/private',
  uploader_id  BIGINT UNSIGNED NOT NULL COMMENT '上传人ID',
  created_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at   DATETIME(3)     DEFAULT NULL COMMENT '软删除',
  PRIMARY KEY (id),
  INDEX idx_attach_biz (biz_type, resource_id),
  INDEX idx_attach_uploader (uploader_id),
  INDEX idx_attach_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通用附件表';

-- 2. API 权限项登记（附件 + 签名下载）。
-- 注:附件接口挂在「已认证路由」(仅 JWT,无 CasbinRBAC),登录用户即可访问,无需 casbin_rule 策略。
-- sys_api 记录用于后台「API 管理」界面展示。超管通过角色编码 SUPER_ADMIN 在 CasbinRBAC 中间件短路放行。
INSERT INTO sys_api (id, path, method, `group`, description) VALUES
(430, '/api/attachments',      'GET',    '附件管理', '附件列表'),
(431, '/api/attachments',      'POST',   '附件管理', '创建附件记录'),
(432, '/api/attachments/:id',  'DELETE', '附件管理', '删除附件记录'),
(433, '/api/file/sign',        'GET',    '附件管理', '获取私有文件下载URL')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 验证
SELECT id, path, method, `group`, description FROM sys_api WHERE id BETWEEN 430 AND 433;
