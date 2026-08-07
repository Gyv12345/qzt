# 架构说明（ARCHITECTURE）

本文档描述 qzt-go-server 的整体架构、分层职责与关键设计决策。新成员上手前必读。

## 1. 总体架构

**模块化单体（Modular Monolith）**。不采用微服务，原因见 PRD §3：降低私有化部署复杂度、降低客户服务器要求、模块间调用高效。

```
                ┌─────────────────────────────────────┐
                │            cmd/server/main.go        │  启动入口
                └───────────────┬─────────────────────┘
                                │ app.Init（配置→时区→日志→存储→DB→Redis→Casbin→JWT）
                                │ setting.Warm（运行时配置预热）
                                ▼
                ┌─────────────────────────────────────┐
                │         internal/server              │  NewRouter 装配
                │  （全局中间件 + Module 注册）          │
                └───────────────┬─────────────────────┘
            ┌───────────────────┴────────────────────┐
            ▼                                        ▼
   ┌─────────────────┐                    ┌──────────────────┐
   │ module/system   │                    │   module/api     │
   │  /system/*      │                    │   /api/*         │
   │ 用户/角色/菜单/  │                    │  健康/上传/公共   │
   │ RBAC/字典/日志   │                    │  配置            │
   └────────┬────────┘                    └────────┬─────────┘
            │ handler → service → repository         │
            ▼                                        ▼
   ┌─────────────────────────────────────────────────────┐
   │   repository（BaseRepo[T] 泛型 + context 事务）       │
   └───────────────────────┬─────────────────────────────┘
                           ▼
              ┌────────────────────────┐
              │  GORM → MySQL          │
              │  Redis（缓存/锁/限流）  │
              │  Casbin（RBAC 策略）    │
              └────────────────────────┘
```

## 2. 分层职责（严格单向）

请求链路：`Router → Middleware → Handler(API) → Service → Repository → GORM → MySQL/Redis`

| 层 | 目录 | 职责 | 禁止 |
| --- | --- | --- | --- |
| **Router** | `internal/module/<name>/router.go` | 路由注册、中间件分组 | 写业务逻辑 |
| **Middleware** | `internal/middleware` | 横切：鉴权、限流、日志、审计、CORS、trace | 调 service/repository |
| **Handler** | `internal/module/<name>/handler` | 参数绑定、调用 service、统一响应 | 直接操作 DB；跨层调用 |
| **Service** | `internal/module/<name>/service` | 业务逻辑、事务编排、领域规则 | 直接用 GORM（必须经 repository） |
| **Repository** | `internal/repository` | 数据访问、查询构造、事务传递 | 写业务规则 |
| **Model** | `internal/model` | GORM 实体定义 | 写逻辑 |
| **pkg** | `pkg/*` | 领域无关的可复用库（xresponse/xerror/xlogger/...） | 依赖 internal |

> 跨包依赖用 **contract（接口）** 而非具体类型，避免循环引用。

## 3. 关键设计

### 3.1 数据访问：BaseRepo[T] + context 事务

- 泛型 `BaseRepo[T]` 提供通用 CRUD（Create/GetByID/Update/Delete/List/PageList/Count/Exists）。
- **事务通过 context 传递**，不在方法间传 `*gorm.DB`：

```go
// service 层组合多个 repo，原子提交
err := repository.Transaction(ctx, func(ctx context.Context) error {
    if err := userRepo.Create(ctx, user); err != nil { return err }
    return userRepo.SetRoles(ctx, user.ID, roleIDs)
})
```

`dbFrom(ctx)` 自动识别 ctx 中是否携带事务：有则复用（支持嵌套），无则用全局 `app.DB`。

### 3.2 权限：Casbin + 菜单驱动

- 权限模型 `用户 → 角色 → 菜单(含按钮/权限串) → API`。
- **菜单(type=2 按钮)通过 sys_menu_api 关联到具体接口**；角色绑定菜单后，service 自动重建该角色的 Casbin 策略（从菜单关联的 API 生成 `p = role, path, method`）。策略维护变成数据问题，无需手改策略文件。
- 超级管理员角色（`super_admin`）在 matcher 中短路放行，且在中间件中提前 return 省一次查询。
- 权限列表按用户缓存到 Redis（10 分钟 TTL），角色/菜单变更后清除缓存。
- Casbin 无法加入 DB 事务，故策略同步失败时 `LoadPolicy()` 兜底重载。

### 3.3 认证：JWT 双层失效

- 登录签发 access + refresh 令牌对，claims 携带 `token_version`。
- 失效两层：
  1. **Redis 黑名单**（登出写入，按剩余 TTL 过期）；
  2. **token_version 比对**：改密 / 禁用 / 改角色时 `token_version++`，中间件比对 claims 与用户表，旧 token 立即失效。
- 登录失败按 `(username, ip)` 维度限流：5 次 / 15 分钟锁定。

### 3.4 审计日志：异步脱敏

- `OperationLog` 中间件记录每次写操作（POST/PUT/DELETE/PATCH）。
- **位于 JWTAuth 之后、CasbinRBAC 之前**，使权限拒绝(403)也被审计。
- 请求/响应体脱敏（password/token/secret 等键替换为 ***）并截断（8KB）。
- **异步写库**（独立 context + 3s 超时），日志失败不影响业务请求。

### 3.5 统一响应与错误码

```json
{ "code": 0, "msg": "success", "data": {}, "timestamp": 1691000000000 }
```

- `pkg/xerror`：错误码注册表，init 时检测重复码并 panic。结构 `[类别][模块][具体]`。
- Service 用 `errors.New("中文消息")` 或 `BizError` 表达业务错误；handler 统一映射为错误码返回。

### 3.6 日志：context-aware

- `pkg/xlogger`（zap 封装）按级别分文件（debug/info/access/error），按天切割。
- **业务代码必须用 Ctx 变体**：`xlogger.InfofCtx(ctx, ...)` / `ErrorfCtx`，自动注入 trace_id。
- 访问日志中间件对敏感字段脱敏。

### 3.7 文件存储：双桶 + 双驱动

- `internal/pkg/storage` 定义 `Uploader` 接口，`*Local`（本地磁盘）与 `*OSS`（阿里云 OSS）都实现它，启动时按 `config.driver` 切换。
- **双桶模型**：公共桶（public-read，直链/CDN，存可公开资源）+ 私有桶（private，签名 GET 访问，存合同/凭证等敏感文件）。
- 配置走 `config.{env}.yaml` + `.env`（敏感字段环境变量注入），**已从数据库表迁移到配置文件**，改配置需重启。
- 详细设计与 API 见 [OSS.md](OSS.md)。

## 4. 启动顺序

`app.Init` 严格按序初始化，任一失败即终止：

```
config → timezone → logger → storage → database → redis → casbin → jwt
```

`Close()` 按相反顺序释放（每个句柄 nil 安全）。

## 5. 扩展新业务模块

1. 在 `internal/module/<name>/` 下创建 `router.go`（实现 `server.Module` 接口）、`handler/`、`service/`。
2. model 放 `internal/model/`，repo 放 `internal/repository/`（共享，非每模块独立）。
3. 在 `cmd/server/main.go` 的 `server.NewRouter(...)` 中注册新模块。
4. **建表 + 种子数据写 SQL 脚本**（`docs/sql/<模块>.sql`，幂等），手动执行。**不要**用 `db.AutoMigrate()`，也不要往 `migrate.go`/`seed_data.go` 挂函数（这两类已从代码移除，详见工作区 `AGENTS.md`）。

参考 `module/system` 与 `module/api` 的实现。
