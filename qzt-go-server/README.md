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
cp config/config.dev.yaml config/config.yaml
# 按需修改数据库连接、JWT 密钥等
```

### 3. 运行

```bash
make run        # 首次启动会自动建表 + 写入种子数据（admin 角色 / 超管账号）
```

默认管理员账号：`admin` / `admin123`

### 4. 构建

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

## 模块规划

- ✅ **第一阶段（本仓库）**：基础平台 + RBAC 权限中心 + 系统管理
- 🔜 CRM / CMS / 进销存 / HRM / EMR：按需新增 `internal/module/<name>/`，互不耦合

## 部署

```bash
make up         # docker-compose 启动 mysql + redis + app
```

最低配置：CPU 2 核 / 内存 4G / 硬盘 40G / Linux。
