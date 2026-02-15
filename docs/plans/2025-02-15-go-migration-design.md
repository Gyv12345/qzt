# 企智通 Go 迁移设计文档

> 日期：2025-02-15
> 状态：已批准

---

## 1. 背景

### 1.1 问题
- NestJS 后端启动内存占用 500MB+，服务器压力大
- 需要降低内存使用，提升部署效率

### 1.2 目标
- 启动内存：**500MB+ → 30-50MB**
- 保持前端不变，API 完全兼容
- 全新独立 Go 项目

---

## 2. 技术选型

| 类别 | 技术选型 | 说明 |
|------|---------|------|
| **框架** | Gin v1.9+ | 高性能 HTTP 框架 |
| **ORM** | GORM v1.25+ | 类似 Prisma 体验 |
| **数据库** | MySQL 8.0 | 保持一致 |
| **缓存** | Redis (go-redis) | JWT 黑名单、会话缓存 |
| **认证** | JWT (golang-jwt) | 保持和前端兼容 |
| **配置** | Viper | 支持 YAML/环境变量 |
| **日志** | Zap | 高性能结构化日志 |
| **参数校验** | validator v10 | 类似 Zod 的 tag 校验 |
| **API 文档** | Swagger (swaggo) | 自动生成 |

### 2.1 预期内存占用
- 启动：**15-25MB**
- 空闲运行：**30-50MB**
- 高负载：**80-120MB**

---

## 3. 架构设计

### 3.1 方案选择
**模块化单体架构**

### 3.2 目录结构

```
qzt-go/
├── cmd/
│   └── server/
│       └── main.go                 # 应用入口
│
├── configs/
│   ├── config.yaml                 # 默认配置
│   └── config.example.yaml         # 示例配置
│
├── internal/
│   ├── config/
│   │   └── config.go               # 配置加载（Viper）
│   │
│   ├── middleware/
│   │   ├── cors.go                 # CORS 跨域
│   │   ├── jwt.go                  # JWT 认证
│   │   ├── logger.go               # 请求日志
│   │   └── recovery.go             # Panic 恢复
│   │
│   ├── module/                     # 业务模块（按优先级迁移）
│   │   ├── auth/
│   │   │   ├── handler/            # HTTP 处理器
│   │   │   ├── service/            # 业务逻辑
│   │   │   ├── repository/         # 数据访问
│   │   │   ├── model/              # 数据模型
│   │   │   └── router.go           # 路由注册
│   │   ├── user/                   # 同上结构
│   │   ├── role/
│   │   └── department/
│   │
│   ├── pkg/
│   │   ├── response/               # 统一响应格式
│   │   ├── hash/                   # 密码哈希
│   │   └── jwt/                    # JWT 工具
│   │
│   └── router/
│       └── router.go               # 总路由注册
│
├── pkg/
│   └── database/
│       ├── mysql.go                # GORM 连接
│       └── redis.go                # Redis 连接
│
├── api/                            # API 文档
│   └── swagger/
│
├── scripts/
│   └── migrate.sh                  # 数据库迁移脚本
│
├── docker-compose.yaml
├── Dockerfile
├── Makefile
├── go.mod
└── go.sum
```

### 3.3 模块内部结构

```
module/{name}/
├── handler/
│   └── {name}.go           # HTTP 处理器
├── service/
│   └── {name}.service.go   # 业务逻辑
├── repository/
│   └── {name}.repo.go      # 数据库操作
├── model/
│   └── {name}.go           # GORM 模型
└── router.go               # 注册本模块路由
```

---

## 4. API 兼容性设计

### 4.1 响应格式（与 NestJS 保持一致）

```json
// 成功响应
{
    "data": { ... },
    "message": "操作成功"
}

// 分页响应
{
    "data": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
}

// 错误响应
{
    "statusCode": 400,
    "message": "参数错误",
    "error": "Bad Request"
}
```

### 4.2 认证机制

| 项目 | 规范 |
|------|------|
| **登录接口** | `POST /auth/login` → 返回 `accessToken` + `refreshToken` |
| **Token 格式** | Bearer Token，放在 `Authorization` header |
| **Token 过期** | access: 2小时，refresh: 7天 |
| **刷新接口** | `POST /auth/refresh` |
| **登出接口** | `POST /auth/logout`（Token 加入 Redis 黑名单） |

### 4.3 第一批 API 路由

```
认证模块:
POST   /auth/login           # 登录
POST   /auth/logout          # 登出
POST   /auth/refresh         # 刷新 Token
GET    /auth/me              # 获取当前用户

用户模块:
GET    /users                # 用户列表（分页）
GET    /users/:id            # 用户详情
POST   /users                # 创建用户
PUT    /users/:id            # 更新用户
DELETE /users/:id            # 删除用户

角色模块:
GET    /roles                # 角色列表
POST   /roles                # 创建角色
PUT    /roles/:id            # 更新角色
DELETE /roles/:id            # 删除角色

部门模块:
GET    /departments          # 部门列表（树形）
POST   /departments          # 创建部门
PUT    /departments/:id      # 更新部门
DELETE /departments/:id      # 删除部门
```

---

## 5. 数据模型（第一批）

### 5.1 User

```go
type User struct {
    gorm.Model
    Username     string  `gorm:"uniqueIndex;size:50" json:"username"`
    Password     string  `gorm:"size:255" json:"-"`
    Email        string  `gorm:"size:100" json:"email"`
    Phone        string  `gorm:"size:20" json:"phone"`
    RealName     string  `gorm:"size:50" json:"realName"`
    Avatar       string  `gorm:"size:255" json:"avatar"`
    Status       int     `gorm:"default:1" json:"status"`        // 1=启用 0=禁用
    DepartmentID *uint   `json:"departmentId"`
    Department   *Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
    Roles        []Role  `gorm:"many2many:user_roles" json:"roles,omitempty"`
}
```

### 5.2 Role

```go
type Role struct {
    gorm.Model
    Name        string `gorm:"uniqueIndex;size:50" json:"name"`
    Code        string `gorm:"uniqueIndex;size:50" json:"code"`
    Description string `gorm:"size:255" json:"description"`
    Status      int    `gorm:"default:1" json:"status"`
}
```

### 5.3 Department

```go
type Department struct {
    gorm.Model
    Name     string       `gorm:"size:50" json:"name"`
    ParentID *uint        `json:"parentId"`
    Parent   *Department  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
    Children []Department `gorm:"foreignKey:ParentID" json:"children,omitempty"`
    Sort     int          `gorm:"default:0" json:"sort"`
}
```

---

## 6. 迁移计划

### 6.1 第一阶段：核心模块

```
Step 1: 基础设施
├── 项目初始化（go mod、目录结构）
├── 配置管理（Viper）
├── 数据库连接（GORM）
├── Redis 连接（go-redis）
├── 日志（Zap）
├── 统一响应格式
└── Swagger 集成

Step 2: 中间件
├── CORS
├── JWT 认证
├── 请求日志
└── Panic 恢复

Step 3: Auth 模块
├── User Model（GORM）
├── 登录接口 POST /auth/login
├── 刷新接口 POST /auth/refresh
├── 登出接口 POST /auth/logout
└── 获取当前用户 GET /auth/me

Step 4: Users 模块
├── CRUD 接口
├── 分页查询
└── 密码修改

Step 5: Roles 模块
├── CRUD 接口
├── 权限关联
└── 用户-角色关联

Step 6: Departments 模块
├── CRUD 接口
├── 树形结构（parent_id）
└── 用户-部门关联

Step 7: 验证 & 交付
├── 单元测试
├── API 测试（与前端联调）
├── Docker 镜像构建
└── 内存占用验证
```

### 6.2 后续阶段

完成核心模块后，按业务优先级逐步迁移：
1. Customers、Contacts（客户管理）
2. Contracts、Payments（合同收款）
3. Products、Invoices（产品发票）
4. 其他模块...

---

## 7. 项目信息

- **新项目路径**：`/Users/shichenyang/WebstormProjects/qzt-go/`
- **部署方式**：Docker Compose
- **数据库**：全新 MySQL 实例，从零开始
