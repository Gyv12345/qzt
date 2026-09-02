-- R8-① 修复：考勤打卡/加班/请假接口未授予任何非超管角色（2026-09-03 第八轮回归发现）
--
-- 现象：POST /hrm/attendance/clock 与 GET /hrm/attendance/clocks 在 casbin_rule 中无任何角色授权，
--       全部非超管用户打卡 403，移动端「考勤打卡」页报「加载失败 请确认已关联员工档案后重试」。
--       同批核对：/hrm/attendance/overtimes（加班申请/列表）、/hrm/attendance/leaves（请假，仅
--       employee/sales_director 有）一并对全员补授；approve/summary 维持现状（approve 走审批中心，
--       summary 面向管理角色，本轮不放开）。
-- 修复：为 7 个非超管角色（sale/sales_manager/finance/hr/purchaser/sales_director/employee，
--       即 role 3/4/5/6/7/9/10）补授 clock POST、clocks GET、overtimes GET/POST、leaves GET/POST。
-- 执行方式：DBX MCP（connection_name="我的阿里云数据库"，database="qztgo"）逐条执行；
--       执行后必须清 Redis 权限缓存 qzt:perm:user:{3,4,5,6,7,9,10}（cd /opt/qzt-server && set -a source .env）。

INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', r.code, '/hrm/attendance/clock', 'POST'
FROM sys_role r
WHERE r.id IN (3,4,5,6,7,9,10) AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM casbin_rule c WHERE c.ptype='p' AND c.v0=r.code AND c.v1='/hrm/attendance/clock' AND c.v2='POST');

INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', r.code, '/hrm/attendance/clocks', 'GET'
FROM sys_role r
WHERE r.id IN (3,4,5,6,7,9,10) AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM casbin_rule c WHERE c.ptype='p' AND c.v0=r.code AND c.v1='/hrm/attendance/clocks' AND c.v2='GET');

INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', r.code, x.path, x.method
FROM sys_role r
CROSS JOIN (
  SELECT '/hrm/attendance/leaves' AS path, 'GET' AS method UNION ALL
  SELECT '/hrm/attendance/leaves', 'POST' UNION ALL
  SELECT '/hrm/attendance/overtimes', 'GET' UNION ALL
  SELECT '/hrm/attendance/overtimes', 'POST'
) x
WHERE r.id IN (3,4,5,6,7,9,10) AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM casbin_rule c
    WHERE c.ptype='p' AND c.v0=r.code AND c.v1=x.path AND c.v2=x.method
  );

-- R8-② 修复：hrm_attendance_clock 缺 source 列（模型含 Source 字段，生产库未同步，打卡全量 500）
-- 现象：POST /hrm/attendance/clock 报 Error 1054 Unknown column 'source'（对所有用户，含超管）。
ALTER TABLE hrm_attendance_clock
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'APP' COMMENT '打卡来源(APP/WECOM)' AFTER remark;

-- R8-④ 补授：请假/加班审批接口未授予任何角色（审批动作对非超管全量 403）
-- 授权面=管理角色（销售经理/销售总监/人事专员），不放 sale（ApproveLeave 不校验自批，避免普通组员可审批）。
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', r.code, x.path, 'PUT'
FROM sys_role r
CROSS JOIN (
  SELECT '/hrm/attendance/leaves/:id/approve' AS path UNION ALL
  SELECT '/hrm/attendance/overtimes/:id/approve'
) x
WHERE r.code IN ('sales_manager','sales_director','hr') AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM casbin_rule c
    WHERE c.ptype='p' AND c.v0=r.code AND c.v1=x.path AND c.v2='PUT'
  );

-- R8-⑤ 补授：考勤汇总接口未授予任何角色（考勤汇总页面对非超管全量 403）
-- 授权面=管理角色（销售经理/销售总监/人事专员）；generate 仅人事。
INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', r.code, '/hrm/attendance/summary', 'GET'
FROM sys_role r
WHERE r.code IN ('sales_manager','sales_director','hr') AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM casbin_rule c WHERE c.ptype='p' AND c.v0=r.code AND c.v1='/hrm/attendance/summary' AND c.v2='GET');

INSERT INTO casbin_rule (ptype, v0, v1, v2)
SELECT 'p', r.code, '/hrm/attendance/summary/generate', 'POST'
FROM sys_role r
WHERE r.code IN ('hr') AND r.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM casbin_rule c WHERE c.ptype='p' AND c.v0=r.code AND c.v1='/hrm/attendance/summary/generate' AND c.v2='POST');
