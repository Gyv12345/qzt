-- ══════════════════════════════════════════════════════════════
-- testimonials-json.sql — 站点配置新增首页客户评价字段
-- 用途: 官网首页「客户评价」区(合作伙伴之后),后台官网设置结构化编辑
--       (每条 quote+name+title+company;空数组/留空不渲染)
-- 影响表: sys_site_config
-- ID 分配: 无(纯加列,无数据变更)
-- 执行方式: DBX MCP 执行 ALTER;并 append 到服务器
--           /opt/qzt-server/bin/demo_baseline.sql 尾部(周一重置存活)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE sys_site_config
  ADD COLUMN testimonials_json TEXT NULL COMMENT '首页客户评价JSON' AFTER modules_desc;
