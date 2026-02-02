# 企账通单体应用实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将企账通从多租户SaaS架构改造为单体应用,实现完整的客户管理和运营系统,支持PC端和移动端响应式访问

**Architecture:**
- 后端: NestJS + Prisma ORM (开发SQLite, 生产MySQL)
- 前端: Umi 4.x + Ant Design Pro (响应式设计)
- 认证: JWT + RBAC权限系统
- 自动化: 事件驱动的规则引擎

**Tech Stack:**
- NestJS 10.x, Prisma 5.x, JWT, Swagger
- Umi 4.x, Ant Design 5.x, ProComponents, React Query
- 响应式断点: PC(>768px), Mobile(≤768px)

---

## 阶段一:移除租户架构 (2-3天)

### Task 1: 更新 Prisma Schema 移除 tenantId

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: 备份现有 schema**

```bash
cp backend/prisma/schema.prisma backend/prisma/schema.prisma.backup
```

**Step 2: 移除 User 模型的 tenantId**

编辑 `backend/prisma/schema.prisma`:
```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  name      String
  email     String?  @unique
  phone     String?
  avatar    String?
  status    Int      @default(1)
  // 移除: tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  roles         UserRole[]
  followRecords FollowRecord[]
  serviceTeams  ServiceTeam[]

  // 移除: @@index([tenantId])
  @@map("users")
}
```

**Step 3: 移除 Customer 模型的 tenantId**

```prisma
model Customer {
  id            String   @id @default(cuid())
  name          String
  contactName   String
  contactPhone  String
  contactEmail  String?
  companyName   String?
  address       String?
  customerLevel Int      @default(0)
  sourceChannel Int?
  followUserId  String?
  tags          String?
  remark        String?
  // 移除: tenantId      String
  status        Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  contracts     Contract[]
  followRecords FollowRecord[]
  invoices      Invoice[]
  serviceTeams  ServiceTeam[]

  @@index([followUserId])
  @@index([customerLevel])
  @@map("customers")
}
```

**Step 4: 移除所有其他模型的 tenantId**

重复类似操作,移除以下模型的 `tenantId` 字段:
- FollowRecord
- Product
- ProductFlow
- Contract
- Payment
- Invoice
- ServiceTeam
- Trigger
- Condition
- Workflow
- Log
- LogDetail

**Step 5: 移除 Role 和 Permission 的 tenantId**

Role 和 Permission 应该是全局共享的,不需要租户隔离:
```prisma
model Role {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique
  description String?
  status      Int      @default(1)
  // 移除: tenantId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       UserRole[]
  permissions RolePermission[]

  @@map("roles")
}
```

**Step 6: 重新生成 Prisma Client**

```bash
cd backend
pnpm prisma generate
```

**Step 7: 创建迁移脚本**

由于是开发环境,可以直接重置数据库:
```bash
cd backend
pnpm prisma migrate reset --force
```

**Step 8: 提交更改**

```bash
git add backend/prisma/schema.prisma
git commit -m "refactor: remove tenantId from all models for single-tenant architecture"
```

---

### Task 2: 移除后端租户相关代码

**Files:**
- Modify: `backend/src/modules/auth/auth.guard.ts` (如果有)
- Modify: `backend/src/modules/auth/auth.strategy.ts` (如果有)
- Modify: `backend/src/common/decorators/tenant.decorator.ts` (如果有)
- Delete: `backend/src/common/guards/tenant.guard.ts` (如果有)
- Delete: `backend/src/common/interceptors/tenant.interceptor.ts` (如果有)

**Step 1: 搜索租户相关代码**

```bash
cd backend
grep -r "tenantId" src/
grep -r "@Tenant" src/
grep -r "TenantGuard" src/
grep -r "TenantInterceptor" src/
```

**Step 2: 移除 Tenant Decorator**

如果存在 `backend/src/common/decorators/tenant.decorator.ts`,删除该文件。

**Step 3: 移除 Tenant Guard**

如果存在 `backend/src/common/guards/tenant.guard.ts`,删除该文件。

**Step 4: 移除 Tenant Interceptor**

如果存在 `backend/src/common/interceptors/tenant.interceptor.ts`,删除该文件。

**Step 5: 更新 Auth Guard**

移除对租户的检查:
```typescript
// 如果 auth.guard.ts 中有租户相关代码,移除它
// 例如:
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // 移除租户验证逻辑
    return super.canActivate(context);
  }
}
```

**Step 6: 移除 Service 中的 tenantId 过滤**

在所有 Service 中移除查询时的 `tenantId` 过滤条件:
```typescript
// Before:
async findAll(user: User) {
  return this.prisma.customer.findMany({
    where: { tenantId: user.tenantId }
  });
}

// After:
async findAll() {
  return this.prisma.customer.findMany();
}
```

**Step 7: 提交更改**

```bash
git add backend/src
git commit -m "refactor: remove tenant-related code from backend"
```

---

### Task 3: 移除前端租户相关代码

**Files:**
- Modify: `frontend/src/.umi/core/route.ts` 或路由配置文件
- Modify: `frontend/src/services/tenant.ts` (如果有)
- Modify: `frontend/src/app.ts` (移除租户选择器)
- Modify: `frontend/src/components/Header/index.tsx` (移除租户切换)

**Step 1: 搜索前端租户相关代码**

```bash
cd frontend
grep -r "tenant" src/
grep -r "租户" src/
```

**Step 2: 移除租户选择器组件**

如果存在租户选择器组件,删除相关代码。

**Step 3: 移除租户状态管理**

如果使用了 Redux/Context 管理租户状态,移除相关代码:
```typescript
// 移除类似这样的状态管理
// const [currentTenant, setCurrentTenant] = useState(null);
```

**Step 4: 移除 API 调用中的 tenantId 参数**

```typescript
// Before:
const { data } = await getCustomers({ tenantId: currentTenant.id });

// After:
const { data } = await getCustomers();
```

**Step 5: 移除类型定义中的 tenantId**

```typescript
// 移除接口中的 tenantId 字段
export interface Customer {
  id: string;
  name: string;
  // tenantId: string; // 删除这行
}
```

**Step 6: 提交更改**

```bash
git add frontend/src
git commit -m "refactor: remove tenant-related code from frontend"
```

---

## 阶段二:核心业务模块 - 客户管理 (1周)

### Task 4: 创建客户管理后端模块

**Files:**
- Create: `backend/src/modules/customer/customer.module.ts`
- Create: `backend/src/modules/customer/customer.controller.ts`
- Create: `backend/src/modules/customer/customer.service.ts`
- Create: `backend/src/modules/customer/dto/create-customer.dto.ts`
- Create: `backend/src/modules/customer/dto/update-customer.dto.ts`
- Create: `backend/src/modules/customer/dto/query-customer.dto.ts`

**Step 1: 创建 DTO**

创建 `backend/src/modules/customer/dto/create-customer.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsEmail, MinLength, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: '客户名称', example: 'XX科技' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  contactName: string;

  @ApiProperty({ description: '联系电话', example: '13800138000' })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  contactPhone: string;

  @ApiProperty({ description: '联系邮箱', required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ description: '公司名称', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: '地址', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: '客户等级: 0:潜在 1:意向 2:正式 3:VIP', default: 0 })
  @IsOptional()
  @IsInt()
  customerLevel?: number;

  @ApiProperty({ description: '来源渠道', required: false })
  @IsOptional()
  @IsInt()
  sourceChannel?: number;

  @ApiProperty({ description: '跟进人ID', required: false })
  @IsOptional()
  @IsString()
  followUserId?: string;

  @ApiProperty({ description: '标签(JSON数组)', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
```

创建 `backend/src/modules/customer/dto/update-customer.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
```

创建 `backend/src/modules/customer/dto/query-customer.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryCustomerDto {
  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  pageSize?: number = 10;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '客户等级', required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  customerLevel?: number;

  @ApiProperty({ description: '跟进人ID', required: false })
  @IsOptional()
  @IsString()
  followUserId?: string;

  @ApiProperty({ description: '排序字段', default: 'createdAt', required: false })
  @IsOptional()
  @IsString()
  sortField?: string = 'createdAt';

  @ApiProperty({ description: '排序方向', default: 'desc', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

**Step 2: 创建 Service**

创建 `backend/src/modules/customer/customer.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto, userId: string) {
    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        followUserId: createCustomerDto.followUserId || userId,
      },
      include: {
        followUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(query: QueryCustomerDto, userId?: string, userRole?: string) {
    const { page = 1, pageSize = 10, keyword, customerLevel, followUserId, sortField = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * pageSize;

    // 数据权限过滤
    let where: any = {};

    // 非管理员只能看到自己的客户
    if (userRole !== 'admin' && userId) {
      where.followUserId = userId;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { contactName: { contains: keyword } },
        { contactPhone: { contains: keyword } },
        { companyName: { contains: keyword } },
      ];
    }

    if (customerLevel !== undefined) {
      where.customerLevel = customerLevel;
    }

    if (followUserId) {
      where.followUserId = followUserId;
    }

    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortField]: sortOrder },
        include: {
          followUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return {
      total,
      data,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        followUser: {
          select: { id: true, name: true, email: true },
        },
        contracts: {
          include: {
            product: true,
          },
        },
        followRecords: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        serviceTeams: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer #${id} not found`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer #${id} not found`);
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
      include: {
        followUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer #${id} not found`);
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: 'Customer deleted successfully' };
  }

  async assign(assignDto: { customerIds: string[]; followUserId: string }) {
    const { customerIds, followUserId } = assignDto;

    // 验证跟进人存在
    const user = await this.prisma.user.findUnique({
      where: { id: followUserId },
    });

    if (!user) {
      throw new NotFoundException(`User #${followUserId} not found`);
    }

    // 批量更新
    await this.prisma.customer.updateMany({
      where: {
        id: { in: customerIds },
      },
      data: {
        followUserId,
      },
    });

    return {
      message: `Assigned ${customerIds.length} customers to ${user.name}`,
    };
  }
}
```

**Step 3: 创建 Controller**

创建 `backend/src/modules/customer/customer.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({ summary: '创建客户' })
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    return this.customerService.create(createCustomerDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: '获取客户列表' })
  findAll(@Query() query: QueryCustomerDto, @Request() req) {
    return this.customerService.findAll(query, req.user.userId, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取客户详情' })
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新客户' })
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除客户' })
  remove(@Param('id') id: string) {
    return this.customerService.remove(id);
  }

  @Post('assign')
  @ApiOperation({ summary: '分配客户' })
  assign(@Body() assignDto: { customerIds: string[]; followUserId: string }) {
    return this.customerService.assign(assignDto);
  }
}
```

**Step 4: 创建 Module**

创建 `backend/src/modules/customer/customer.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
```

**Step 5: 注册到 AppModule**

修改 `backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CustomerModule } from './modules/customer/customer.module';
// ... 其他导入

@Module({
  imports: [
    // ...
    CustomerModule,
  ],
  // ...
})
export class AppModule {}
```

**Step 6: 测试 API**

```bash
# 启动后端
cd backend
pnpm run start:dev

# 使用 Swagger 测试
# 访问 http://localhost:3000/api-docs
```

**Step 7: 提交代码**

```bash
git add backend/src/modules/customer
git commit -m "feat: implement customer management module"
```

---

### Task 5: 创建跟进记录模块

**Files:**
- Create: `backend/src/modules/follow-record/follow-record.module.ts`
- Create: `backend/src/modules/follow-record/follow-record.controller.ts`
- Create: `backend/src/modules/follow-record/follow-record.service.ts`
- Create: `backend/src/modules/follow-record/dto/create-follow-record.dto.ts`
- Create: `backend/src/modules/follow-record/dto/update-follow-record.dto.ts`

**Step 1: 创建 DTO**

创建 `backend/src/modules/follow-record/dto/create-follow-record.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateFollowRecordDto {
  @ApiProperty({ description: '客户ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '跟进类型: 1:电话 2:微信 3:上门 4:邮件 5:其他' })
  @IsInt()
  type: number;

  @ApiProperty({ description: '跟进内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '下次跟进时间', required: false })
  @IsOptional()
  @IsDateString()
  nextTime?: string;

  @ApiProperty({ description: '图片(JSON数组)', required: false })
  @IsOptional()
  @IsString()
  images?: string;
}
```

**Step 2: 创建 Service**

创建 `backend/src/modules/follow-record/follow-record.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFollowRecordDto } from './dto/create-follow-record.dto';

@Injectable()
export class FollowRecordService {
  constructor(private prisma: PrismaService) {}

  async create(createFollowRecordDto: CreateFollowRecordDto, userId: string) {
    return this.prisma.followRecord.create({
      data: {
        ...createFollowRecordDto,
        userId,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.followRecord.findMany({
      where: { customerId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
    const record = await this.prisma.followRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Follow record #${id} not found`);
    }

    // 只能删除自己的跟进记录
    if (record.userId !== userId) {
      throw new Error('You can only delete your own follow records');
    }

    await this.prisma.followRecord.delete({
      where: { id },
    });

    return { message: 'Follow record deleted successfully' };
  }
}
```

**Step 3: 创建 Controller**

创建 `backend/src/modules/follow-record/follow-record.controller.ts`:
```typescript
import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FollowRecordService } from './follow-record.service';
import { CreateFollowRecordDto } from './dto/create-follow-record.dto';

@ApiTags('follow-records')
@Controller('follow-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FollowRecordController {
  constructor(private readonly followRecordService: FollowRecordService) {}

  @Post()
  @ApiOperation({ summary: '创建跟进记录' })
  create(@Body() createFollowRecordDto: CreateFollowRecordDto, @Request() req) {
    return this.followRecordService.create(createFollowRecordDto, req.user.userId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: '获取客户的跟进记录' })
  findByCustomer(@Param('customerId') customerId: string) {
    return this.followRecordService.findByCustomer(customerId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除跟进记录' })
  remove(@Param('id') id: string, @Request() req) {
    return this.followRecordService.remove(id, req.user.userId);
  }
}
```

**Step 4: 创建 Module 并注册**

创建 `backend/src/modules/follow-record/follow-record.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { FollowRecordService } from './follow-record.service';
import { FollowRecordController } from './follow-record.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FollowRecordController],
  providers: [FollowRecordService],
  exports: [FollowRecordService],
})
export class FollowRecordModule {}
```

修改 `backend/src/app.module.ts`:
```typescript
import { FollowRecordModule } from './modules/follow-record/follow-record.module';

@Module({
  imports: [
    // ...
    FollowRecordModule,
  ],
})
export class AppModule {}
```

**Step 5: 提交代码**

```bash
git add backend/src/modules/follow-record
git commit -m "feat: implement follow record module"
```

---

### Task 6: 前端客户管理页面 - PC端

**Files:**
- Create: `frontend/src/pages/customer/index.tsx`
- Create: `frontend/src/pages/customer/components/CustomerTable.tsx`
- Create: `frontend/src/pages/customer/components/CustomerModal.tsx`

**Step 1: 创建客户列表页面**

创建 `frontend/src/pages/customer/index.tsx`:
```typescript
import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getCustomers, deleteCustomer } from '@/services/customer';
import { history } from '@umijs/max';
import CustomerModal from './components/CustomerModal';

const CustomerList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<any>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 120,
    },
    {
      title: '公司名称',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
      hideInSearch: true,
    },
    {
      title: '客户等级',
      dataIndex: 'customerLevel',
      key: 'customerLevel',
      width: 100,
      valueType: 'select',
      valueEnum: {
        0: { text: '潜在', status: 'Default' },
        1: { text: '意向', status: 'Processing' },
        2: { text: '正式', status: 'Success' },
        3: { text: 'VIP', status: 'Error' },
      },
      render: (_, record) => {
        const levelMap = {
          0: { text: '潜在', color: 'default' },
          1: { text: '意向', color: 'blue' },
          2: { text: '正式', color: 'green' },
          3: { text: 'VIP', color: 'gold' },
        };
        const level = levelMap[record.customerLevel] || levelMap[0];
        return <Tag color={level.color}>{level.text}</Tag>;
      },
    },
    {
      title: '跟进人',
      dataIndex: ['followUser', 'name'],
      key: 'followUserId',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => [
        <a key="detail" onClick={() => history.push(`/customer/${record.id}`)}>
          详情
        </a>,
        <a key="edit" onClick={() => { setCurrentCustomer(record); setModalVisible(true); }}>
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定要删除这个客户吗?"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<any>
        headerTitle="客户列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 80,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => { setCurrentCustomer(null); setModalVisible(true); }}
          >
            <PlusOutlined /> 新建客户
          </Button>,
        ]}
        request={async (params, sort) => {
          const { current, pageSize, ...rest } = params;
          const res = await getCustomers({
            page: current,
            pageSize,
            ...rest,
          });
          return {
            data: res.data,
            success: true,
            total: res.total,
          };
        }}
        columns={columns}
        rowSelection={{}}
        scroll={{ x: 1200 }}
      />

      <CustomerModal
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setCurrentCustomer(null); }}
        onSuccess={() => { setModalVisible(false); setCurrentCustomer(null); actionRef.current?.reload(); }}
        currentCustomer={currentCustomer}
      />
    </PageContainer>
  );
};

export default CustomerList;
```

**Step 2: 创建客户弹窗组件**

创建 `frontend/src/pages/customer/components/CustomerModal.tsx`:
```typescript
import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { createCustomer, updateCustomer } from '@/services/customer';

const { Option } = Select;
const { TextArea } = Input;

interface CustomerModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentCustomer?: any;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  currentCustomer,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!currentCustomer;

  useEffect(() => {
    if (visible) {
      if (currentCustomer) {
        form.setFieldsValue({
          ...currentCustomer,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, currentCustomer, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit) {
        await updateCustomer(currentCustomer.id, values);
        message.success('更新成功');
      } else {
        await createCustomer(values);
        message.success('创建成功');
      }
      onSuccess();
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败');
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑客户' : '新建客户'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="客户名称"
          name="name"
          rules={[{ required: true, message: '请输入客户名称' }]}
        >
          <Input placeholder="请输入客户名称" />
        </Form.Item>

        <Form.Item
          label="联系人姓名"
          name="contactName"
          rules={[{ required: true, message: '请输入联系人姓名' }]}
        >
          <Input placeholder="请输入联系人姓名" />
        </Form.Item>

        <Form.Item
          label="联系电话"
          name="contactPhone"
          rules={[
            { required: true, message: '请输入联系电话' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
          ]}
        >
          <Input placeholder="请输入联系电话" />
        </Form.Item>

        <Form.Item label="联系邮箱" name="contactEmail">
          <Input placeholder="请输入联系邮箱" />
        </Form.Item>

        <Form.Item label="公司名称" name="companyName">
          <Input placeholder="请输入公司名称" />
        </Form.Item>

        <Form.Item label="客户等级" name="customerLevel" initialValue={0}>
          <Select>
            <Option value={0}>潜在</Option>
            <Option value={1}>意向</Option>
            <Option value={2}>正式</Option>
            <Option value={3}>VIP</Option>
          </Select>
        </Form.Item>

        <Form.Item label="来源渠道" name="sourceChannel">
          <Select placeholder="请选择来源渠道" allowClear>
            <Option value={1}>线上推广</Option>
            <Option value={2}>转介绍</Option>
            <Option value={3}>线下活动</Option>
            <Option value={4}>其他</Option>
          </Select>
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <TextArea rows={4} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CustomerModal;
```

**Step 3: 配置路由**

修改路由配置文件 (通常在 `config/routes.ts` 或 `.umi/core/route.ts`):
```typescript
{
  name: '客户管理',
  path: '/customer',
  icon: 'UserOutlined',
  component: './customer/index',
},
```

**Step 4: 提交代码**

```bash
git add frontend/src/pages/customer
git commit -m "feat: implement customer management page (PC)"
```

---

### Task 7: 前端客户详情页面 - PC端

**Files:**
- Create: `frontend/src/pages/customer/detail/index.tsx`
- Create: `frontend/src/pages/customer-detail/components/FollowRecordTimeline.tsx`
- Create: `frontend/src/pages/customer-detail/components/CustomerInfoCard.tsx`

**Step 1: 创建客户详情页面**

创建 `frontend/src/pages/customer/detail/index.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Tabs, Descriptions, Tag } from 'antd';
import { useParams } from '@umijs/max';
import { getCustomerDetail } from '@/services/customer';
import CustomerInfoCard from './components/CustomerInfoCard';
import FollowRecordTimeline from './components/FollowRecordTimeline';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  const fetchCustomerDetail = async () => {
    setLoading(true);
    try {
      const data = await getCustomerDetail(id);
      setCustomer(data);
    } catch (error) {
      message.error('获取客户详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  if (loading || !customer) {
    return <div>Loading...</div>;
  }

  const levelMap = {
    0: { text: '潜在', color: 'default' },
    1: { text: '意向', color: 'blue' },
    2: { text: '正式', color: 'green' },
    3: { text: 'VIP', color: 'gold' },
  };
  const level = levelMap[customer.customerLevel] || levelMap[0];

  return (
    <PageContainer
      header={{
        title: customer.name,
        subTitle: `跟进人: ${customer.followUser?.name || '-'}`,
      }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧: 客户信息卡片 */}
        <div style={{ width: 300 }}>
          <CustomerInfoCard customer={customer} />
        </div>

        {/* 右侧: 标签页 */}
        <div style={{ flex: 1 }}>
          <ProCard>
            <Tabs
              defaultActiveKey="follow"
              items={[
                {
                  key: 'follow',
                  label: '跟进记录',
                  children: <FollowRecordTimeline customerId={customer.id} />,
                },
                {
                  key: 'contract',
                  label: '合同信息',
                  children: <div>合同信息列表</div>,
                },
                {
                  key: 'invoice',
                  label: '开票记录',
                  children: <div>开票记录列表</div>,
                },
                {
                  key: 'team',
                  label: '服务团队',
                  children: <div>服务团队成员</div>,
                },
              ]}
            />
          </ProCard>
        </div>
      </div>
    </PageContainer>
  );
};

export default CustomerDetail;
```

**Step 2: 创建客户信息卡片组件**

创建 `frontend/src/pages/customer-detail/components/CustomerInfoCard.tsx`:
```typescript
import React from 'react';
import { Card, Descriptions, Tag } from 'antd';

interface CustomerInfoCardProps {
  customer: any;
}

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({ customer }) => {
  const levelMap = {
    0: { text: '潜在', color: 'default' },
    1: { text: '意向', color: 'blue' },
    2: { text: '正式', color: 'green' },
    3: { text: 'VIP', color: 'gold' },
  };
  const level = levelMap[customer.customerLevel] || levelMap[0];

  return (
    <Card title="客户信息">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="客户名称">{customer.name}</Descriptions.Item>
        <Descriptions.Item label="联系人">{customer.contactName}</Descriptions.Item>
        <Descriptions.Item label="联系电话">{customer.contactPhone}</Descriptions.Item>
        {customer.companyName && (
          <Descriptions.Item label="公司名称">{customer.companyName}</Descriptions.Item>
        )}
        <Descriptions.Item label="客户等级">
          <Tag color={level.color}>{level.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="跟进人">{customer.followUser?.name || '-'}</Descriptions.Item>
        {customer.address && (
          <Descriptions.Item label="地址">{customer.address}</Descriptions.Item>
        )}
        {customer.remark && (
          <Descriptions.Item label="备注">{customer.remark}</Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
};

export default CustomerInfoCard;
```

**Step 3: 创建跟进记录时间线组件**

创建 `frontend/src/pages/customer-detail/components/FollowRecordTimeline.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { Timeline, Button, Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getFollowRecords, createFollowRecord } from '@/services/follow-record';

const { TextArea } = Input;
const { Option } = Select;

interface FollowRecordTimelineProps {
  customerId: string;
}

const FollowRecordTimeline: React.FC<FollowRecordTimelineProps> = ({ customerId }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await getFollowRecords(customerId);
      setRecords(data);
    } catch (error) {
      message.error('获取跟进记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [customerId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await createFollowRecord({
        ...values,
        customerId,
      });
      message.success('添加成功');
      setModalVisible(false);
      form.resetFields();
      fetchRecords();
    } catch (error) {
      message.error('添加失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          添加跟进记录
        </Button>
      </div>

      <Timeline loading={loading}>
        {records.map((record) => (
          <Timeline.Item key={record.id}>
            <div>
              <div style={{ fontWeight: 'bold' }}>
                {record.user?.name || '-'} · {record.createdAt}
              </div>
              <div style={{ marginTop: 4 }}>{record.content}</div>
              {record.nextTime && (
                <div style={{ marginTop: 4, color: '#999' }}>
                  下次跟进: {record.nextTime}
                </div>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>

      <Modal
        title="添加跟进记录"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="跟进类型"
            name="type"
            rules={[{ required: true, message: '请选择跟进类型' }]}
          >
            <Select>
              <Option value={1}>电话</Option>
              <Option value={2}>微信</Option>
              <Option value={3}>上门</Option>
              <Option value={4}>邮件</Option>
              <Option value={5}>其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="跟进内容"
            name="content"
            rules={[{ required: true, message: '请输入跟进内容' }]}
          >
            <TextArea rows={4} placeholder="请输入跟进内容" />
          </Form.Item>

          <Form.Item label="下次跟进时间" name="nextTime">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FollowRecordTimeline;
```

**Step 4: 配置详情页路由**

```typescript
{
  path: '/customer/:id',
  component: './customer/detail',
  hideInMenu: true,
},
```

**Step 5: 提交代码**

```bash
git add frontend/src/pages/customer-detail
git commit -m "feat: implement customer detail page (PC)"
```

---

## 阶段三:响应式布局和移动端适配 (1周)

### Task 8: 实现响应式布局框架

**Files:**
- Create: `frontend/src/layouts/BasicLayout/index.tsx`
- Create: `frontend/src/layouts/BasicLayout/components/Sidebar.tsx` (PC端侧边栏)
- Create: `frontend/src/layouts/BasicLayout/components/MobileTabBar.tsx` (移动端底部Tab)
- Create: `frontend/src/layouts/BasicLayout/components/Header.tsx`

**Step 1: 创建响应式布局组件**

创建 `frontend/src/layouts/BasicLayout/index.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { useMediaQuery } from 'antd';
import { Outlet } from '@umijs/max';
import Sidebar from './components/Sidebar';
import MobileTabBar from './components/MobileTabBar';
import Header from './components/Header';
import styles from './index.less';

const BasicLayout: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={styles.layout}>
      {/* PC端侧边栏 */}
      {!isMobile && <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />}

      <div className={styles.main}>
        <Header isMobile={isMobile} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>

      {/* 移动端底部Tab导航 */}
      {isMobile && <MobileTabBar />}
    </div>
  );
};

export default BasicLayout;
```

**Step 2: 创建PC端侧边栏**

创建 `frontend/src/layouts/BasicLayout/components/Sidebar.tsx`:
```typescript
import React from 'react';
import { Menu, Layout } from 'antd';
import { Link, useLocation } from '@umijs/max';
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/customer',
      icon: <UserOutlined />,
      label: <Link to="/customer">客户</Link>,
    },
    {
      key: '/contract',
      icon: <FileTextOutlined />,
      label: <Link to="/contract">合同</Link>,
    },
    {
      key: '/product',
      icon: <AppstoreOutlined />,
      label: <Link to="/product">产品</Link>,
    },
    {
      key: '/system',
      icon: <SettingOutlined />,
      label: <Link to="/system">系统</Link>,
    },
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="lg"
      collapsedWidth={80}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
        {collapsed ? '企' : '企账通'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar;
```

**Step 3: 创建移动端底部Tab导航**

创建 `frontend/src/layouts/BasicLayout/components/MobileTabBar.tsx`:
```typescript
import React from 'react';
import { TabBar } from 'antd-mobile';
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from '@umijs/max';

const MobileTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    {
      key: '/',
      title: '首页',
      icon: <HomeOutlined />,
    },
    {
      key: '/customer',
      title: '客户',
      icon: <UserOutlined />,
    },
    {
      key: '/contract',
      title: '合同',
      icon: <FileTextOutlined />,
    },
    {
      key: '/product',
      title: '产品',
      icon: <AppstoreOutlined />,
    },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '1px solid #eee' }}>
      <TabBar
        activeKey={location.pathname}
        onChange={(key) => navigate(key)}
      >
        {tabs.map((tab) => (
          <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
        ))}
      </TabBar>
    </div>
  );
};

export default MobileTabBar;
```

**Step 4: 创建头部组件**

创建 `frontend/src/layouts/BasicLayout/components/Header.tsx`:
```typescript
import React from 'react';
import { Layout, Dropdown, Avatar, Space } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  isMobile: boolean;
}

const Header: React.FC<HeaderProps> = ({ isMobile }) => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    history.push('/login');
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => history.push('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: isMobile ? 0 : undefined,
        right: isMobile ? 0 : undefined,
        zIndex: 999,
        width: isMobile ? '100%' : undefined,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 'bold' }}>
        {isMobile ? '企账通' : ''}
      </div>

      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <span>管理员</span>
        </Space>
      </Dropdown>
    </AntHeader>
  );
};

export default Header;
```

**Step 5: 创建样式文件**

创建 `frontend/src/layouts/BasicLayout/index.less`:
```less
.layout {
  display: flex;
  min-height: 100vh;

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 200px;
    transition: margin-left 0.2s;

    &.collapsed {
      margin-left: 80px;
    }

    .content {
      flex: 1;
      padding: 24px;
      background: #f0f2f5;
      overflow: auto;
    }
  }
}

@media (max-width: 768px) {
  .layout {
    .main {
      margin-left: 0;

      .content {
        padding: 16px;
        margin-bottom: 50px; // 为底部Tab导航留空间
      }
    }
  }
}
```

**Step 6: 提交代码**

```bash
git add frontend/src/layouts/BasicLayout
git commit -m "feat: implement responsive layout with PC sidebar and mobile tab bar"
```

---

### Task 9: 移动端客户列表页面

**Files:**
- Create: `frontend/src/pages/customer/mobile/index.tsx`

**Step 1: 创建移动端客户列表**

创建 `frontend/src/pages/customer/mobile/index.tsx`:
```typescript
import React, { useRef, useState } from 'react';
import { List, Card, Tag, SearchBar, PullToRefresh, InfiniteScroll } from 'antd-mobile';
import { getCustomers } from '@/services/customer';
import { history } from '@umijs/max';
import styles from './index.less';

const CustomerMobileList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');

  const loadCustomers = async (pageNum: number = 1, reset: boolean = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await getCustomers({
        page: pageNum,
        pageSize: 20,
        keyword,
      });

      const newData = res.data || [];
      setCustomers(reset ? newData : [...customers, ...newData]);
      setHasMore(newData.length >= 20);
      setPage(pageNum);
    } catch (error) {
      console.error('加载客户列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setKeyword(value);
    loadCustomers(1, true);
  };

  const handleRefresh = async () => {
    await loadCustomers(1, true);
  };

  const handleLoadMore = async () => {
    await loadCustomers(page + 1);
  };

  const getLevelTag = (level: number) => {
    const levelMap = {
      0: { text: '潜在', color: 'default' },
      1: { text: '意向', color: 'primary' },
      2: { text: '正式', color: 'success' },
      3: { text: 'VIP', color: 'warning' },
    };
    return levelMap[level] || levelMap[0];
  };

  return (
    <div className={styles.container}>
      <SearchBar placeholder="搜索客户名称、联系人" onSearch={handleSearch} />

      <PullToRefresh onRefresh={handleRefresh}>
        <InfiniteScroll loadMore={handleLoadMore} hasMore={hasMore}>
          {customers.map((customer) => {
            const level = getLevelTag(customer.customerLevel);
            return (
              <Card
                key={customer.id}
                className={styles.card}
                onClick={() => history.push(`/customer/${customer.id}`)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.customerName}>{customer.name}</div>
                  <Tag color={level.color}>{level.text}</Tag>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.row}>
                    <span className={styles.label}>联系人:</span>
                    <span className={styles.value}>{customer.contactName}</span>
                  </div>
                  <div className={styles.row}>
                    <span className={styles.label}>电话:</span>
                    <span className={styles.value}>{customer.contactPhone}</span>
                  </div>
                  {customer.companyName && (
                    <div className={styles.row}>
                      <span className={styles.label}>公司:</span>
                      <span className={styles.value}>{customer.companyName}</span>
                    </div>
                  )}
                  <div className={styles.row}>
                    <span className={styles.label}>跟进人:</span>
                    <span className={styles.value}>{customer.followUser?.name || '-'}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.time}>
                    {customer.createdAt}
                  </span>
                  <span className={styles.arrow}>→</span>
                </div>
              </Card>
            );
          })}
        </InfiniteScroll>
      </PullToRefresh>

      {loading && <div className={styles.loading}>加载中...</div>}
      {!hasMore && customers.length > 0 && (
        <div className={styles.noMore}>没有更多了</div>
      )}
    </div>
  );
};

export default CustomerMobileList;
```

**Step 2: 创建移动端样式**

创建 `frontend/src/pages/customer/mobile/index.less`:
```less
.container {
  padding: 12px;
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 60px; // 为底部Tab导航留空间
}

.card {
  margin-bottom: 12px;
  border-radius: 8px;

  .cardHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .customerName {
      font-size: 16px;
      font-weight: bold;
    }
  }

  .cardBody {
    .row {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;

      .label {
        color: #999;
        width: 70px;
        flex-shrink: 0;
      }

      .value {
        color: #333;
        flex: 1;
      }
    }
  }

  .cardFooter {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;

    .time {
      font-size: 12px;
      color: #999;
    }

    .arrow {
      font-size: 18px;
      color: #1890ff;
    }
  }
}

.loading, .noMore {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 14px;
}
```

**Step 3: 配置移动端路由**

使用响应式组件或者配置不同的路由:
```typescript
// 在路由配置中
{
  path: '/customer',
  component: './customer/index', // PC端
},
// 或使用组件内部判断
```

**Step 4: 提交代码**

```bash
git add frontend/src/pages/customer/mobile
git commit -m "feat: implement mobile customer list page"
```

---

### Task 10: 移动端客户详情页面

**Files:**
- Create: `frontend/src/pages/customer/detail/mobile/index.tsx`

**Step 1: 创建移动端客户详情**

创建 `frontend/src/pages/customer/detail/mobile/index.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { NavBar, Tabs, Card, Descriptions, Tag, Button } from 'antd-mobile';
import { PlusOutlined } from '@ant-design/icons';
import { useParams, history } from '@umijs/max';
import { getCustomerDetail } from '@/services/customer';
import FollowRecordTimeline from './components/FollowRecordTimeline';
import styles from './index.less';

const CustomerMobileDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  const fetchCustomerDetail = async () => {
    setLoading(true);
    try {
      const data = await getCustomerDetail(id);
      setCustomer(data);
    } catch (error) {
      console.error('获取客户详情失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  if (loading || !customer) {
    return (
      <div>
        <NavBar onBack={() => history.back()}>客户详情</NavBar>
        <div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>
      </div>
    );
  }

  const getLevelTag = (level: number) => {
    const levelMap = {
      0: { text: '潜在', color: 'default' },
      1: { text: '意向', color: 'primary' },
      2: { text: '正式', color: 'success' },
      3: { text: 'VIP', color: 'warning' },
    };
    return levelMap[level] || levelMap[0];
  };

  const level = getLevelTag(customer.customerLevel);

  return (
    <div className={styles.container}>
      <NavBar onBack={() => history.back()}>{customer.name}</NavBar>

      <div className={styles.content}>
        {/* 基础信息卡片 */}
        <Card title="基础信息" className={styles.section}>
          <Descriptions column={1}>
            <Descriptions.Item label="客户名称">{customer.name}</Descriptions.Item>
            <Descriptions.Item label="联系人">{customer.contactName}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{customer.contactPhone}</Descriptions.Item>
            {customer.companyName && (
              <Descriptions.Item label="公司名称">{customer.companyName}</Descriptions.Item>
            )}
            <Descriptions.Item label="客户等级">
              <Tag color={level.color}>{level.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="跟进人">{customer.followUser?.name || '-'}</Descriptions.Item>
            {customer.address && (
              <Descriptions.Item label="地址">{customer.address}</Descriptions.Item>
            )}
            {customer.remark && (
              <Descriptions.Item label="备注">{customer.remark}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 标签页 */}
        <Tabs defaultActiveKey="follow" className={styles.tabs}>
          <Tabs.Tab title="跟进记录" key="follow">
            <FollowRecordTimeline customerId={customer.id} />
          </Tabs.Tab>
          <Tabs.Tab title="合同信息" key="contract">
            <Card>合同信息列表(待实现)</Card>
          </Tabs.Tab>
          <Tabs.Tab title="开票记录" key="invoice">
            <Card>开票记录列表(待实现)</Card>
          </Tabs.Tab>
          <Tabs.Tab title="服务团队" key="team">
            <Card>服务团队成员(待实现)</Card>
          </Tabs.Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerMobileDetail;
```

**Step 2: 创建移动端样式**

创建 `frontend/src/pages/customer/detail/mobile/index.less`:
```less
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 60px; // 为底部Tab导航留空间
}

.content {
  padding: 12px;
}

.section {
  margin-bottom: 12px;
  border-radius: 8px;
}

.tabs {
  margin-top: 12px;

  :global {
    .adm-tabs-tab-line {
      background: #1890ff;
    }
  }
}
```

**Step 3: 提交代码**

```bash
git add frontend/src/pages/customer/detail/mobile
git commit -m "feat: implement mobile customer detail page"
```

---

## 阶段四:其他核心模块 (根据PRD继续实现)

由于篇幅限制,以下模块的实现计划省略详细步骤,按照前面的模式继续:

### Task 11-20: 合同收款模块
- 产品管理后端和前端
- 合同管理后端和前端
- 收款记录后端和前端
- PC端和移动端页面

### Task 21-30: 开票管理模块
- 开票记录后端和前端
- 额度统计功能
- 超额提醒功能

### Task 31-40: 自动化规则引擎
- 事件系统
- 规则匹配引擎
- 条件评估器
- 动作执行器
- 规则配置界面

### Task 41-50: 系统配置模块
- 角色权限配置
- 常用语管理
- 收款账号配置

### Task 51-60: 数据统计模块
- 首页仪表板
- 业绩统计
- 客户分析
- 图表集成

---

## 阶段五:测试和优化 (1-2周)

### Task 61: 编写单元测试

**Files:**
- Create: `backend/test/customer.service.spec.ts`
- Create: `backend/test/follow-record.service.spec.ts`

**Step 1: 安装测试依赖**

```bash
cd backend
pnpm add -D @nestjs/testing
```

**Step 2: 编写测试用例**

创建 `backend/test/customer.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from '../src/modules/customer/customer.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaService,
          useValue: {
            customer: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer', async () => {
      const createCustomerDto = {
        name: 'Test Customer',
        contactName: 'John Doe',
        contactPhone: '13800138000',
      };

      const expectedResult = {
        id: '1',
        ...createCustomerDto,
      };

      jest.spyOn(prisma.customer, 'create').mockResolvedValue(expectedResult);

      const result = await service.create(createCustomerDto, 'user1');

      expect(result).toEqual(expectedResult);
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: {
          ...createCustomerDto,
          followUserId: 'user1',
        },
        include: {
          followUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });
  });
});
```

**Step 3: 运行测试**

```bash
cd backend
pnpm test
```

**Step 4: 提交测试代码**

```bash
git add backend/test
git commit -m "test: add unit tests for customer service"
```

---

### Task 62: 性能优化

**Files:**
- Modify: `backend/src/modules/customer/customer.service.ts`
- Modify: `frontend/src/pages/customer/index.tsx`

**Step 1: 后端查询优化**

添加必要的数据库索引:
```prisma
// 在 schema.prisma 中确保有这些索引
model Customer {
  // ...
  @@index([followUserId, createdAt])
  @@index([customerLevel, status])
}
```

**Step 2: 前端代码分割**

使用 React.lazy 进行懒加载:
```typescript
const CustomerList = React.lazy(() => import('./pages/customer/index'));
```

**Step 3: 提交优化代码**

```bash
git add backend frontend
git commit -m "perf: optimize database queries and frontend loading"
```

---

### Task 63: 编写API文档

**Files:**
- Create: `docs/api/CUSTOMER.md`
- Create: `docs/api/FOLLOW_RECORD.md`

**Step 1: 生成Swagger文档**

确保后端已配置Swagger,访问 `http://localhost:3000/api-docs`

**Step 2: 导出API文档**

```bash
cd backend
pnpm run swagger:generate
```

**Step 3: 提交文档**

```bash
git add docs/api
git commit -m "docs: add API documentation"
```

---

### Task 64: 部署准备

**Files:**
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.env.production`

**Step 1: 创建 Docker 配置**

创建 `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: qzt
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "mysql://root:rootpassword@mysql:3306/qzt"
      JWT_SECRET: "your-secret-key"
    depends_on:
      - mysql

  frontend:
    build: ./frontend
    ports:
      - "8000:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

**Step 2: 创建后端 Dockerfile**

创建 `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

**Step 3: 创建前端 Dockerfile**

创建 `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Step 4: 提交部署配置**

```bash
git add docker-compose.yml Dockerfile .env.production
git commit -m "ci: add Docker deployment configuration"
```

---

## 总结

此实施计划包含了从多租户架构改造为单体应用的核心步骤:

1. **移除租户架构** - 从数据库Schema到代码层全面移除tenantId
2. **核心业务模块** - 客户管理、跟进记录的完整实现
3. **响应式设计** - PC端侧边栏布局 + 移动端底部Tab导航
4. **测试和优化** - 单元测试、性能优化、部署准备

**预计工期**: 核心功能(阶段1-3)约2-3周,全部功能(阶段1-5)约4-6周

**下一步**: 根据此计划,选择执行方式:
- Subagent-Driven: 在当前会话中使用superpowers:subagent-driven-development
- Parallel Session: 在新会话中使用superpowers:executing-plans
