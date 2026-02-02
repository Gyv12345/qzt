# 企账通SCRM系统技术设计文档

**文档版本**: v1.0
**创建日期**: 2026-02-02
**技术栈**: NestJS + Prisma + Umi + Ant Design Pro

---

## 目录

1. [整体技术架构](#1-整体技术架构)
2. [数据库设计](#2-数据库设计核心实体)
3. [后端模块设计](#3-后端模块设计nestjs最佳实践)
4. [前端设计](#4-前端设计umi--ant-design-pro)
5. [自动化规则引擎设计](#5-自动化规则引擎设计)
6. [开发计划和实施步骤](#6-开发计划和实施步骤)
7. [技术细节和最佳实践](#7-技术细节和最佳实践)

---

## 1. 整体技术架构

### 后端技术栈

- **框架**: NestJS 10.x (使用nestjs-best-practices skill)
- **ORM**: Prisma 5.x (支持SQLite/MySQL无缝切换)
- **缓存**: Redis (生产) + NestJS内置CacheModule (开发)
- **认证**: JWT + Passport.js + Guards
- **API文档**: Swagger/OpenAPI 3.0 (导出JSON供Umi使用)
- **验证**: class-validator + class-transformer (全局管道)

### 前端技术栈

- **框架**: Umi 4.x + Ant Design Pro
- **UI框架**: Ant Design 5.x + ProComponents
- **状态管理**: React Query (Umi插件) + Model (Umi内置)
- **路由**: Umi Router (内置)
- **API生成**: @umijs/openapi (从后端Swagger自动生成)
- **类型**: 自动从OpenAPI生成TypeScript类型

### 关键集成点

```
后端NestJS → Swagger导出openapi.json
         ↓
前端Umi → @umijs/openapi读取 → 自动生成services和types
```

### 项目结构

```
qzt/
├── backend/                    # NestJS后端
│   ├── prisma/                # Prisma配置
│   │   ├── schema.prisma      # 数据模型
│   │   └── migrations/        # 迁移文件
│   ├── src/
│   │   ├── modules/           # 业务模块
│   │   │   ├── auth/          # 认证模块
│   │   │   ├── user/          # 用户模块
│   │   │   ├── customer/      # 客户模块
│   │   │   ├── contract/      # 合同模块
│   │   │   └── automation/    # 自动化引擎
│   │   ├── common/            # 通用代码
│   │   ├── config/            # 配置
│   │   └── main.ts
│   └── swagger.json           # Swagger导出的OpenAPI规范
├── frontend/                   # Umi + Ant Design Pro
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   ├── components/        # 通用组件
│   │   ├── services/          # API服务(自动生成)
│   │   ├── .umi/              # Umi临时文件
│   │   └── app.tsx            # Umi运行时配置
│   ├── openapi.config.js      # OpenAPI生成配置
│   └── .umirc.ts              # Umi配置
└── docs/                      # 设计文档
```

### 开发流程

1. 后端NestJS使用Swagger装饰器标注API
2. 后端启动后导出`swagger.json`
3. 前端配置`openapi.config.js`指向后端swagger.json
4. 运行`umi openapi`自动生成`services/`和类型定义
5. 前端直接导入生成的类型安全的API服务

---

## 2. 数据库设计(核心实体)

### 核心实体关系

```
User (用户) → Role (角色) → Permission (权限)
    ↓
Customer (客户) → Contract (合同) → Payment (收款)
    ↓                    ↓
FollowRecord (跟进记录)  Product (产品) → ProductFlow (产品流程)
    ↓                    ↓
ServiceTeam (服务团队)  Invoice (开票记录)
```

### Prisma Schema核心模型

```prisma
// 用户和权限
model User {
  id          String    @id @default(cuid())
  username    String    @unique
  password    String
  name        String
  status      Int       @default(1) // 1:启用 0:禁用
  tenantId    String
  roles       Role[]    @relation("UserRoles")
  created     DateTime  @default(now())

  @@index([tenantId])
}

model Role {
  id          String     @id @default(cuid())
  name        String
  code        String     @unique
  permissions Permission[]
  users       User[]     @relation("UserRoles")
}

// 客户模块
model Customer {
  id              String    @id @default(cuid())
  name            String    // 客户名称
  contactName     String    // 联系人
  contactPhone    String    // 联系电话
  companyName     String?   // 公司名称
  customerLevel   Int       @default(0) // 0:潜在 1:意向 2:正式
  sourceChannel   Int?      // 来源渠道
  followUserId    String?   // 跟进人ID
  tenantId        String
  status          Int       @default(1)
  created         DateTime  @default(now())

  contracts       Contract[]
  followRecords   FollowRecord[]
  serviceTeams    ServiceTeam[]

  @@index([tenantId, followUserId])
}

// 合同模块
model Contract {
  id              String    @id @default(cuid())
  contractNo      String    @unique
  customerId      String
  productId       String
  amount          Decimal
  status          Int       @default(0) // 0:待收款 1:部分收款 2:已收全
  serviceStart    DateTime
  serviceEnd      DateTime
  tenantId        String
  created         DateTime  @default(now())

  customer        Customer  @relation(fields: [customerId], references: [id])
  payments        Payment[]

  @@index([tenantId, customerId])
}

// 收款模块
model Payment {
  id          String    @id @default(cuid())
  contractId  String
  amount      Decimal
  method      String    // 收款方式
  voucherUrl  String?   // 凭证URL
  status      Int       @default(0)
  tenantId    String
  created     DateTime  @default(now())

  contract    Contract  @relation(fields: [contractId], references: [id])

  @@index([tenantId, contractId])
}

// 产品模块
model Product {
  id              String    @id @default(cuid())
  name            String
  price           Decimal
  invoiceLimit    Decimal   @default(0) // 开票额度
  invoiceCount    Int       @default(0) // 开票张数
  tenantId        String
  status          Int       @default(1)

  contracts       Contract[]
  flows           ProductFlow[]

  @@index([tenantId])
}

// 产品流程
model ProductFlow {
  id          String   @id @default(cuid())
  productId   String
  name        String   // 流程名称
  type        String   // NODE:节点流程 CYCLE:周期流程
  config      Json     // 流程配置
  tenantId    String
  enabled     Boolean  @default(true)

  product     Product  @relation(fields: [productId], references: [id])

  @@index([tenantId])
}

// 开票记录
model Invoice {
  id          String    @id @default(cuid())
  customerId  String
  amount      Decimal
  count       Int       // 开票张数
  month       String    // 开票月份
  isOverLimit Boolean   @default(false) // 是否超额
  tenantId    String
  created     DateTime  @default(now())

  @@index([tenantId, customerId, month])
}

// 跟进记录
model FollowRecord {
  id          String    @id @default(cuid())
  customerId  String
  userId      String
  type        Int       // 跟进类型
  content     String
  nextTime    DateTime? // 下次跟进时间
  tenantId    String
  created     DateTime  @default(now())

  customer    Customer  @relation(fields: [customerId], references: [id])

  @@index([tenantId, customerId])
}

// 服务团队
model ServiceTeam {
  id          String   @id @default(cuid())
  customerId  String
  userId      String
  roleCode    String   // 角色代码
  tenantId    String

  customer    Customer @relation(fields: [customerId], references: [id])

  @@unique([customerId, userId, roleCode])
  @@index([tenantId])
}
```

---

## 3. 后端模块设计(NestJS最佳实践)

### 模块化架构

```
src/
├── main.ts                    # 应用入口
├── app.module.ts              # 根模块
├── common/                    # 通用模块
│   ├── decorators/           # 自定义装饰器
│   │   ├── current-user.decorator.ts
│   │   └── tenant.decorator.ts
│   ├── filters/              # 异常过滤器
│   │   └── http-exception.filter.ts
│   ├── guards/               # 守卫
│   │   ├── auth.guard.ts
│   │   └── permission.guard.ts
│   ├── interceptors/         # 拦截器
│   │   ├── transform.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── pipes/                # 管道
│   │   └── validation.pipe.ts
│   └── dto/                  # 通用DTO
│       ├── pagination.dto.ts
│       └── response.dto.ts
├── config/                   # 配置
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── redis.config.ts
└── modules/                  # 业务模块
    ├── auth/                 # 认证模块
    ├── user/                 # 用户管理
    ├── customer/             # 客户管理
    ├── contract/             # 合同管理
    ├── payment/              # 收款管理
    ├── product/              # 产品管理
    ├── invoice/              # 开票管理
    ├── automation/           # 自动化引擎
    └── workflow/             # 流程管理
```

### 标准模块结构(以customer为例)

```
customer/
├── customer.module.ts        # 模块定义
├── customer.controller.ts    # 控制器(路由)
├── customer.service.ts       # 服务(业务逻辑)
├── entities/                 # Prisma实体映射
│   └── customer.entity.ts
├── dto/                      # 数据传输对象
│   ├── create-customer.dto.ts
│   ├── update-customer.dto.ts
│   └── query-customer.dto.ts
└── customer.spec.ts          # 单元测试
```

### NestJS最佳实践应用

- 使用依赖注入松耦合
- 全局验证管道
- 统一响应格式拦截器
- 租户隔离装饰器
- Swagger API文档装饰器

---

## 4. 前端设计(Umi + Ant Design Pro)

### 前端架构

```
src/
├── app.tsx                   # Umi运行时配置
├── .umi/                     # Umi生成(不提交)
├── pages/                    # 页面路由
│   ├── index.tsx             # 首页
│   ├── customer/             # 客户管理
│   │   ├── list.tsx          # 客户列表
│   │   ├── detail.tsx        # 客户详情
│   │   └── follow.tsx        # 跟进记录
│   ├── contract/             # 合同管理
│   ├── product/              # 产品配置
│   ├── system/               # 系统配置
│   │   ├── user/             # 用户管理
│   │   ├── role/             # 角色管理
│   │   └── permission/       # 权限管理
│   └── automation/           # 自动化规则
├── components/               # 通用组件
│   ├── PageContainer/        # 页面容器
│   ├── StandardTable/        # 标准表格
│   └── ModalForm/            # 模态表单
├── services/                 # API服务(自动生成)
│   ├── typings.d.ts          # 类型定义
│   ├── customer.ts           # 客户API
│   ├── contract.ts           # 合同API
│   └── ...
├── models/                   # Umi数据流
│   ├── user.ts               # 用户状态
│   ├── customer.ts           # 客户状态
│   └── global.ts             # 全局状态
├── hooks/                    # 自定义Hooks
│   ├── useRequest.ts         # 请求Hook
│   └── useTable.ts           # 表格Hook
└── utils/                    # 工具函数
    ├── authority.ts          # 权限检查
    └── format.ts             # 格式化
```

### Umi配置关键点

```typescript
// .umirc.ts
export default {
  routes: [
    {
      path: '/customer',
      component: '@/pages/customer',
      access: 'canViewCustomer', // 权限控制
    },
  ],
  request: {
    dataField: 'data',         // 响应数据字段
  },
  openAPI: {
    // OpenAPI生成配置
  },
  model: {},                  // 启用数据流
  initialState: {},           // 初始状态
  port: 7890,                 // 开发服务器端口
  proxy: {
    '/api': {
      target: 'http://localhost:3456',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
};
```

### Ant Design Pro最佳实践

- 使用ProTable快速构建列表页
- 使用ProForm构建表单
- 使用@umijs/max的useRequest管理API状态
- 使用access权限系统控制页面/按钮权限
- 响应式布局(适配手机/PC)

---

## 5. 自动化规则引擎设计

### 核心架构

```
automation/
├── engine/
│   ├── event-dispatcher.service.ts    # 事件分发器
│   ├── rule-matcher.service.ts        # 规则匹配器
│   ├── condition-evaluator.service.ts  # 条件评估器
│   └── action-executor.service.ts     # 动作执行器
├── entities/
│   ├── trigger.entity.ts              # 触发器
│   ├── condition.entity.ts            # 触发条件
│   ├── workflow.entity.ts             # 动作链
│   └── log.entity.ts                  # 执行日志
├── decorators/
│   ├── auto-entity.decorator.ts       # 实体注册装饰器
│   └── auto-field.decorator.ts        # 字段注册装饰器
├── actions/                            # 动作实现
│   ├── record-add.action.ts
│   ├── record-update.action.ts
│   └── message.action.ts
└── automation.module.ts
```

### 事件驱动流程

```
业务操作(如创建客户)
    ↓
Service层发布事件(EntityCreateEvent)
    ↓
eventDispatcher监听
    ↓
ruleMatcher匹配符合条件的触发器
    ↓
conditionEvaluator评估条件树
    ↓
actionExecutor执行动作链
    ↓
记录执行日志
```

### Prisma Schema

```prisma
model Trigger {
  id          String      @id @default(cuid())
  name        String
  type        String      // DATA_ADD, DATA_UPDATE, TIME_CONDITION
  entityType  String      // CUSTOMER, CONTRACT, etc.
  enabled     Boolean     @default(true)
  conditions  Condition[]
  workflows   Workflow[]
  tenantId    String
}

model Condition {
  id          String      @id @default(cuid())
  triggerId   String
  field       String      // 字段名
  operator    String      // =, >, <, IN, LIKE
  value       String      // 比较值
  logic       String      @default("AND") // AND, OR
  parentId    String?     // 父条件ID(支持树形结构)
  trigger     Trigger     @relation(fields: [triggerId])
}

model Workflow {
  id          String      @id @default(cuid())
  triggerId   String
  actionType  String      // RECORD_ADD, MESSAGE, etc.
  config      Json        // 动作配置(JSON)
  order       Int         // 执行顺序
  trigger     Trigger     @relation(fields: [triggerId])
}
```

### 预置规则模板

- 新客户欢迎跟进
- VIP客户7天未跟进提醒
- 合同到期前30天提醒
- 超额开票提醒

---

## 6. 开发计划和实施步骤

### 第一阶段:基础框架搭建(1-2周)

1. **初始化项目**
   - 创建backend/和frontend/目录
   - 配置NestJS项目(Prisma, Swagger, JWT)
   - 配置Umi + Ant Design Pro项目
   - 配置OpenAPI自动生成流程

2. **核心基础设施**
   - Prisma schema设计(所有核心表)
   - 数据库迁移机制
   - Redis缓存配置
   - 全局异常处理、验证、响应格式

3. **认证和权限**
   - JWT认证实现
   - RBAC权限系统
   - 守卫和装饰器
   - 登录/注册接口

### 第二阶段:核心业务模块(3-4周)

4. **用户和客户管理**
   - 用户CRUD
   - 客户CRUD
   - 客户列表、详情、搜索
   - 跟进记录

5. **合同和收款**
   - 产品管理
   - 合同创建、编辑
   - 收款记录
   - 开票管理

6. **服务团队**
   - 服务团队创建
   - 团队成员分配
   - 团队权限

### 第三阶段:高级功能(2-3周)

7. **自动化规则引擎**
   - 事件系统
   - 规则配置界面
   - 预置规则模板
   - 执行日志

8. **产品流程**
   - 节点流程配置
   - 周期任务配置
   - 流程执行

### 第四阶段:优化和测试(1-2周)

9. **前端优化**
   - 性能优化
   - 响应式适配
   - 用户体验优化

10. **测试和部署**
    - 单元测试
    - 集成测试
    - 部署脚本

---

## 7. 技术细节和最佳实践

### 环境变量配置

#### 开发环境

```env
# .env.development
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./dev.db"
REDIS_ENABLED="false"
JWT_SECRET="dev-secret-key"
JWT_EXPIRES_IN="7d"
BACKEND_PORT=3456
FRONTEND_PORT=7890
APP_NAME="企账通"
APP_URL="http://localhost:7890"
API_URL="http://localhost:3456"
```

#### 生产环境

```env
# .env.production
DATABASE_PROVIDER="mysql"
DB_HOST="your-mysql-host.com"
DB_PORT=3306
DB_USERNAME="qzt_user"
DB_PASSWORD="your-long-password-with-special-chars"
DB_DATABASE="qzt_prod"

REDIS_ENABLED="true"
REDIS_HOST="your-redis-host.com"
REDIS_PORT=6379
REDIS_PASSWORD="your-redis-password"
REDIS_DB=0

JWT_SECRET="production-jwt-secret-key"
JWT_EXPIRES_IN="7d"
BACKEND_PORT=3456
FRONTEND_PORT=7890
APP_NAME="企账通"
APP_URL="https://your-domain.com"
API_URL="https://api.your-domain.com"
```

### 数据库连接工厂

```typescript
// src/config/database.config.ts
export function getDatabaseUrl(): string {
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';

  if (provider === 'mysql') {
    const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;
    return `mysql://${DB_USERNAME}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
  } else {
    return process.env.DATABASE_URL || 'file:./dev.db';
  }
}
```

### 后端关键模式

```typescript
// 1. 统一响应格式
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context, next): Observable<any> {
    return next.handle().pipe(
      map(data => ({ code: 200, data, message: 'success' }))
    );
  }
}

// 2. 租户隔离装饰器
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.tenantId;
  },
);

// 3. Swagger文档
@ApiOperation({ summary: '创建客户' })
@ApiBearerAuth()
@Post()
async create(@Body() dto: CreateCustomerDto) {
  // ...
}
```

### 前端关键模式

```typescript
// 1. 使用ProTable
import { ProTable } from '@ant-design/pro-components';

<ProTable
  request={async (params) => {
    const res = await queryCustomerList(params);
    return { data: res.data.list, success: true, total: res.data.total };
  }}
  columns={columns}
  toolBarRender={() => [
    <Button type="primary" onClick={handleCreate}>新建</Button>
  ]}
/>

// 2. 使用useRequest
import { useRequest } from '@umijs/max';

const { data, loading, run } = useRequest(getCustomer, {
  manual: true,
});

// 3. 权限控制
import { useAccess } from '@umijs/max';

const access = useAccess();
{access.canCreateCustomer && <Button>新建</Button>}
```

### 开发环境启动

```bash
# 后端
cd backend
npm install
cp .env.example .env.development
npx prisma generate
npx prisma migrate dev
npm run start:dev

# 前端
cd frontend
npm install
npm run dev
```

### 生产环境部署

```bash
# 配置环境变量
cp .env.production.example .env.production
# 编辑.env.production填入真实配置

# 构建
npm run build

# 启动
npm run start:prod
```

---

## 总结

本文档定义了企账通SCRM系统的完整技术架构:

- **后端**: NestJS + Prisma + Redis,支持SQLite/MySQL切换
- **前端**: Umi + Ant Design Pro,使用OpenAPI自动生成类型
- **核心功能**: 客户管理、合同收款、开票管理、自动化规则引擎
- **开发模式**: 响应式PC端,本地开发SQLite,生产环境MySQL+Redis
- **端口配置**: 后端3456,前端7890,避免端口冲突

系统遵循NestJS和Umi的最佳实践,提供完整的RBAC权限系统、自动化规则引擎和企业级代码组织结构。
