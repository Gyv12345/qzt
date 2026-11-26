-- ══════════════════════════════════════════════════════════════
-- hero_shot_url.sql — 站点配置新增首页 Hero 产品截图字段
-- 用途: 官网首页 Hero 浏览器拟真框大图,后台「官网设置」可上传替换
--       (留空回退内置默认图 /assets/admin-dashboard.png)
-- 影响表: sys_site_config
-- ID 分配: 无(纯加列,无数据变更)
-- 执行方式: DBX MCP 执行 ALTER;并 append 到服务器
--           /opt/qzt-server/bin/demo_baseline.sql 尾部(周一重置存活)
-- ═════════════════════════════生产═════════════════════════════

ALTER TABLE sys_site_config
  ADD COLUMN hero_shot_url VARCHAR(500) NOT NULL DEFAULT '' COMMENT '首页Hero产品截图URL(留空回退内置默认图)' AFTER hero_subtitle;
