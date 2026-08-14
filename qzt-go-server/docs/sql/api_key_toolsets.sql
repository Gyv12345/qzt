-- api_key_toolsets.sql sys_api_key 增加 MCP 工具集字段
--
-- 用途:API Key 级 MCP 工具过滤。toolsets 存勾选的工具集 key(逗号分隔,
--       合法值见 qzt-go-server/internal/mcp/toolsets.go 的 toolsetCatalog:
--       crm/oa/hrm/psi/finance/approval/project/kb/cloud/cms/dashboard/system/enterprise/common),
--       空串 = 不限制(暴露全部 MCP 工具,兼容存量 Key)。
-- 执行方式:DBX MCP 或 mysql 手动执行。幂等:重复执行前先确认列不存在
--       (MySQL 的 ADD COLUMN 不支持 IF NOT EXISTS)。
-- 关联代码:mcpAuthMiddleware 把 toolsets 注入 request context,
--           server.WithToolFilter(toolsetFilter) 在 tools/list 与 tools/call 双重生效。

ALTER TABLE sys_api_key
    ADD COLUMN toolsets VARCHAR(255) NOT NULL DEFAULT '' COMMENT '可用工具集(逗号分隔,空=全部)';
