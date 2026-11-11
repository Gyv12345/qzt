# AGENTS.md — qzt-go-server 工作区指南

本文件供后续 ZCode agent 快速上手。改动代码前必读。

## 项目定位

企业级业务管理平台后端（Enterprise Business Platform）—— Go 模块化单体。
融合 snowgo（统一响应/错误码/日志/x* 库）与 backplane（Module 接口/BaseRepo 泛型/Casbin RBAC）。
当前已有 **13 个业务模块**：`enterprise` / `crm` / `project` / `system` / `cms` / `hrm` / `api` / `psi` / `finance` / `oa` / `approval` / `cloud` / `kb`（注册见 `cmd/server/main.go` 的 `server.NewRouter(...)`），另有 `internal/mcp` MCP Server 挂载 `/mcp`。

## 关键命令

```bash
make run             # 本地运行（默认 dev 环境，自动加载 .env；建表/种子走 docs/sql/ 的 SQL，应用不自动执行）
make build           # 编译到 bin/qzt-server
make swag            # 由注解重新生成 swagger 文档（改 handler 注解后执行）
make vet             # go vet ./...
make test            # 单测（含 race）
make test-integration # 集成测试（build tag=integration，需可连 MySQL/Redis，见 internal/testutil）
make tidy            # go mod tidy
make fmt             # gofmt -s -w
make up              # docker-compose 起 mysql+redis+app
```

- **环境变量 `ENV`**（不是 APP_ENV）：`dev`/`uat`/`prod`，默认 `dev`，决定加载 `config/config.<env>.yaml`。见 `pkg/xenv/env.go`。
- 配置文件可用 `${VAR:-default}` 占位符注入敏感字段（见 `config/config.go` 的 `expandEnv`）。
- **敏感配置走 `.env`**（gitignored）：`make run` 会自动 `set -a; . ./.env` 导出。`.env.example` 是提交的模板。`config.dev.yaml` 的 mysql.dsn / redis / jwt_secret 均用 `${VAR:-默认值}` 引用。**`.env` 中含特殊字符（`()!&` 等）的值必须加双引号**，否则 shell source 报语法错误。
- **本地端口 9000**（8000 被本机 node 占用,曾用 8001）。改端口在 `config.dev.yaml` 的 `application.server.port` 与 `storage.resource_domain`。

## 数据库

- **数据库名 `qztgo`**（阿里云 RDS MySQL，utf8mb4）。
- DSN 在 `.env` 的 `MYSQL_DSN`（指向 RDS）；`config.dev.yaml` 用 `${MYSQL_DSN:-本地默认}` 引用。
- **建表与种子全走 SQL（SQL-first）**：所有建表 DDL + 种子数据（超管角色/用户、内置菜单+API、字典及各业务表）一律写成 `docs/sql/` 下的独立 SQL 文件，由用户手动执行（DBX MCP 或 mysql）。应用**不做** AutoMigrate、**不写**任何种子——`internal/model/migrate.go` 与 `internal/app/migrate.go` 已清空为注释。`qztgo.sql` 是全库地基（系统表+系统种子），其余文件按需执行，索引见 `docs/sql/README.md`。
- **禁止**：新增 `AutoMigrate()` / `SeedData()`、往 `internal/model/seed_data.go` / `seed_psi.go`（历史遗留文件，已无调用方）追加内容、或在任何 migrate.go 里挂种子函数。新增表/种子写 `docs/sql/{模块名}.sql`（幂等：`CREATE TABLE IF NOT EXISTS` + `INSERT ... ON DUPLICATE KEY` 或先 DELETE 固定 ID 区间）。
- **查库用 DBX MCP 工具**（不要写临时 Go 脚本查库）。已配置连接「我的阿里云数据库」：
  - 连接名：`我的阿里云数据库`（host `rm-f8zy67b6vb06r1a82io.mysql.rds.aliyuncs.com:3306`，与 `.env` 的 RDS 同一实例）
  - 查询时指定 `database: qztgo`，例如 `dbx_execute_query(connection_name="我的阿里云数据库", database="qztgo", sql="...")`
  - 排查表结构用 `dbx_describe_table`，浏览 schema 用 `dbx_get_schema_context` / `dbx_list_tables`。

## 易踩的坑（已修复，勿再犯）

- **鉴权中间件必须 abort**：`JWTAuth`/`CasbinRBAC` 拒绝时必须用 `xresponse.Unauthorized`/`Forbidden`（内部 `AbortWithStatusJSON`），**不能用 `Fail`/`FailByError`**（只 `c.JSON` 不 abort，会导致请求穿透后续中间件，响应里出现多段 JSON 拼接）。业务 handler 里的 `Fail` 不需要 abort。
- **`xcryption.CheckPassword(hashedPassword, password)` 参数顺序**：第一个是哈希、第二个是明文。调反会永远返回 false。
- **model 字段与 repo 查询要对齐**：repo 用 `Order: "sort ASC"` 时，model 必须有 `Sort` 字段（否则 `Unknown column 'sort'`）。新增带排序的 model 别忘了加。

## 分层规则（严格单向，违反即错）

```
Router → Middleware → Handler → Service → Repository → GORM → MySQL/Redis
```

- 每层只调直接下层。Handler 不碰 repository；Service 不直接用 GORM。
- 跨包依赖用 contract（接口+DTO），不用具体实现，避免循环引用。
- 事务用 `repository.Transaction(ctx, fn)`，**不在方法间传 `*gorm.DB`**；`dbFrom(ctx)` 自动识别 ctx 中的事务并复用（支持嵌套）。
- Model 放 `internal/model/`，Repo 放 `internal/repository/`（全局共享，非每模块独立）。

## 编码约定

- 包名小写无下划线；文件 snake_case；方法动词开头（`CreateUser`）。
- 表名：系统表 `sys_<entity>`，业务表 `<module>_<entity>`，关联表 `<a>_<b>`。所有业务表嵌入 `model.BaseModel`（created_at/updated_at/deleted_at 软删除）。
- 软删除：用户/角色删除时把唯一列改写为 `del#<id>#<原值>` 释放唯一索引；审计/配置类用 `Unscoped` 硬删除。
- 响应统一信封 `{code,msg,data,timestamp}`，用 `pkg/xresponse`：成功 `response.OK(c,data)`，失败 `response.Fail(c, errcode.Xxx, "msg")`。
- 错误码在 `pkg/xerror`（注册表，init 检测重复码并 panic）+ 业务模块本地 `errcode`（如 `internal/module/system/errcode`）。
- **业务日志必须用 context-aware 变体**：`xlogger.InfofCtx(ctx,...)` / `ErrorfCtx`，自动带 trace_id；禁止业务代码 `fmt.Println`。
- 敏感字段（password/token/secret）不写日志；访问日志/操作日志中间件已自动脱敏。
- Handler/Service/Repository 内**禁止 panic**（仅启动期允许）。
- 查询字段名是 SQL 标识符（GORM 不参数化），**只能由可信服务端代码构造，绝不直接拼客户端输入**。

## 添加新业务模块（标准流程）

以新增 `crm` 模块为例：

1. **建目录** `internal/module/crm/`，含 `router.go` + `handler/` + `service/`。可参考 `internal/module/system/`。
2. **实现 Module 接口**（`internal/server/server.go` 定义）：
   ```go
   package crm
   type Module struct{}
   func New() *Module { return &Module{} }
   func (m *Module) Name() string { return "crm" }  // 即 URL 前缀 /crm
   func (m *Module) RegisterRoutes(rg *gin.RouterGroup) { ... }
   ```
   路由分三层：公开（无鉴权）、已认证（`middleware.JWTAuth(app.JwtManager)`）、受保护（再叠 `middleware.OperationLog()` + `middleware.CasbinRBAC()`）。注意 OperationLog 必须在 CasbinRBAC **之前**，使 403 也被审计。
3. **Model**：在 `internal/model/` 加 `crm_customer.go` 等（表名 `crm_<entity>`，嵌入 `BaseModel`）。
4. **建表（SQL-first，不走 AutoMigrate）**：把建表 DDL 写进 `docs/sql/{模块名}.sql`（幂等：`CREATE TABLE IF NOT EXISTS`），文件头注释标明用途、ID 分配区间与执行方式，然后经 DBX MCP 或手动 mysql 执行。`internal/model/migrate.go` / `internal/app/migrate.go` 已清空为注释，**不要**往里加 `allModels()` + `db.AutoMigrate()`。
5. **Repository**：在 `internal/repository/` 加 `crm_customer.go`，嵌入 `BaseRepo[model.CrmCustomer]`，按需覆写 `GetByID`（preload 关联）等。
6. **注册模块**：在 `cmd/server/main.go` 的 `server.NewRouter(...)` 调用里加 `crmmod.New()`。
7. **权限接入**（如需 RBAC）：把 `sys_api` 接口记录（Path 用 `/crm/...`）与对应菜单（type=2 按钮节点挂载 APIs）的种子写进该模块的 `docs/sql/*.sql`（幂等 INSERT），与建表 DDL 一并手动执行。角色绑定菜单后 service 自动重建 Casbin 策略。运行期新增的 API 需重启才进操作日志的 module/action 元数据。
8. 验证：`go build ./... && go vet ./...`，必要时 `make run` 跑通。

## 中间件顺序（全局，见 `internal/server/server.go`）

`Recovery → Trace → Cors → Logger`，模块内再按需叠 `LoginLimit` / `JWTAuth` / `OperationLog` / `CasbinRBAC`。

## 关键全局单例（`internal/app`）

`app.DB`(GORM) / `app.Redis` / `app.Enforcer`(Casbin) / `app.JwtManager` / `app.Uploader`(文件存储) / `app.Log`(zap Sugared)。
启动顺序见 `app.Init`：config→timezone→logger→storage→database→redis→casbin→jwt；`Close()` 反序释放。

## 不要做

- 不引入 GORM Gen（用 BaseRepo 泛型）。
- 不内嵌前端 SPA（纯后端；server.go NoRoute 返回 JSON 404）。
- 不引入 MQ/任务队列（第一阶段无需求）。

## Swagger API 文档

- 接入 **swaggo/swag**（注解驱动）。启动后访问 **`http://localhost:9000/swagger/index.html`**。
- **新增/修改 handler 注解后，必须重跑 `make swag`** 重新生成文档（输出到 `cmd/server/docs/`）。
- 通用 API 信息（title/version/host/BasePath/securityDefinitions）在 `cmd/server/main.go` 顶部注释；handler 注解在各 handler 方法上方。
- **注解里的类型必须用真实包名**（非 import 别名）：统一用 `xresponse.Response{data=具体类型}` 表达返回信封。`Response` 结构体定义在 `pkg/xresponse/response.go`（仅供 swagger 引用，实际序列化用 `gin.H`）。
- 公开接口（health/upload/configs public）不加 `@Security`；其余都加 `@Security BearerAuth`。
- Makefile 的 `swag` 目标用 `$$(go env GOPATH)/bin/swag`，需先 `go install github.com/swaggo/swag/cmd/swag@latest`。

## 改动前必读

- `docs/ARCHITECTURE.md` — 架构与分层决策（事务/Casbin/JWT/审计细节）。
- `docs/CODING.md` — 编码规范全集。
- `docs/PRD.md` — 产品需求（模块规划、权限示例）。
