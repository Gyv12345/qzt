-- PSI 授权面收窄配套种子（2026-11-16 R65 修复批次）
-- 背景：psi/router.go 已将 login-only 组的 /psi/stock、/psi/stock/movements、/psi/reports/* 四端点
--       并入 CasbinRBAC 组（收窄全员可读的库存流水与经营报表）。
--       casbin 现态 purchaser/sales_director/super_admin 三角色已覆盖 stock/reports，
--       仅 purchaser 缺 /psi/stock/movements GET 一行，本文件补齐。
-- 幂等：先 DELETE 精确行再 INSERT。casbin 直插后须 systemctl restart qzt-server。
-- 执行：DBX MCP 已执行（2026-11-16）。

USE qztgo;

DELETE FROM casbin_rule WHERE ptype='p' AND v0='purchaser' AND v1='/psi/stock/movements' AND v2='GET';
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES ('p','purchaser','/psi/stock/movements','GET');
SELECT v0, v1 FROM casbin_rule WHERE v1='/psi/stock/movements';