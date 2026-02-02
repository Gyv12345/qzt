# Phase 1: Infrastructure Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 搭建企账通SCRM系统的基础框架,包括后端NestJS项目、前端Umi项目、Prisma ORM配置、Swagger API文档、JWT认证、RBAC权限系统和OpenAPI自动生成流程

**Architecture:** 采用前后端分离架构,后端使用NestJS + Prisma支持SQLite/MySQL切换,前端使用Umi + Ant Design Pro,通过Swagger/OpenAPI实现类型安全的API集成

**Tech Stack:** NestJS 10.x, Prisma 5.x, Umi 4.x, Ant Design Pro 5.x, JWT, Passport, Swagger, Redis, class-validator

---

## Task 1: 初始化项目目录结构

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `frontend/package.json`
- Create: `frontend/.env.example`
- Create: `frontend/.gitignore`
- Create: `root package.json` (monorepo workspace)

**Step 1: 创建根目录package.json**

```json
{
  "name": "qzt",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "backend": "cd backend && npm run start:dev",
    "frontend": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run backend\" \"npm run frontend\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Step 2: 创建backend/package.json**

```json
{
  "name": "@qzt/backend",
  "version": "1.0.0",
  "description": "QZT Backend - NestJS API Server",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\"",
    "start": "nest start",
    "start:dev": "cross-env NODE_ENV=development nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "swagger": "ts-node src/scripts/swagger.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/swagger": "^7.1.17",
    "@nestjs/throttler": "^5.1.1",
    "@prisma/client": "^5.7.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "redis": "^4.6.11",
    "joi": "^17.11.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.9",
    "@types/passport-local": "^1.0.35",
    "@types/bcrypt": "^5.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "prisma": "^5.7.1",
    "source-map-support": "^0.5.21",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3",
    "cross-env": "^7.0.3"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

**Step 3: 创建backend/.env.example**

```env
# 环境配置
NODE_ENV=development

# 数据库配置
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./dev.db

# MySQL配置(生产环境使用)
# DB_HOST=localhost
# DB_PORT=3306
# DB_USERNAME=qzt_user
# DB_PASSWORD=your-password
# DB_DATABASE=qzt_prod

# Redis配置
REDIS_ENABLED=false
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# REDIS_DB=0

# JWT配置
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 服务端口
BACKEND_PORT=3456

# 应用配置
APP_NAME=企账通
APP_URL=http://localhost:7890
API_URL=http://localhost:3456
```

**Step 4: 创建backend/.gitignore**

```
# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Testing
coverage/
.nyc_output/

# Prisma
prisma/migrations/**/migration.sql
dev.db
dev.db-journal

# Temporary
*.tmp
.temp/
```

**Step 5: 创建frontend/package.json**

```json
{
  "name": "@qzt/frontend",
  "version": "1.0.0",
  "description": "QZT Frontend - Umi + Ant Design Pro",
  "scripts": {
    "start": "umi dev",
    "dev": "cross-env FRONTEND_PORT=7890 umi dev",
    "build": "UMI_ENV=production umi build",
    "postinstall": "umi setup",
    "prettier": "prettier --write \"**/*.{js,jsx,tsx,ts,less,md,json}\"",
    "test": "umi-test",
    "test:coverage": "umi-test --coverage",
    "openapi": "umi openapi"
  },
  "dependencies": {
    "@ant-design/icons": "^5.2.6",
    "@ant-design/pro-components": "^2.6.43",
    "@umijs/max": "^4.0.87",
    "antd": "^5.12.8",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "typescript": "^5.3.3",
    "prettier": "^3.1.1",
    "eslint": "^8.56.0",
    "cross-env": "^7.0.3"
  }
}
```

**Step 6: 创建frontend/.env.example**

```env
# 环境配置
NODE_ENV=development

# 服务端口
FRONTEND_PORT=7890

# 应用配置
APP_NAME=企账通
APP_URL=http://localhost:7890
API_URL=http://localhost:3456
```

**Step 7: 创建frontend/.gitignore**

```
# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Umi
.umi/
.umi-production/
src/.umi/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Temporary
*.tmp
.temp/
```

**Step 8: Commit**

```bash
git add .
git commit -m "feat: initialize project structure and package.json files"
```

---

## Task 2: 配置NestJS后端基础框架

**Files:**
- Create: `backend/tsconfig.json`
- Create: `backend/nest-cli.json`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`
- Create: `backend/src/config/env.validation.ts`
- Create: `backend/src/config/database.config.ts`

**Step 1: 创建backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Step 2: 创建backend/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "webpack": false
  }
}
```

**Step 3: 创建backend/src/config/env.validation.ts**

```typescript
import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),

  // 数据库配置
  DATABASE_PROVIDER: Joi.string()
    .valid('sqlite', 'mysql')
    .default('sqlite'),
  DATABASE_URL: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'sqlite',
      then: Joi.required(),
    }),
  DB_HOST: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_PORT: Joi.number()
    .default(3306)
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_USERNAME: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_PASSWORD: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_DATABASE: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),

  // Redis配置
  REDIS_ENABLED: Joi.boolean()
    .default(false),
  REDIS_HOST: Joi.string()
    .when('REDIS_ENABLED', {
      is: true,
      then: Joi.required(),
    }),
  REDIS_PORT: Joi.number()
    .default(6379),
  REDIS_PASSWORD: Joi.string()
    .allow(''),
  REDIS_DB: Joi.number()
    .default(0),

  // JWT配置
  JWT_SECRET: Joi.string()
    .required(),
  JWT_EXPIRES_IN: Joi.string()
    .default('7d'),

  // 服务端口
  BACKEND_PORT: Joi.number()
    .default(3456),

  // 应用配置
  APP_NAME: Joi.string()
    .default('企账通'),
  APP_URL: Joi.string()
    .default('http://localhost:7890'),
  API_URL: Joi.string()
    .default('http://localhost:3456'),
}).unknown(true);

export const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value;
};
```

**Step 4: 创建backend/src/config/database.config.ts**

```typescript
export function getDatabaseUrl(): string {
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';

  if (provider === 'mysql') {
    const {
      DB_HOST,
      DB_PORT = '3306',
      DB_USERNAME,
      DB_PASSWORD,
      DB_DATABASE,
    } = process.env;

    if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_DATABASE) {
      throw new Error('MySQL configuration is incomplete');
    }

    return `mysql://${DB_USERNAME}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
  } else {
    return process.env.DATABASE_URL || 'file:./dev.db';
  }
}
```

**Step 5: 创建backend/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { getDatabaseUrl } from './config/database.config';

async function bootstrap() {
  // 验证环境变量
  validateEnv();

  // 设置DATABASE_URL for Prisma
  process.env.DATABASE_URL = getDatabaseUrl();

  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 启用CORS
  app.enableCors();

  // Swagger API文档
  const config = new DocumentBuilder()
    .setTitle('企账通SCRM API')
    .setDescription('企账通SCRM系统API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.BACKEND_PORT || 3456;
  await app.listen(port);

  console.log(`
🚀 Application is running on: http://localhost:${port}
📚 API Documentation: http://localhost:${port}/api-docs
  `);
}

bootstrap();
```

**Step 6: 创建backend/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: configure NestJS backend framework with environment validation"
```

---

## Task 3: 配置Prisma ORM和数据库Schema

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/.gitkeep`

**Step 1: 初始化Prisma**

```bash
cd backend
npx prisma init
```

**Step 2: 编辑backend/prisma/schema.prisma**

```prisma
// Prisma Schema for QZT SCRM System

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // 开发环境使用sqlite,生产环境改为mysql
  url      = env("DATABASE_URL")
}

// ==================== 用户和权限 ====================

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  name      String
  email     String?  @unique
  phone     String?
  avatar    String?
  status    Int      @default(1) // 1:启用 0:禁用
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  roles     UserRole[]

  @@index([tenantId])
  @@map("users")
}

model Role {
  id          String     @id @default(cuid())
  name        String
  code        String     @unique
  description String?
  status      Int        @default(1)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  users       UserRole[]
  permissions RolePermission[]

  @@map("roles")
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@map("user_roles")
}

model Permission {
  id          String           @id @default(cuid())
  name        String           @unique
  code        String           @unique
  description String?
  type        String           // menu:菜单按钮 button:操作按钮 data:数据权限
  status      Int              @default(1)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  roles       RolePermission[]

  @@map("permissions")
}

model RolePermission {
  id           String     @id @default(cuid())
  roleId       String
  permissionId String
  createdAt    DateTime   @default(now())

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

// ==================== 客户模块 ====================

model Customer {
  id            String    @id @default(cuid())
  name          String    // 客户名称
  contactName   String    // 联系人
  contactPhone   String    // 联系电话
  contactEmail   String?   // 联系邮箱
  companyName   String?   // 公司名称
  address       String?   // 地址
  customerLevel Int       @default(0) // 0:潜在 1:意向 2:正式 3:VIP
  sourceChannel Int?      // 来源渠道
  followUserId  String?   // 跟进人ID
  tags          String?   // 标签(JSON数组)
  remark        String?   // 备注
  tenantId      String
  status        Int       @default(1)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  contracts     Contract[]
  followRecords FollowRecord[]
  invoices      Invoice[]
  serviceTeams  ServiceTeam[]

  @@index([tenantId, followUserId])
  @@index([tenantId, customerLevel])
  @@map("customers")
}

// ==================== 跟进记录 ====================

model FollowRecord {
  id          String    @id @default(cuid())
  customerId  String
  userId      String
  type        Int       // 跟进类型: 1:电话 2:微信 3:上门 4:邮件 5:其他
  content     String    // 跟进内容
  nextTime    DateTime? // 下次跟进时间
  images      String?   // 图片(JSON数组)
  tenantId    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([tenantId, customerId])
  @@index([tenantId, userId])
  @@map("follow_records")
}

// ==================== 产品模块 ====================

model Product {
  id              String    @id @default(cuid())
  name            String
  code            String    @unique
  description     String?
  price           Decimal   @db.Decimal(10, 2)
  invoiceLimit    Decimal   @db.Decimal(10, 2) @default(0) // 开票额度(月)
  invoiceCount    Int       @default(0) // 套餐包含开票张数(月)
  overLimitPrice  Decimal   @db.Decimal(10, 2) @default(0) // 超额单价
  status          Int       @default(1)
  tenantId        String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  contracts       Contract[]
  flows           ProductFlow[]

  @@index([tenantId])
  @@map("products")
}

// ==================== 产品流程 ====================

model ProductFlow {
  id          String   @id @default(cuid())
  productId   String
  name        String   // 流程名称
  type        String   // NODE:节点流程 CYCLE:周期流程
  config      Json     // 流程配置
  enabled     Boolean  @default(true)
  tenantId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@map("product_flows")
}

// ==================== 合同模块 ====================

model Contract {
  id              String    @id @default(cuid())
  contractNo      String    @unique
  customerId      String
  productId       String
  amount          Decimal   @db.Decimal(10, 2)
  paidAmount      Decimal   @db.Decimal(10, 2) @default(0)
  status          Int       @default(0) // 0:待收款 1:部分收款 2:已收全
  serviceStart    DateTime
  serviceEnd      DateTime
  remark          String?
  tenantId        String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  customer        Customer  @relation(fields: [customerId], references: [id])
  payments        Payment[]

  @@index([tenantId, customerId])
  @@index([tenantId, status])
  @@map("contracts")
}

// ==================== 收款模块 ====================

model Payment {
  id          String    @id @default(cuid())
  contractId  String
  amount      Decimal   @db.Decimal(10, 2)
  method      String    // 收款方式: 1:银行转账 2:微信 3:支付宝 4:现金
  voucherUrl  String?   // 凭证URL
  payTime     DateTime? // 付款时间
  status      Int       @default(0) // 0:待确认 1:已确认
  remark      String?
  tenantId    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  contract    Contract  @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@index([tenantId, contractId])
  @@map("payments")
}

// ==================== 开票记录 ====================

model Invoice {
  id          String    @id @default(cuid())
  customerId  String
  contractId  String?   // 关联合同(可选)
  amount      Decimal   @db.Decimal(10, 2)
  count       Int       // 开票张数
  month       String    // 开票月份(YYYY-MM)
  isOverLimit Boolean   @default(false) // 是否超额
  overAmount  Decimal?  @db.Decimal(10, 2) // 超额金额
  overCount   Int       @default(0) // 超额张数
  remark      String?
  tenantId    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([tenantId, customerId, month])
  @@map("invoices")
}

// ==================== 服务团队 ====================

model ServiceTeam {
  id          String   @id @default(cuid())
  customerId  String
  userId      String
  roleCode    String   // 角色代码: SALE,FINANCE,OUTWORK
  tenantId    String
  createdAt   DateTime @default(now())

  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@unique([customerId, userId, roleCode])
  @@index([tenantId])
  @@map("service_teams")
}

// ==================== 自动化规则引擎 ====================

model Trigger {
  id          String      @id @default(cuid())
  name        String
  code        String      @unique
  type        String      // DATA_ADD, DATA_UPDATE, TIME_CONDITION, SCHEDULED
  entityType  String      // CUSTOMER, CONTRACT, etc.
  enabled     Boolean     @default(true)
  conditions  Condition[]
  workflows   Workflow[]
  tenantId    String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([tenantId, entityType])
  @@map("triggers")
}

model Condition {
  id          String      @id @default(cuid())
  triggerId   String
  field       String      // 字段名
  operator    String      // =, !=, >, <, >=, <=, IN, LIKE, BETWEEN
  value       String      // 比较值(JSON)
  logic       String      @default("AND") // AND, OR
  parentId    String?     // 父条件ID(支持树形结构)
  trigger     Trigger     @relation(fields: [triggerId], references: [id], onDelete: Cascade)

  @@index([triggerId])
  @@map("conditions")
}

model Workflow {
  id          String      @id @default(cuid())
  triggerId   String
  actionType  String      // RECORD_ADD, RECORD_UPDATE, MESSAGE, CUSTOM
  config      Json        // 动作配置
  order       Int         // 执行顺序
  enabled     Boolean     @default(true)
  trigger     Trigger     @relation(fields: [triggerId], references: [id], onDelete: Cascade)

  @@index([triggerId])
  @@map("workflows")
}

model Log {
  id          String      @id @default(cuid())
  triggerId   String
  entityType  String?
  entityId    String?
  status      String      // SUCCESS, FAILED, PARTIAL
  duration    Int?        // 执行时长(ms)
  error       String?
  createdAt   DateTime    @default(now())

  details     LogDetail[]

  @@index([triggerId, createdAt])
  @@map("logs")
}

model LogDetail {
  id          String   @id @default(cuid())
  logId       String
  workflowId  String
  actionType  String
  config      Json
  status      String
  result      Json?
  error       String?
  createdAt   DateTime @default(now())

  log         Log      @relation(fields: [logId], references: [id], onDelete: Cascade)

  @@index([logId])
  @@map("log_details")
}
```

**Step 3: 创建第一个迁移**

```bash
cd backend
npx prisma migrate dev --name init
```

**Step 4: 生成Prisma Client**

```bash
npx prisma generate
```

**Step 5: Commit**

```bash
git add backend/prisma/
git commit -m "feat: configure Prisma ORM with complete database schema"
```

---

## Task 4: 实现JWT认证和Passport策略

**Files:**
- Create: `backend/src/modules/auth/auth.module.ts`
- Create: `backend/src/modules/auth/auth.controller.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/modules/auth/strategies/local.strategy.ts`
- Create: `backend/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/modules/auth/decorators/current-user.decorator.ts`
- Create: `backend/src/modules/auth/dto/login.dto.ts`
- Create: `backend/src/modules/auth/dto/register.dto.ts`

**Step 1: 创建auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
```

**Step 2: 创建auth.service.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 1) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
        })),
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: registerDto.username },
    });

    if (existingUser) {
      throw new UnauthorizedException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: registerDto.username,
        password: hashedPassword,
        name: registerDto.name,
        email: registerDto.email,
        phone: registerDto.phone,
        tenantId: registerDto.tenantId || 'default',
      },
      include: { roles: { include: { role: true } } },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async getUserInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const { password: _, ...result } = user;
    return result;
  }
}
```

**Step 3: 创建strategies/jwt.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 1) {
      throw new UnauthorizedException('账号无效或已被禁用');
    }

    const { password: _, ...result } = user;

    return {
      ...result,
      tenantId: payload.tenantId,
    };
  }
}
```

**Step 4: 创建strategies/local.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return user;
  }
}
```

**Step 5: 创建guards/jwt-auth.guard.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**Step 6: 创建decorators/current-user.decorator.ts**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

**Step 7: 创建dto/login.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
```

**Step 8: 创建dto/register.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: '租户ID', required: false })
  @IsString()
  @IsOptional()
  tenantId?: string;
}
```

**Step 9: 创建auth.controller.ts**

```typescript
import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getUserInfo(@CurrentUser() user: any) {
    return this.authService.getUserInfo(user.id);
  }
}
```

**Step 10: 更新app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 11: Commit**

```bash
git add backend/src/modules/auth/
git commit -m "feat: implement JWT authentication with Passport"
```

---

## Task 5: 配置Umi前端框架和Ant Design Pro

**Files:**
- Create: `frontend/.umirc.ts`
- Create: `frontend/src/app.tsx`
- Create: `frontend/src/global.less`
- Create: `frontend/typings.d.ts`

**Step 1: 创建frontend/.umirc.ts**

```typescript
import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: false,
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      component: '@/pages/login',
    },
    {
      path: '/',
      component: '@/layouts/index',
      wrapper: '@/wrappers/auth',
      routes: [
        { path: '/dashboard', component: '@/pages/dashboard' },
        {
          path: '/customer',
          component: '@/pages/customer',
          access: 'canViewCustomer',
        },
      ],
    },
  ],
  npmClient: 'npm',
  webpack: {},
  devtool: 'cheap-module-source-map',
  distTimings: true,
  mfsu: {},
  nodeModulesTransform: {},
  extraBabelPlugins: [],
  terserOptions: {},
  theme: {
    'primary-color': '#1890ff',
  },
  proxy: {
    '/api': {
      target: 'http://localhost:3456',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
  openAPI: [
    {
      requestLibPath: "import { request } from '@umijs/max'",
      schemaPath: 'http://localhost:3456/api-docs-json',
      projectName: 'qzt',
    },
  ],
  port: 7890,
});
```

**Step 2: 创建frontend/src/app.tsx**

```typescript
import { RequestConfig } from '@umijs/max';
import { message } from 'antd';

export async function getInitialState() {
  const token = localStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo');

  return {
    token,
    userInfo: userInfo ? JSON.parse(userInfo) : undefined,
  };
}

export const request: RequestConfig = {
  timeout: 10000,
  errorConfig: {
    adaptor: (resData) => {
      return {
        success: resData.code === 200,
        errorMessage: resData.message,
        data: resData.data,
      };
    },
  },
  requestInterceptors: [
    (config: any) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  ],
  responseInterceptors: [
    (response) => {
      if (response.status === 401) {
        message.error('登录已过期,请重新登录');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
      }
      return response;
    },
  ],
};
```

**Step 3: 创建frontend/src/global.less**

```less
html,
body,
#root {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji';
}

.page-container {
  padding: 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 64px);
}
```

**Step 4: 创建frontend/typings.d.ts**

```typescript
declare let APP_NAME: string;
declare let APP_URL: string;
declare let API_URL: string;

interface GlobalConfig {
  APP_NAME: string;
  APP_URL: string;
  API_URL: string;
}

declare const config: GlobalConfig;

export {};
```

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: configure Umi frontend framework with Ant Design Pro"
```

---

## Task 6: 实现前端登录页面和权限系统

**Files:**
- Create: `frontend/src/pages/login/index.tsx`
- Create: `frontend/src/wrappers/auth/index.tsx`
- Create: `frontend/src/access.ts`
- Create: `frontend/src/services/api.d.ts`

**Step 1: 创建frontend/src/pages/login/index.tsx`

```typescript
import { useState } from 'react';
import { Button, Form, Input, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import styles from './index.less';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setInitialState } = useModel('@@initialState');

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.code === 200) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userInfo', JSON.stringify(data.user));

        const initialState = await getInitialState();
        setInitialState(initialState);

        message.success('登录成功');
        history.push('/dashboard');
      } else {
        message.error(data.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败,请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard} title="企账通SCRM系统">
        <Form onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
```

**Step 2: 创建frontend/src/pages/login/index.less**

```less
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loginCard {
  width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

**Step 3: 创建frontend/src/wrappers/auth/index.tsx**

```typescript
import { useEffect } from 'react';
import { history } from '@umijs/max';

export default (props: any) => {
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      history.push('/login');
    }
  }, [token]);

  if (!token) {
    return null;
  }

  return props.children;
};
```

**Step 4: 创建frontend/src/access.ts**

```typescript
export default (initialState: { userInfo?: any }) => {
  const { userInfo } = initialState || {};

  const getPermissions = () => {
    if (!userInfo?.roles) return [];

    const permissions = new Set<string>();
    userInfo.roles.forEach((role: any) => {
      role.role.permissions.forEach((rp: any) => {
        permissions.add(rp.permission.code);
      });
    });

    return Array.from(permissions);
  };

  return {
    canViewCustomer: getPermissions().includes('customer:view'),
    canCreateCustomer: getPermissions().includes('customer:create'),
    canEditCustomer: getPermissions().includes('customer:edit'),
    canDeleteCustomer: getPermissions().includes('customer:delete'),
    isAdmin: userInfo?.roles?.some((r: any) => r.role.code === 'ADMIN'),
  };
};
```

**Step 5: 创建frontend/src/services/api.d.ts**

```typescript
declare namespace API {
  interface Customer {
    id: string;
    name: string;
    contactName: string;
    contactPhone: string;
    customerLevel: number;
    followUserId?: string;
  }

  interface PageResult<T> {
    list: T[];
    total: number;
  }

  interface Response<T> {
    code: number;
    data: T;
    message: string;
  }
}
```

**Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement login page and access control"
```

---

## Task 7: 配置OpenAPI自动生成和测试完整流程

**Files:**
- Create: `backend/src/scripts/swagger.ts`
- Create: `frontend/openapi.config.js`
- Modify: `backend/package.json` (添加swagger脚本)

**Step 1: 创建backend/src/scripts/swagger.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../app.module';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('企账通SCRM API')
    .setDescription('企账通SCRM系统API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('认证', '用户认证相关接口')
    .addTag('客户', '客户管理相关接口')
    .addTag('合同', '合同管理相关接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = join(process.cwd(), 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ Swagger JSON已生成: ${outputPath}`);

  await app.close();
}

generateSwagger();
```

**Step 2: 创建frontend/openapi.config.js**

```javascript
export default {
  requestLibPath: "import { request } from '@umijs/max'",
  schemaPath: 'http://localhost:3456/api-docs-json',
  projectName: 'qzt',
  serversPath: 'src/services',
  hooks: {
    afterOpenApiFileGenerated: (content) => {
      // 自定义生成后的处理
      return content;
    },
  },
};
```

**Step 3: 更新backend/package.json的scripts部分**

```json
{
  "scripts": {
    "swagger": "ts-node src/scripts/swagger.ts",
    "start:dev": "npm run swagger && cross-env NODE_ENV=development nest start --watch",
    ...
  }
}
```

**Step 4: 更新frontend/package.json的scripts部分**

```json
{
  "scripts": {
    "openapi": "umi openapi",
    "dev": "npm run openapi && cross-env FRONTEND_PORT=7890 umi dev",
    ...
  }
}
```

**Step 5: 创建测试端点验证完整流程**

创建 `backend/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('系统')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '健康检查' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
```

**Step 6: 创建测试文档 docs/testing.md**

```markdown
# 测试指南

## 后端测试

1. 启动后端:
```bash
cd backend
npm install
cp .env.example .env.development
npm run start:dev
```

2. 访问Swagger文档:
http://localhost:3456/api-docs

3. 测试健康检查:
```bash
curl http://localhost:3456/health
```

4. 测试登录:
```bash
curl -X POST http://localhost:3456/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

## 前端测试

1. 启动后端(确保后端先运行)

2. 启动前端:
```bash
cd frontend
npm install
npm run dev
```

3. 访问:
http://localhost:7890

## OpenAPI生成测试

1. 确保后端运行在 http://localhost:3456

2. 在前端目录运行:
```bash
cd frontend
npm run openapi
```

3. 检查生成的文件:
- `src/services/typings.d.ts`
- `src/services/api.ts`
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: configure OpenAPI auto-generation and testing setup"
```

---

## 验收标准

Phase 1 完成后,应该能够:

### ✅ 后端

1. NestJS项目可以正常启动(`npm run start:dev`)
2. Prisma可以连接SQLite数据库并生成Client
3. Swagger文档可以访问(http://localhost:3456/api-docs)
4. 用户登录接口正常工作
5. JWT token可以正常验证
6. 健康检查接口返回200

### ✅ 前端

1. Umi项目可以正常启动(`npm run dev`)
2. 登录页面可以正常显示
3. 登录后可以跳转到dashboard
4. OpenAPI配置正常,可以生成类型和API客户端
5. 权限系统正常工作

### ✅ 集成

1. 前端可以成功调用后端API
2. 登录后获取的token可以正常使用
3. 前端Swagger生成的类型和后端API保持一致
4. 前后端端口配置正确,无冲突

---

**下一步:** 准备好进入Phase 2: 核心业务模块开发(用户管理、客户管理、跟进记录)
