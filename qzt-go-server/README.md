# qzt-go-server

企业级业务管理平台后端（Enterprise Business Platform）—— 基于 Go 的模块化单体后台基础框架。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 语言 | Go 1.25 |
| Web 框架 | Gin |
| ORM | GORM（MySQL） |
| 权限 | Casbin（RBAC，菜单驱动策略自动同步） |
| 缓存/锁 | Redis + Redsync |
| 认证 | JWT（access + refresh，双层失效） |
| 配置 | Viper（YAML + 环境变量占位符） |
| 日志 | Zap + Lumberjack（按级别分文件，敏感字段脱敏） |

## 目录结构

```
qzt-go-server/
├── cmd/server/         # 启动入口
├── config/             # 配置文件 + Casbin 模型
├── internal/
│   ├── app/            # 全局启动引导（DB/Redis/Casbin/Logger）
│   ├── middleware/      # gin 中间件
│   ├── model/          # GORM 模型
│   ├── repository/     # 数据访问层（泛型 BaseRepo[T] + context 事务）
│   ├── module/         # 业务模块（可插拔 Module 接口）
│   │   ├── system/     # 系统管理（用户/角色/菜单/RBAC/字典/日志）
│   │   └── api/        # 公共 API（健康检查/上传/公共配置）
│   ├── server/         # 路由装配
│   └── constant/       # 常量
├── pkg/                # 可复用基础库（xresponse/xerror/xlogger/xauth/xcache...）
├── deploy/             # Dockerfile + docker-compose
└── docs/               # 架构/规范/SQL
```

## 快速开始

### 1. 准备依赖

```bash
# 启动 MySQL + Redis（或使用已有实例）
docker compose -f deploy/docker-compose.yaml up -d mysql redis
```

### 2. 配置

```bash
cp config/config.yaml.example config/config.dev.yaml   # 按环境复制
cp .env.example .env                                    # 填入本地 DB/Redis/JWT/OSS 敏感配置
# 按需修改数据库连接、JWT 密钥等（端口固定 9000，8000 被本机占用）
```

### 3. 建表与种子数据

**建表和种子数据已从 Go 代码中移除**，统一走 SQL 脚本（见 `AGENTS.md` 约定）。首次部署执行：

```bash
# 通过 DBX MCP 或 mysql 手动执行 docs/sql/ 下的脚本
# 核心脚本：qztgo.sql（表结构 + 系统地基种子，含超管角色/用户/菜单/API/字典）
mysql -h <host> -u <user> -p qztgo < docs/sql/qztgo.sql
```

默认管理员账号：`admin` / `admin123`

### 4. 运行

```bash
make run        # 加载 .env + config/config.<env>.yaml，不自动建表/写种子
```

### 5. 构建

```bash
make build      # 产出 bin/qzt-server
```

## 架构分层

请求链路严格分层，每层只调用直接下层：

```
Router -> Middleware -> Handler(API) -> Service -> Repository -> GORM -> MySQL/Redis
```

- 新增业务模块：在 `internal/module/<name>/` 下实现 `Module` 接口（`Name()` + `RegisterRoutes()`），在 `cmd/server/main.go` 注册即可。
- 事务通过 `context` 传递（`repository.Transaction(ctx, fn)`），无需在方法间传递 `*gorm.DB`。

详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 与 [docs/CODING.md](docs/CODING.md)。

## 已实现模块

15 个业务模块 + MCP Server：

- **system**（系统地基：用户/角色/菜单/RBAC/字典/日志/站点配置）、**api**（公共接口：健康检查/上传/公共配置）
- **crm**（客户/线索/商机/合同/回款/公海/产品 SKU）、**psi**（进销存：采购/销售/退货/库存/仓库/供应商）
- **finance**（财务：应收应付/凭证/发票/科目）、**hrm**（人事：员工/考勤/工资/绩效/招聘）
- **oa**（协同：报销/出差/借款/会议/日志/日程/公告）、**approval**（审批引擎：流程设计器/待办）
- **cms**（官网内容管理）、**kb**（知识库）、**cloud**（云盘）、**project**（项目管理）
- **enterprise**（企业服务：定时任务等）、**marketing**（营销：抖音线索对接）、**mall**（公开商城）
- **mcp**（AI 工具层，挂载 `/mcp`，API Key 认证，全功能开放给大模型）

新增业务模块：在 `internal/module/<name>/` 下实现 `Module` 接口，在 `cmd/server/main.go` 注册即可。

## 部署

```bash
make up         # docker-compose 启动 mysql + redis + app
```

最低配置：CPU 2 核 / 内存 4G / 硬盘 40G / Linux。

容量与压测评估见 [docs/CAPACITY.md](docs/CAPACITY.md)（2C4G + 2C2G 单机承载约 150-400 在线用户，优化后可到 800）。
文件存储（本地/OSS 双桶）见 [docs/OSS.md](docs/OSS.md)。

## 许可与商业服务

版权归 **河南爱编程网络科技有限公司** 所有，基于 [MIT 协议](../LICENSE) 开源——自行部署、使用、修改完全免费。

- **官方部署服务**（由我们代为部署上线）：**500 元 / 次**
- **二次开发 / 定制**：面谈

详见[工作区 README](../README.md)「版权与商业服务」。

