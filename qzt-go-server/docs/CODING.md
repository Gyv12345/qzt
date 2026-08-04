# 编码规范（CODING）

本规范约束 qzt-go-server 的代码风格与约定，保持代码库一致性与可维护性。

## 1. 命名

| 对象 | 约定 | 示例 |
| --- | --- | --- |
| 包名 | 小写、无下划线、简短 | `account`, `xlogger` |
| 文件名 | snake_case，一文件一职责 | `user_service.go` |
| 接口 | 行为名词 | `UserRepo` |
| 结构体 | 名词 | `UserService`, `DictParam` |
| 方法 | 动词开头 | `CreateUser`, `GetUserList` |
| 常量 | 导出 `CamelCase`，未导出 `camelCase` | `StatusEnabled` |
| 表名 | 系统表 `sys_<entity>`，业务表 `<module>_<entity>`；关联表 `<a>_<b>` | `sys_user`, `crm_customer` |

## 2. 分层调用规则

- **严格单向**：`Router → Middleware → Handler → Service → Repository → GORM`。
- 每层只调用**直接下层**。Handler 不碰 repository；Service 不直接用 GORM（必须经 repository）。
- 跨包依赖用 **contract（接口 + DTO）**，不要 import 具体实现，避免循环依赖。

## 3. DTO 命名

| 用途 | 命名 |
| --- | --- |
| Handler 请求 | `CreateXxxRequest` / `UpdateXxxRequest` |
| Handler 响应 | `XxxResponse` / `XxxInfo` |
| 列表返回 | `{list, total}` 结构 |
| Service 条件 | `XxxCondition` |

结构体字段加 `json` + `binding`（+ `form` 如需 query 绑定）标签。

## 4. 数据库

- 主键 `BIGINT`/`uint`；布尔用 `TINYINT(1)`；可空字段用指针类型（`*int8`）。
- 所有业务表嵌入 `BaseModel`（`created_at` / `updated_at` / `deleted_at` 软删除）。
- 软删除：用户/角色删除时把唯一列（username/code）改写为 `del#<id>#<原值>`，释放唯一索引供复用，同时保留行做审计。
- 审计/配置类表用 **硬删除**（`Unscoped`）做清理，真正回收空间。
- 查询字段名是 SQL 标识符（GORM 不参数化），**只能由可信的服务端代码构造，绝不直接拼客户端输入**（防注入）。

## 5. 事务

用 `repository.Transaction(ctx, fn)` 编排多 repo 操作；不要在方法间传 `*gorm.DB`：

```go
return repository.Transaction(ctx, func(ctx context.Context) error {
    if err := repoA.Create(ctx, a); err != nil { return err }
    return repoB.Update(ctx, b)
})
```

嵌套调用自动复用外层事务。

## 6. 错误处理

- Service 返回：
  - 业务错误：`errors.New("中文消息")` 或 `BizError`；
  - 基础设施错误：`fmt.Errorf("...: %w", err)` 包装原 cause。
- 用 `errors.Is(err, gorm.ErrRecordNotFound)` / `errors.As` 判断。
- `notFoundOr(err, "用户不存在")`：把 `ErrRecordNotFound` 翻译为友好消息，其余原样上抛。
- **禁止在 Handler/Service/Repository 中 `panic`**（仅启动期 `Fatal`/`Panic` 允许）。
- Handler 统一用 `xresponse.Fail(c, errcode.Xxx, msg)` 返回，不直接写 HTTP 状态。

## 7. 日志

- 业务代码用 **context-aware 变体**：`xlogger.InfofCtx(ctx, "...")` / `ErrorfCtx`，自动带 trace_id。
- 禁止业务代码用 `fmt.Println`（仅 CLI/启动横幅可用）。
- 敏感字段（password/token/secret）不写日志；访问日志中间件已自动脱敏。

## 8. 响应

统一信封 `{code, msg, data, timestamp}`。用 `xresponse` 包：
- 成功：`response.OK(c, data)` / `response.Success(c, data)`
- 失败：`response.Fail(c, errcode.Xxx, "msg")` / `response.FailByError(c, e.HttpForbidden)`

## 9. 配置

- 引导配置（DB/Redis/JWT）走 `config/config.<env>.yaml`，敏感字段用 `${VAR:-default}` 占位符 + 环境变量注入。
- 运行时可编辑配置走 `sys_config` 表 + Redis 缓存（`internal/pkg/setting`）。
- 环境由 `ENV` 控制（dev/uat/prod，默认 dev）。

## 10. Git

- 提交信息遵循 Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:`）。
- `.env`、`config/config.yaml` 不入库（仅提交 `.example`）。
