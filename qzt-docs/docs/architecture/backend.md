---
sidebar_position: 2
sidebar_label: 后端架构
---

# 后端架构

后端 `qzt-go-server` 是企智通的核心。它使用 Go 语言编写，采用**单体 + 模块化**的方式组织代码，兼顾部署简便与代码清晰。本文介绍后端的分层结构、模块化机制与中间件链。

## 目录结构概览

```
qzt-go-server/
├── cmd/
│   └── server/             # 程序入口 main.go
├── internal/
│   ├── app/                # 应用启动、依赖装配
│   ├── config/             # 配置加载 (Viper)
│   ├── middleware/         # 中间件实现
│   ├── mcp/                # MCP 协议服务端（AI 工具接口）
│   ├── pkg/                # 通用工具（响应、错误、上下文、存储、邮件）
│   └── module/             # 业务模块（核心）
│       ├── crm/            # 客户关系管理
│       │   ├── handler/    # HTTP 处理层
│       │   ├── service/    # 业务逻辑层
│       │   ├── repository/ # 数据访问层
│       │   ├── model/      # 数据模型（GORM 结构体）
│       │   ├── dto/        # 请求/响应数据传输对象
│       │   └── router.go   # 模块路由注册
│       ├── approval/       # 审批中心
│       ├── hrm/            # 人事管理
│       ├── psi/            # 进销存
│       ├── finance/        # 财务管理
│       ├── oa/             # 办公自动化
│       ├── project/        # 项目管理
│       ├── enterprise/     # 定时任务
│       ├── kb/             # 知识库
│       ├── cloud/          # 企业网盘
│       ├── mail/           # 邮件服务
│       ├── cms/            # 内容管理
│       ├── ai/             # AI 助手
│       ├── api/            # 公共服务（文件上传、附件、BI 仪表盘）
│       └── system/         # 系统管理
├── docs/sql/               # 建表 DDL + 种子数据（手动执行）
├── config/                 # 配置文件（dev / prod / uat）
└── go.mod
```

## 分层架构

每个业务模块内部遵循**四层架构**，职责清晰、依赖单向流动（上层依赖下层，下层不感知上层）。

```
┌─────────────────────────────────────────────────┐
│  Handler 层 (HTTP 处理)                          │
│  · 参数绑定与校验 (ShouldBindJSON)               │
│  · 调用 Service                                  │
│  · 统一响应封装                                   │
│  · 不含业务逻辑                                   │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Service 层 (业务逻辑)                           │
│  · 编排业务规则（校验、组合、事务）                │
│  · 跨 repository 协作                            │
│  · 权限与数据范围过滤                             │
│  · 触发事件 / 通知                               │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Repository 层 (数据访问)                        │
│  · GORM CRUD 封装                                │
│  · 复杂查询、预加载、事务                         │
│  · 不含业务判断                                   │
└────────────────────┬────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│  Model 层 (数据模型)                             │
│  · GORM 结构体，映射数据库表                      │
│  · 字段标签、关联关系                             │
│  · 钩子（BeforeCreate / AfterUpdate）            │
└─────────────────────────────────────────────────┘
```

### 各层职责边界

| 层 | 允许做 | 禁止做 |
| --- | --- | --- |
| Handler | HTTP 绑定、调用 Service、响应 | 直接操作 DB、写业务规则 |
| Service | 业务规则、事务、跨 repo 编排 | 直接处理 HTTP 对象（*gin.Context） |
| Repository | DB 读写、查询封装 | 业务校验、组合多表业务逻辑 |
| Model | 定义字段与关联 | 含业务方法（保持纯粹的数据载体） |

## 模块化设计

企智通的业务能力被拆分为多个**独立模块**，每个模块实现统一的 `Module` 接口。框架在启动时遍历所有模块，完成路由注册、菜单注册、权限注册、数据迁移等动作。

### Module 接口

```go
type Module interface {
    // 模块名（唯一标识，如 "crm"）
    Name() string

    // 注册 HTTP 路由
    RegisterRoutes(r *gin.RouterGroup)

    // 注册菜单（写入 sys_menus，驱动前端路由）
    RegisterMenus() []Menu

    // 注册权限码（写入 Casbin 策略）
    RegisterPermissions() []Permission

    // 注册数据字典
    RegisterDictionaries() []Dictionary

    // 启动时的初始化（如加载缓存）
    Bootstrap() error
}
```

### 模块协作

模块之间需要协作时（例如合同模块需要查询客户模块的数据），通过以下方式：

- **依赖注入**：在模块装配时注入其他模块的 service 接口，而非直接 import
- **领域事件**：模块发布事件（如 `customer.created`），其他模块订阅
- **共享 service**：通用的能力（如用户查询、文件上传）由 `system` 模块提供，其他模块依赖

这种设计避免了模块间的强耦合，未来如果某个模块体量过大，可以平滑拆分为独立服务。

## 中间件链

所有进入业务路由的请求都会经过一条**有序的中间件链**。顺序至关重要，前一层的输出是后一层的输入。

```
请求进入
   │
   ▼
1. Recovery       // panic 捕获，返回 500，防止进程崩溃
   │
   ▼
2. Trace          // 生成/透传 traceId，写入 context 与响应头
   │
   ▼
3. CORS           // 处理跨域预检，设置 Access-Control-* 头
   │
   ▼
4. Logger         // 记录请求方法、路径、耗时、状态码
   │
   ▼
5. Auth           // 解析 JWT，注入当前用户到 context；白名单路由跳过
   │
   ▼
6. OperationLog   // 对写操作（POST/PUT/DELETE）异步记录操作日志
   │
   ▼
7. CasbinRBAC     // 基于 (角色, 路径, 方法) 校验 API 访问权限
   │
   ▼
业务 Handler
```

### 中间件说明

| 中间件 | 作用 | 备注 |
| --- | --- | --- |
| **Recovery** | 兜底 panic，返回统一 500 响应 | 必须在最外层 |
| **Trace** | 生成 `traceId`，串联日志 | 透传客户端 traceId |
| **CORS** | 允许跨域 | 配置白名单域名 |
| **Logger** | 结构化访问日志 | 使用 Zap，异步落盘 |
| **Auth** | JWT 解析与校验 | 失败返回 401；登录等白名单跳过 |
| **OperationLog** | 写操作审计 | 异步写入 `sys_operation_logs` |
| **CasbinRBAC** | API 级权限校验 | 超管旁路，直接放行 |

## 应用启动流程

```
main.go
  │
  ▼
加载配置 (Viper 读取 yaml + 环境变量覆盖)
  │
  ▼
初始化基础组件: DB / Redis / OSS / Casbin / Logger
  │
  ▼
扫描 internal/module 下所有 Module 实现
  │
  ▼
顺序执行每个模块的:
   · Bootstrap()      // 初始化（如加载缓存）
   · RegisterMenus()  // 菜单写入 DB
   · RegisterPermissions() // 权限写入 Casbin
   · RegisterDictionaries() // 字典写入 DB
  │
  ▼
装配 Gin 引擎，挂载中间件链
  │
  ▼
调用各模块 RegisterRoutes() 注册业务路由
  │
  ▼
启动 HTTP 服务 (优雅关闭: 捕获 SIGTERM, 等待连接排空)
```

## 错误处理

后端使用统一的错误模型，业务错误与系统错误分离：

- **业务错误**：返回 HTTP 200，但 `code` 非 0（如 `code: 10001` 表示客户名重复）。这类错误是可预期的，前端可针对 code 做友好提示。
- **系统错误**：返回 HTTP 5xx，`code` 为通用错误码。这类错误通常是 bug 或基础设施故障。
- **鉴权错误**：401（未登录）、403（无权限）。

业务错误码按模块分段，例如：

```
10000-10999  通用
11000-11999  CRM
12000-12999  HRM
13000-13999  PSI
...
```

## 扩展阅读

- [整体架构](./overview)：系统全景
- [数据库设计](./database)：建表与命名规范
- [认证与权限](./auth)：JWT 与 Casbin 细节
