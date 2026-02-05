# 用户管理模块开发总结 - 2025-02-04

## 📅 会话信息
- **日期**: 2025-02-04
- **功能**: 用户管理模块完善与优化
- **主要目标**: 国际化、系统用户保护、API 集成、类型系统统一

---

## ✅ 完成的功能

### 1. 国际化 (i18n) 集成

#### 页面文本国际化
- ✅ 主页面标题和描述文字
  - `user.title` - "用户管理" / "User Management"
  - `user.description` - "管理系统用户和角色权限"

- ✅ 按钮文字
  - `user.addNew` - "新建用户" / "Add New User"
  - `user.inviteUser` - "邀请用户" / "Invite User"

- ✅ 表单字段
  - `user.name` - "姓名" / "Full Name"（合并了 firstName + lastName）
  - `user.username`、`user.email`、`user.phoneNumber`、`user.password`
  - `user.placeholder.*` - 各字段占位符文本

- ✅ 验证消息
  - `user.validation.*` - 所有字段验证错误消息

- ✅ 分页组件
  - `common.rowsPerPage` - "每页行数" / "Rows per page"
  - `common.pageOf` - "第 X 页，共 Y 页" / "Page X of Y"
  - `common.goToFirstPage`、`common.goToPreviousPage` 等

#### 翻译文件位置
- 中文：`frontend/src/i18n/locales/zh/translation.json`
- 英文：`frontend/src/i18n/locales/en/translation.json`

### 2. 用户表单字段优化

#### 字段合并：firstName + lastName → name
**原因**: 符合中文使用习惯（姓名一体）

**修改内容**:
- 删除 `firstName` 和 `lastName` 字段
- 添加单一 `name` 字段
- 更新翻译：`user.name` - "姓名" / "Full Name"

**影响的文件**:
- `backend/scripts/seed.ts` - Admin 用户使用 name 字段
- `backend/prisma/schema.prisma` - User 模型保持 name 字段
- `frontend/src/features/users/components/users-action-dialog.tsx` - 表单只有一个 name 字段
- 翻译文件

### 3. Admin 用户保护机制

#### 后端实现

**数据库模型** (`backend/prisma/schema.prisma`):
```prisma
model User {
  // ...
  isSystem Boolean @default(false)  // 是否为系统用户(不可删除)
}

model Department {
  // ...
  isSystem Boolean @default(false)  // 是否为系统部门(不可删除)
}
```

**种子数据** (`backend/scripts/seed.ts`):
```typescript
// 创建默认部门
const defaultDepartment = await prisma.department.upsert({
  where: { id: 'default-dept' },
  create: {
    id: 'default-dept',
    name: '企账通有限公司',
    isSystem: true,  // 系统部门，不可删除
  },
})

// 创建 Admin 用户
const admin = await prisma.user.create({
  data: {
    username: 'admin',
    password: hashedPassword,
    name: '超级管理员',
    email: 'admin@qzt.com',
    isSystem: true,  // 系统用户，不可删除
    departmentId: defaultDepartment.id,
    roles: {
      create: {
        roleId: adminRole.id,  // SUPERADMIN 角色
      },
    },
  },
})
```

**服务层保护** (`backend/src/modules/users/users.service.ts`):
```typescript
// 删除时检查
async remove(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id }})

  if (user.isSystem) {
    throw new ConflictException('系统用户不能删除')
  }

  // ... 其他检查
}

// 更新时检查
async update(id: string, updateUserDto: UpdateUserDto) {
  const existingUser = await this.prisma.user.findUnique({ where: { id }})

  // 系统用户的角色不能修改
  if (existingUser.isSystem && roleIds !== undefined) {
    throw new ConflictException('系统用户的角色不能修改')
  }

  // ...
}
```

**部门服务保护** (`backend/src/modules/department/department.service.ts`):
```typescript
async remove(id: string) {
  const department = await this.prisma.department.findUnique({ where: { id }})

  if (department.isSystem) {
    throw new ConflictException('系统部门不能删除')
  }

  // ...
}
```

#### 前端实现

**行操作组件** (`frontend/src/features/users/components/data-table-row-actions.tsx`):
```typescript
// 系统用户隐藏删除按钮
{!user.isSystem && (
  <DropdownMenuItem onClick={() => setOpen('delete')}>
    {t('common.delete')}
  </DropdownMenuItem>
)}
```

**编辑表单** (`frontend/src/features/users/components/users-action-dialog.tsx`):
```typescript
// 系统用户禁用角色选择
<SelectDropdown
  disabled={isEdit && currentRow?.isSystem}
  ...
/>
```

### 4. API 响应拦截器优化

**问题**: 原拦截器无条件提取 `data` 字段，导致分页信息丢失

**修复** (`frontend/src/services/api-client.ts`):
```typescript
axiosInstance.interceptors.response.use(
  (response) => {
    const responseData = response.data as any

    // 智能识别响应类型
    const isPaginatedResponse =
      'data' in responseData &&
      ('total' in responseData || 'page' in responseData)

    const isStandardResponse =
      'success' in responseData &&
      'data' in responseData

    // 只对标准响应提取 data，保留分页响应完整结构
    if (isStandardResponse && !isPaginatedResponse) {
      response.data = responseData.data
    }

    return response
  },
  ...
)
```

**后端返回格式**:
```json
{
  "data": [...],
  "total": 10,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

**前端接收**: 完整的分页对象（未被提取）

### 5. 类型系统统一（方案1实施）

#### 问题
- 前端手动维护 `features/users/types/user.ts`
- 后端 API 改变后，前端类型容易不同步
- 存在重复定义

#### 解决方案：使用 Orval 自动生成的类型

**步骤 1: 后端定义实体类型并导出到 Swagger**

创建 `backend/src/modules/users/dto/user-entity.dto.ts`:
```typescript
export class UserEntity {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '角色列表', type: () => [UserRoleWithRelation] })
  roles?: UserRoleWithRelation[];

  // ... 完整定义
}

export class PaginatedUsersDto {
  @ApiProperty({ description: '用户列表', type: () => [UserEntity] })
  data: UserEntity[];

  @ApiProperty({ description: '总记录数' })
  total: number;

  // ... 分页信息
}
```

**步骤 2: 控制器添加返回类型**

`backend/src/modules/users/users.controller.ts`:
```typescript
@Get()
@ApiResponse({ status: 200, type: PaginatedUsersDto })
findAll(@Query() query: QueryUserDto) {
  return this.usersService.findAll(query);
}
```

**步骤 3: 重新生成前端 API**
```bash
cd frontend && pnpm run generate:api
```

自动生成 `frontend/src/models/userEntity.ts`:
```typescript
export interface UserEntity {
  id: string;
  username: string;
  roles?: UserRoleWithRelation[];
  // ... 自动生成，永不过时
}
```

**步骤 4: 前端统一使用生成的类型**
- ✅ 删除手动维护的 `features/users/types/user.ts`
- ✅ 所有组件改为 `import { UserEntity } from '@/models'`
- ✅ 类型与 API 完全同步

#### 收益
1. **Single Source of Truth** - 类型定义来自 Swagger
2. **自动同步** - 后端修改后重新生成即可
3. **消除重复** - 不再手动维护前端类型
4. **类型安全** - TypeScript 编译时检查

### 6. 删除无用文件

**已删除**:
- ✅ `frontend/src/features/users/types/user.ts` - 被自动生成的 `userEntity.ts` 替代
- ✅ `frontend/src/features/users/types/` 目录

**待删除**（需确认）:
- `frontend/src/features/users/data/schema.ts` - 旧的模拟数据类型
- `frontend/src/features/users/data/users.ts` - 可能是模拟数据

**保留**:
- `frontend/src/features/users/data/data.ts` - 包含 roles 数据（仍在使用）

---

## 🔧 技术实现细节

### 国际化架构
- **后端**: nestjs-i18n，通过 Accept-Language 请求头自动识别
- **前端**: react-i18next，支持中英文切换
- **翻译键命名**: `module.feature.field`（如 `user.name`）

### 字段映射
| 前端表单 | 后端 DTO | 说明 |
|---------|---------|------|
| phoneNumber | phone | API 调用时映射 |
| role | roleIds | 单选 → 数组转换 |
| name | name | 已合并 |

### API 调用流程
1. 前端表单提交 → `useCreateUser` / `useUpdateUser`
2. 字段映射 → `phoneNumber` → `phone`，`role` → `roleIds`
3. Orval 生成的 API → 自动类型检查
4. 响应拦截器 → 保留分页信息
5. 前端展示 → TanStack Table 渲染

---

## 📋 数据模型

### Admin 用户初始数据
```json
{
  "username": "admin",
  "password": "admin123",
  "name": "超级管理员",
  "email": "admin@qzt.com",
  "status": 1,
  "isSystem": true,
  "department": {
    "id": "default-dept",
    "name": "企账通有限公司",
    "isSystem": true
  },
  "roles": [{
    "role": {
      "name": "超级管理员",
      "code": "SUPERADMIN"
    }
  }]
}
```

### 角色层级
- **SUPERADMIN** - 超级管理员（Admin 用户固定）
- **ADMIN** - 管理员
- **USER** - 普通用户

---

## 🎯 最佳实践总结

### 1. 类型系统管理
✅ **推荐**: 后端定义 Swagger 类型 → Orval 自动生成前端类型
❌ **避免**: 前端手动维护类型定义

### 2. 响应拦截器设计
✅ **智能提取**: 区分分页响应和标准响应
❌ **避免**: 无条件提取 data 字段

### 3. 国际化实施
✅ **分层管理**: 通用翻译在 `common.*`，模块翻译在 `module.*`
✅ **占位符翻译**: `module.placeholder.*`
✅ **验证消息**: `module.validation.*`

### 4. 系统数据保护
✅ **多层防护**: 数据库层 + 服务层 + UI 层
✅ **isSystem 标记**: 简单且扩展性好
❌ **避免**: 硬编码 ID 或用户名判断

### 6. 删除无用文件

**已删除**:
- ✅ `frontend/src/features/users/types/user.ts` - 被自动生成的 `userEntity.ts` 替代
- ✅ `frontend/src/features/users/types/` 目录
- ✅ `frontend/src/features/users/data/schema.ts` - 旧的模拟数据类型
- ✅ `frontend/src/features/users/data/users.ts` - Faker 生成的模拟数据

**保留**:
- ✅ `frontend/src/features/users/data/data.ts` - 包含 roles 数据（仍在使用）

---

## 🚀 开发流程改进

### 新增用户字段流程
```bash
# 1. 后端添加字段
vim backend/src/modules/users/dto/user-entity.dto.ts

# 2. 控制器更新 Swagger
vim backend/src/modules/users/users.controller.ts

# 3. 重新生成前端类型
cd frontend && pnpm run generate:api

# 4. 前端自动获得新类型，添加到表单/列定义
```

### 国际化新增文本流程
```bash
# 1. 后端添加翻译键
vim backend/src/i18n/zh/user.json

# 2. 前端添加对应的翻译
vim frontend/src/i18n/locales/zh/translation.json
vim frontend/src/i18n/locales/en/translation.json

# 3. 组件中使用
{t('user.newField')}
```

---

## 📚 相关文档
- [API 开发规范](../../references/api-patterns.md)
- [CRUD 实现模式](../../references/crud-patterns.md)
- [故障排除指南](../../references/troubleshooting.md)

---

## ⚠️ 注意事项

1. **Admin 用户保护**
   - 用户名: `admin`
   - 密码: `admin123`
   - 不可删除，角色固定
   - 部门可修改

2. **默认部门**
   - 名称: "企账通有限公司"
   - ID: `default-dept`
   - 不可删除

3. **类型生成**
   - 每次修改 API 后运行 `pnpm run generate:api`
   - 不要手动编辑 `models/` 下的文件

4. **响应拦截器**
   - 分页响应保留完整结构
   - 标准响应提取 data 字段

---

## 🔗 相关提交
- 国际化集成
- Admin 用户保护
- API 类型统一
- 响应拦截器优化
