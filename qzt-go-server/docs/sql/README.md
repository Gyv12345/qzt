# 数据库初始化说明

本项目的建表与种子数据有两种途径，按部署场景选择。

## 方式一（推荐）：应用启动自动建表

首次启动时，`cmd/server/main.go` 会执行：

1. `app.AutoMigrate()` —— 按 `internal/model/migrate.go` 中登记的 model 自动创建/同步表结构。
2. `app.SeedData()` —— 幂等写入初始数据（超级管理员角色 `super_admin`、超管用户 `admin/admin123`、内置菜单与 API、示例字典）。

**开发环境与大多数私有化部署直接用此方式即可**，无需手工执行 SQL。启动后请立即登录修改 admin 密码。

## 方式二：手工执行 SQL（离线/审计要求场景）

若客户要求在部署前由 DBA 审核并执行 SQL，或需固定表结构版本：

1. 先创建数据库：
   ```sql
   CREATE DATABASE qztgo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. 表结构：由 `app.AutoMigrate` 生成，可用 `mysqldump --no-data` 在开发库导出 DDL 后交付。
3. 种子数据：见 `qztgo.sql`（全库导出，含系统地基种子）。**业务模块的权限种子（菜单/API/字典）以独立 SQL 文件形式提供，由用户手动执行**，例如 `finance.sql`（财务管理模块的 `sys_api` + `sys_menu` + `sys_menu_api`）。

## 业务模块种子（约定）

- **业务模块的种子数据（菜单/API/权限/字典）一律写成独立 SQL 文件放本目录，由用户手动执行**，不在 Go 代码里写。
- Go 侧仅保留系统地基种子（超管角色/用户/系统菜单+API/示例字典）与建表 `AutoMigrate`（见工作区根 `AGENTS.md`「种子数据」约定）。
- 每个 SQL 文件应**幂等**（建议开头先 DELETE 固定 ID 区间再 INSERT，或用 `ON DUPLICATE KEY UPDATE`），并在文件头注释标明 ID 分配区间与执行方式。
- 现有业务种子文件：
  - `finance.sql` —— 财务管理（会计科目/记账凭证/发票管理/财务报表）。

> 注意：DDL 与系统地基种子数据以代码（`internal/model/`）为单一事实来源。业务模块种子以本目录 SQL 文件为准。后续若引入版本化迁移工具（如 golang-migrate），将替换 AutoMigrate。
