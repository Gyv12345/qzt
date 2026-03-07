# QZT Backend

企智通后端服务 - NestJS API Server

[English](./README.en.md)

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| NestJS | ^10.0.0 | 渐进式 Node.js 框架 |
| Prisma | ^5.7.1 | 现代化 ORM |
| TypeScript | ^5.1.3 | 类型安全 |
| Redis | ^4.6.11 | 缓存与消息队列 |
| BullMQ | ^5.67.2 | 任务队列 |
| JWT | ^10.2.0 | JSON Web Token 认证 |
| Passport | ^10.0.3 | 认证中间件 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env

# 生成 Prisma Client
pnpm prisma:generate

# 数据库迁移
pnpm prisma:migrate

# 启动开发服务器
pnpm start:dev

# API 文档: http://localhost:7890/api-docs
```

## 项目结构

```
backend/
├── prisma/           # Prisma schema 和迁移
├── src/
│   ├── auth/         # 认证模块 (JWT, Passport, TOTP)
│   ├── cms/          # 内容管理模块
│   ├── contracts/    # 合同管理模块
│   ├── customers/    # 客户管理模块
│   ├── departments/  # 部门管理模块
│   ├── invoices/     # 发票管理模块
│   ├── logs/         # 日志模块
│   ├── payments/     # 支付管理模块
│   ├── permissions/  # 权限管理模块
│   ├── products/     # 产品管理模块
│   ├── service-teams/# 服务团队模块
│   ├── system/       # 系统配置模块
│   ├── users/        # 用户管理模块
│   └── main.ts       # 应用入口
└── scripts/          # 工具脚本
```

## API 约定

### 命名规范

- **@ApiTags** 必须使用英文标签（如 `'users'`, `'customers'`）
- 控制器命名: `XxxController`
- 服务命名: `XxxService`
- 模块命名: `XxxModule`

### 响应格式

**成功响应**
```typescript
// 单个资源
{
  data: { id: 1, name: "xxx" }
}

// 分页数据
{
  data: [...],
  total: 100,
  page: 1,
  pageSize: 10,
  totalPages: 10
}
```

**HTTP 状态码**
- `200` - 成功（GET、PUT、PATCH）
- `201` - 创建成功（POST）
- `204` - 无返回内容（DELETE）
- `400` - 请求参数错误
- `401` - 未认证
- `403` - 无权限
- `404` - 资源不存在
- `500` - 服务器错误

## 开发命令

```bash
# 构建
pnpm build

# 代码检查
pnpm lint

# 格式化
pnpm format

# 运行测试
pnpm test
pnpm test:e2e
pnpm test:cov

# Prisma 相关
pnpm prisma:generate    # 生成 Prisma Client
pnpm prisma:migrate     # 运行迁移
pnpm prisma:studio      # 打开 Prisma Studio

# PM2 管理（生产环境）
pnpm pm2:start
pnpm pm2:stop
pnpm pm2:restart
pnpm pm2:logs
pnpm pm2:monit
```

## 环境变量

查看 `.env.example` 获取完整的环境变量列表：

```bash
# 数据库
DATABASE_URL=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# 阿里云 OSS（可选）
ALI_OSS_REGION=
ALI_OSS_ACCESS_KEY_ID=
ALI_OSS_ACCESS_KEY_SECRET=
ALI_OSS_BUCKET=
```

## 许可证

MIT
