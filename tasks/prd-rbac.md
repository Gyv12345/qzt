[PRD]
# PRD: RBAC 系统与自动化配置

## Overview

构建企账通（QZT）项目的核心管理系统，包括完整的 RBAC（基于角色的访问控制）系统和自动化规则配置功能。RBAC 系统支持按钮级权限控制，涵盖用户管理、部门管理、菜单权限管理、日志管理和阿里云 OSS 文件管理。自动化配置功能提供可视化的规则编辑器，支持实时和定时触发，实现条件驱动的自动化业务操作。**本 PRD 包含完整的前后端开发任务，包括新增 API 接口、自动化引擎实现和阿里云 OSS 集成。**

## Goals

- 提供完整的用户和权限管理能力，支持按钮级权限控制
- 实现全面的操作和系统日志记录
- 提供统一的业务页面 UI 组件（列表、弹窗、抽屉等）
- 支持通过可视化界面配置自动化规则
- 支持实时和定时两种触发模式
- 提供灵活的条件配置和执行动作配置
- **开发完整的后端 API 接口（权限管理、OSS、自动化）**
- **实现自动化规则引擎（EventEmitter2 事件驱动、条件检查、动作执行、任务调度、失败重试）**
- **集成阿里云 OSS 服务**
- **集成 Webhook 消息推送（企业微信、飞书、钉钉）**

## Quality Gates

### 前端
- `cd frontend && pnpm typecheck` - Type checking
- `cd frontend && pnpm lint` - Linting

### 后端
- `cd backend && pnpm typecheck` - Type checking
- `cd backend && pnpm lint` - Linting
- `cd backend && pnpm test` - 单元测试

### UI 验证
- 对于 UI 相关的用户故事，使用 dev-browser 技能进行视觉验证

## User Stories

---

## 后端开发任务

### 阶段零：后端基础 API

### US-001: RBAC 核心 API - 用户和角色管理 [Backend]
**Description:** 作为后端开发者，我需要实现用户和角色管理的 CRUD API，以便前端能够管理用户和角色。

**Acceptance Criteria:**
- [ ] 创建 `UserModule` 和 `RoleModule`
- [ ] 实现 `UserController` 的 CRUD 接口：
  - `POST /users` - 创建用户
  - `GET /users` - 分页查询用户列表（支持搜索、筛选）
  - `GET /users/:id` - 获取用户详情
  - `PATCH /users/:id` - 更新用户
  - `DELETE /users/:id` - 删除用户
  - `POST /users/:id/reset-password` - 重置密码
- [ ] 实现 `RoleController` 的 CRUD 接口：
  - `POST /roles` - 创建角色
  - `GET /roles` - 查询角色列表
  - `GET /roles/:id` - 获取角色详情
  - `PATCH /roles/:id` - 更新角色
  - `DELETE /roles/:id` - 删除角色
- [ ] 实现 `User` 和 `Role` 实体（包含字段：id, username, email, phone, departmentId, status, createdAt, updatedAt）
- [ ] 实现 `UserService` 和 `RoleService`
- [ ] 添加 DTO 类和验证（使用 `class-validator`）
- [ ] 添加 Swagger API 文档注解

### US-002: [Backend]  部门管理 API
**Description:** 作为后端开发者，我需要实现部门树形结构管理的 API，以便前端管理部门层级。

**Acceptance Criteria:**
- [ ] 创建 `DepartmentModule` 和 `DepartmentController`
- [ ] 实现 `DepartmentController` 接口：
  - `POST /departments` - 创建部门
  - `GET /departments` - 获取部门树形结构
  - `GET /departments/:id` - 获取部门详情（包含子部门和用户）
  - `PATCH /departments/:id` - 更新部门
  - `DELETE /departments/:id` - 删除部门（检查是否有子部门或用户）
  - `GET /departments/:id/users` - 获取部门下的用户列表
- [ ] 实现 `Department` 实体（包含字段：id, name, parentId, sort, createdAt, updatedAt）
- [ ] 实现树形结构查询（递归或使用树形查询库）
- [ ] 添加 DTO 类和验证
- [ ] 添加 Swagger 文档

### US-003: [Backend]  权限管理 API
**Description:** 作为后端开发者，我需要实现权限配置和权限检查的 API，以便实现按钮级权限控制。

**Acceptance Criteria:**
- [ ] 创建 `PermissionModule` 和 `PermissionController`
- [ ] 实现 `PermissionController` 接口：
  - `GET /permissions/menus` - 获取菜单树（带权限标识）
  - `GET /permissions/buttons` - 获取按钮权限列表
  - `POST /permissions/roles/:roleId` - 为角色分配权限
  - `GET /permissions/roles/:roleId` - 获取角色的权限
  - `GET /permissions/current` - 获取当前登录用户的权限
- [ ] 实现 `Permission` 实体（字段：id, code, name, type, resource, action, parentId）
- [ ] 实现 `RolePermission` 关联表
- [ ] 创建 `PermissionService` 实现权限检查逻辑
- [ ] 创建 `PermissionGuard` 守卫用于路由权限验证
- [ ] 添加 `@RequirePermissions` 装饰器用于方法级权限验证
- [ ] 添加 Swagger 文档

### US-004: [Backend]  日志管理 API
**Description:** 作为后端开发者，我需要实现操作日志和系统日志的记录与查询 API，以便前端查看审计信息。

**Acceptance Criteria:**
- [ ] 创建 `LogModule` 和 `LogController`
- [ ] 实现 `LogController` 接口：
  - `GET /logs/operations` - 分页查询操作日志（支持筛选用户、时间范围、操作类型）
  - `GET /logs/system` - 分页查询系统日志（支持筛选级别、模块、时间范围）
  - `GET /logs/:id` - 获取日志详情
  - `POST /logs/export` - 导出日志为 CSV
- [ ] 实现 `OperationLog` 实体（字段：id, userId, username, action, resource, ip, userAgent, detail, createdAt）
- [ ] 实现 `SystemLog` 实体（字段：id, level, module, message, stacktrace, createdAt）
- [ ] 创建 `LogService` 和 `LogInterceptor`（自动记录操作日志）
- [ ] 创建日志装饰器 `@LogOperation`
- [ ] 添加 Swagger 文档

### US-005: [Backend]  Webhook 消息管理 API
**Description:** 作为后端开发者，我需要实现 Webhook 消息发送和管理的 API，以便支持企业微信、飞书、钉钉的消息推送。

**Acceptance Criteria:**
- [ ] 创建 `WebhookModule` 和 `WebhookController`
- [ ] 实现 `WebhookController` 接口：
  - `POST /webhook/send` - 发送 Webhook 消息
  - `GET /webhook/configs` - 获取 Webhook 配置列表
  - `POST /webhook/configs` - 创建 Webhook 配置
  - `PATCH /webhook/configs/:id` - 更新 Webhook 配置
  - `DELETE /webhook/configs/:id` - 删除 Webhook 配置
  - `POST /webhook/test` - 测试 Webhook 发送
- [ ] 实现 `WebhookConfig` 实体（字段：id, name, platform, webhookUrl, enabled, createdAt, updatedAt）
  - `platform` 枚举：`wecom`（企业微信）、`feishu`（飞书）、`dingtalk`（钉钉）
- [ ] 实现 `WebhookMessage` 实体记录发送历史（字段：id, configId, platform, content, status, response, error, sentAt）
- [ ] 创建 `WebhookService` 实现消息发送：
  - 企业微信：按官方文档格式发送
  - 飞书：按官方文档格式发送
  - 钉钉：按官方文档格式发送
- [ ] 支持消息类型：文本、markdown、卡片
- [ ] 添加 Swagger 文档

### US-006: [Backend]  阿里云 OSS 集成 API
**Description:** 作为后端开发者，我需要实现阿里云 OSS 文件上传、下载、删除的 API，以便前端管理文件。

**Acceptance Criteria:**
- [ ] 创建 `OssModule` 和 `OssController`
- [ ] 实现 `OssController` 接口：
  - `POST /oss/upload` - 上传文件（返回 URL）
  - `POST /oss/upload-url` - 获取上传授权 URL（前端直传）
  - `GET /oss/files` - 分页查询文件列表
  - `GET /oss/files/:id` - 获取文件详情
  - `DELETE /oss/files/:id` - 删除文件
  - `GET /oss/usage` - 获取存储空间使用统计
- [ ] 安装 `ali-oss` 或 `@alicloud/oss-sdk` 依赖
- [ ] 创建 OSS 配置模块（支持环境变量配置：bucket, region, accessKeyId, accessKeySecret）
- [ ] 实现 `OssService` 封装 OSS 操作：
  - `uploadFile()` - 上传文件
  - `deleteFile()` - 删除文件
  - `getSignedUrl()` - 获取授权 URL
  - `listFiles()` - 列出文件
  - `getFileSize()` - 获取文件大小
- [ ] 实现 `OssFile` 实体记录上传历史（字段：id, fileName, fileUrl, fileSize, fileType, uploaderId, createdAt）
- [ ] 添加文件类型验证和大小限制
- [ ] 添加 Swagger 文档

### US-007: [Backend]  自动化元数据 API
**Description:** 作为后端开发者，我需要提供自动化规则配置所需的实体类型和字段元数据 API，以便前端动态渲染条件配置界面。

**Acceptance Criteria:**
- [ ] 创建 `AutomationModule` 和 `AutomationMetadataController`
- [ ] 实现 `AutomationMetadataController` 接口：
  - `GET /automation/entities` - 获取可用的实体类型列表
  - `GET /automation/entities/:type/fields` - 获取指定实体的字段列表
  - `GET /automation/operators` - 获取支持的操作符列表
  - `GET /automation/actions` - 获取支持的执行动作类型列表
- [ ] 创建元数据结构定义：
  - `EntityMetadata`: code, name, description, tableName
  - `FieldMetadata`: code, name, type, description, enumValues?
  - `OperatorMetadata`: code, name, supportedTypes
  - `ActionMetadata`: code, name, description, configSchema
- [ ] 创建 `AutomationMetadataService` 返回元数据（支持客户、联系人、合同、发票、产品等实体）
- [ ] 添加 Swagger 文档

### US-008: [Backend]  自动化规则 CRUD API
**Description:** 作为后端开发者，我需要实现自动化规则的增删改查 API，以便前端管理自动化规则。

**Acceptance Criteria:**
- [ ] 在 `AutomationModule` 中创建 `AutomationRuleController`
- [ ] 实现 `AutomationRuleController` 接口：
  - `POST /automation/rules` - 创建自动化规则
  - `GET /automation/rules` - 分页查询规则列表
  - `GET /automation/rules/:id` - 获取规则详情
  - `PATCH /automation/rules/:id` - 更新规则
  - `DELETE /automation/rules/:id` - 删除规则
  - `PATCH /automation/rules/:id/toggle` - 切换启用/禁用状态
  - `POST /automation/rules/:id/test` - 测试执行规则
- [ ] 实现 `AutomationRule` 实体（字段：id, name, description, conditions, actions, triggerType, scheduleConfig, enabled, lastExecutedAt, createdAt, updatedAt）
- [ ] 实现 `Condition` 和 `Action` 的 JSON 结构存储
- [ ] 创建 `AutomationRuleService` 处理规则 CRUD
- [ ] 添加 DTO 类和验证
- [ ] 添加 Swagger 文档

### US-009: [Backend]  自动化引擎 - 条件解析器
**Description:** 作为后端开发者，我需要实现条件解析器，能够解析规则条件并评估数据是否满足条件。

**Acceptance Criteria:**
- [ ] 创建 `ConditionEvaluator` 服务
- [ ] 支持的操作符：等于、不等于、大于、小于、包含、为空、不为空
- [ ] 支持字段类型：字符串、数字、日期、布尔、枚举
- [ ] 支持条件组合逻辑：且（AND）、或（OR）
- [ ] 实现 `evaluate(conditions, data)` 方法返回布尔值
- [ ] 添加单元测试覆盖所有操作符和逻辑组合

### US-010: [Backend]  自动化引擎 - 动作执行器
**Description:** 作为后端开发者，我需要实现动作执行器，能够执行新增、修改、删除记录和发送 Webhook 消息等动作。

**Acceptance Criteria:**
- [ ] 创建 `ActionExecutor` 服务
- [ ] 实现各种动作类型：
  - `CreateRecordAction` - 新增记录（调用对应 Service）
  - `UpdateRecordAction` - 修改记录（根据条件查找并更新）
  - `DeleteRecordAction` - 删除记录（根据条件查找并删除）
  - `SendWebhookAction` - 发送 Webhook 消息（调用 WebhookService）
  - `ScheduleTaskAction` - 创建定时任务
- [ ] 实现 `execute(action, context)` 方法
- [ ] 支持动作中的动态变量（如使用触发数据的字段值）
- [ ] 添加执行日志记录
- [ ] 添加单元测试

### US-011: [Backend]  自动化引擎 - EventEmitter2 触发机制
**Description:** 作为后端开发者，我需要实现基于 EventEmitter2 的触发机制，支持实时触发和定时触发。

**Acceptance Criteria:**
- [ ] 安装 `@nestjs/event-emitter` 或 `eventemitter2` 依赖
- [ ] 创建 `AutomationTrigger` 服务
- [ ] 实现实时触发：
  - 定义实体事件类型：`entity.created`, `entity.updated`, `entity.deleted`
  - 在关键 Service 方法中发布事件（如 CustomerService 创建客户后发布 `customer.created` 事件）
  - 使用 `@OnEvent()` 装饰器监听事件
  - 事件触发时查找匹配的启用规则并执行
- [ ] 实现定时触发：
  - 集成 `@nestjs/schedule` 或 `node-cron`
  - 创建 `ScheduleRegistry` 管理定时任务
  - 支持简单间隔（每小时、每天、每周）和 cron 表达式
  - 规则启用时注册定时任务，禁用时移除
- [ ] 创建 `AutomationEngine` 协调触发、评估和执行
- [ ] 添加执行历史记录（`AutomationExecution` 实体）
- [ ] 添加失败重试机制：失败后自动重新执行，最多重试 3 次
- [ ] 添加单元测试

### US-012: [Backend]  自动化执行历史 API
**Description:** 作为后端开发者，我需要实现自动化执行历史的查询 API，以便前端查看规则执行情况。

**Acceptance Criteria:**
- [ ] 创建 `AutomationExecutionController`
- [ ] 实现 `AutomationExecutionController` 接口：
  - `GET /automation/executions` - 分页查询执行历史
  - `GET /automation/executions/:id` - 获取执行详情
  - `GET /automation/rules/:id/executions` - 获取指定规则的执行历史
- [ ] 实现 `AutomationExecution` 实体（字段：id, ruleId, ruleName, triggerType, status, result, error, retryCount, startedAt, completedAt, duration）
  - `status` 枚举：`success`, `failed`, `retrying`
  - `retryCount` 记录重试次数
- [ ] 创建 `AutomationExecutionService` 查询执行历史
- [ ] 添加 Swagger 文档

### US-013: [Backend]  后端 API 生成和文档
**Description:** 作为开发者，我需要生成 OpenAPI 规范并更新前端 API 客户端，以便前后端类型同步。

**Acceptance Criteria:**
- [ ] 确保所有 Controller 添加 Swagger 注解（`@ApiTags`, `@ApiOperation`, `@ApiResponse`）
- [ ] 配置 NestJS Swagger 生成 OpenAPI JSON
- [ ] 访问 `http://localhost:7890/api` 确认 API 文档正常生成
- [ ] 将 OpenAPI JSON 保存到 `frontend/openapi/scrm.json`
- [ ] 运行 `cd frontend && pnpm run generate:api` 生成 API 客户端
- [ ] 检查生成的类型定义和 API 函数

---

## 前端开发任务

### 阶段一：RBAC 系统

### US-014: [Frontend]  创建系统管理子菜单路由
**Description:** 作为管理员，我希望在系统管理页面下有独立的子菜单页面，以便分别管理不同的系统功能。

**Acceptance Criteria:**
- [ ] 在 `frontend/src/components/layout/data/sidebar-data.ts` 中展开"系统设置"菜单组
- [ ] 添加以下子菜单项：用户管理(`/system/users`)、部门管理(`/system/departments`)、菜单权限(`/system/permissions`)、Webhook 配置(`/system/webhooks`)、日志管理(`/system/logs`)、OSS 管理(`/system/oss`)
- [ ] 创建对应的路由文件 `frontend/src/routes/_authenticated/system/*.tsx`
- [ ] 使用统一的系统子页面布局组件

### US-015: [Frontend]  用户列表页面
**Description:** 作为管理员，我希望查看和管理系统用户，以便控制谁能访问系统。

**Acceptance Criteria:**
- [ ] 创建用户管理页面组件 `frontend/src/features/system/users/UserListPage.tsx`
- [ ] 使用 `DataTable` 组件展示用户列表
- [ ] 支持搜索（按用户名、邮箱、手机号）
- [ ] 支持分页和排序
- [ ] 添加"新增用户"按钮
- [ ] 每行包含操作按钮：编辑、删除、重置密码
- [ ] 显示用户状态（启用/禁用）

### US-016: [Frontend]  用户抽屉组件
**Description:** 作为管理员，我希望通过抽屉组件新增或编辑用户信息，以便快速操作。

**Acceptance Criteria:**
- [ ] 创建用户抽屉组件 `frontend/src/features/system/users/UserDrawer.tsx`
- [ ] 支持新增和编辑两种模式
- [ ] 表单字段：用户名、邮箱、手机号、所属部门、角色、状态
- [ ] 使用 `react-hook-form` + `zod` 进行表单验证
- [ ] 使用生成的 API 客户端调用后端接口

### US-017: [Frontend]  部门管理页面
**Description:** 作为管理员，我希望管理部门结构，以便组织用户和权限分配。

**Acceptance Criteria:**
- [ ] 创建部门管理页面组件 `frontend/src/features/system/departments/DepartmentPage.tsx`
- [ ] 左侧使用树形组件展示部门层级
- [ ] 右侧展示当前选中部门的信息和用户列表
- [ ] 支持"新增部门"、"编辑部门"、"删除部门"操作
- [ ] 删除部门前检查是否有子部门或用户

### US-018: [Frontend]  菜单权限管理页面
**Description:** 作为管理员，我希望配置不同角色能看到的菜单和操作按钮，以便实现权限隔离。

**Acceptance Criteria:**
- [ ] 创建权限管理页面组件 `frontend/src/features/system/permissions/PermissionPage.tsx`
- [ ] 左侧展示角色列表（支持新增/编辑/删除角色）
- [ ] 右侧展示角色的权限配置
- [ ] 权限配置分为三个层级：菜单级、页面级、按钮级
- [ ] 使用树形组件展示菜单结构，支持勾选
- [ ] 菜单展开后显示可配置的按钮权限（如新增、编辑、删除、导出等）
- [ ] 保存时提交权限配置到后端

### US-019: [Frontend]  权限指令和 Hook
**Description:** 作为开发者，我希望有统一的权限控制方式，以便在不同场景下应用权限。

**Acceptance Criteria:**
- [ ] 创建权限检查 Hook `frontend/src/hooks/usePermission.ts`
- [ ] 创建 `<ProtectedButton>` 组件，根据权限控制按钮显示
- [ ] 在 `AppSidebar` 中集成权限检查，根据用户权限隐藏菜单
- [ ] 权限检查支持字符串（如 `users:delete`）和数组（多权限任意一个通过即可）

### US-020: [Frontend]  日志管理页面
**Description:** 作为管理员，我希望查看系统操作日志和系统日志，以便追踪问题和审计。

**Acceptance Criteria:**
- [ ] 创建日志管理页面组件 `frontend/src/features/system/logs/LogPage.tsx`
- [ ] 使用 Tabs 组件分为"操作日志"和"系统日志"两个标签页
- [ ] 操作日志包含：用户、操作类型、操作对象、IP 地址、时间、详情
- [ ] 系统日志包含：日志级别、模块、消息、时间、堆栈信息（展开查看）
- [ ] 支持按时间范围、用户、日志级别筛选
- [ ] 支持导出日志为 CSV

### US-021: [Frontend]  Webhook 配置管理页面
**Description:** 作为管理员，我希望配置 Webhook（企业微信、飞书、钉钉），以便系统可以发送消息通知。

**Acceptance Criteria:**
- [ ] 创建 Webhook 配置页面组件 `frontend/src/features/system/webhooks/WebhookPage.tsx`
- [ ] 展示 Webhook 配置列表：名称、平台（企业微信/飞书/钉钉）、状态、创建时间
- [ ] 支持"新增配置"操作，打开抽屉组件
- [ ] Webhook 表单：名称、平台选择、Webhook URL
- [ ] 支持编辑和删除配置
- [ ] 支持测试发送功能（发送测试消息到配置的 Webhook）
- [ ] 显示发送历史记录

### US-022: [Frontend]  OSS 文件管理页面
**Description:** 作为管理员，我希望管理上传的文件（图片、文档等），以便清理和监控存储空间。

**Acceptance Criteria:**
- [ ] 创建 OSS 管理页面组件 `frontend/src/features/system/oss/OssPage.tsx`
- [ ] 展示文件列表：文件名、大小、类型、上传时间、上传者
- [ ] 支持图片预览
- [ ] 支持上传新文件（拖拽或点击选择，调用 OSS 上传接口）
- [ ] 支持删除文件
- [ ] 显示存储空间使用统计（调用 OSS 统计接口）
- [ ] 支持按文件类型筛选

### 阶段二：业务页面统一

### US-023: [Frontend]  统一业务列表组件
**Description:** 作为开发者，我希望所有业务列表（合同、发票、产品等）使用统一的 DataTable 组件样式，以便保持 UI 一致性。

**Acceptance Criteria:**
- [ ] 确保 `frontend/src/components/data-table/data-table.tsx` 支持以下功能：
  - 列配置（显示/隐藏列）
  - 列排序
  - 全局搜索
  - 列筛选（faceted filter）
  - 分页
  - 行选择
  - 批量操作
- [ ] 确保支持移动端响应式布局
- [ ] 确保支持暗色模式
- [ ] 在合同、发票、产品页面应用统一组件

### US-024: [Frontend]  统一业务抽屉/弹窗组件
**Description:** 作为开发者，我希望所有业务详情和编辑使用统一的抽屉或弹窗组件，以便保持交互一致性。

**Acceptance Criteria:**
- [ ] 确保 `frontend/src/components/ui/sheet.tsx` 和 `dialog.tsx` 样式统一
- [ ] 创建统一的表单布局模板
- [ ] 确保表单验证提示样式一致
- [ ] 确保按钮布局（取消/保存/删除）位置一致
- [ ] 在合同、发票、产品页面应用统一组件

### 阶段三：自动化配置

### US-025: [Frontend]  自动化管理入口
**Description:** 作为用户，我希望在系统中访问自动化管理页面，以便配置自动化规则。

**Acceptance Criteria:**
- [ ] 在 `sidebar-data.ts` 中添加"自动化管理"菜单项，URL 为 `/automation`
- [ ] 创建路由文件 `frontend/src/routes/_authenticated/automation.tsx`
- [ ] 创建自动化列表页面 `frontend/src/features/automation/AutomationListPage.tsx`
- [ ] 展示自动化规则卡片列表，每个卡片显示：规则名称、触发条件概要、执行动作概要、状态（启用/禁用）、最后执行时间
- [ ] 添加"新增自动化"按钮

### US-026: [Frontend]  自动化规则配置页面
**Description:** 作为用户，我希望通过可视化界面配置自动化规则，以便实现业务流程自动化。

**Acceptance Criteria:**
- [ ] 创建规则配置页面组件 `frontend/src/features/automation/AutomationConfigPage.tsx`
- [ ] 页面布局为左中右三栏结构：
  - 左侧：条件配置卡片（实体选择、字段选择、操作符、值输入）
  - 中间：连接箭头图标（向右）
  - 右侧：执行动作配置列表
- [ ] 顶部：规则名称输入、状态开关、保存按钮
- [ ] 左侧条件卡片底部有四个按钮：新增记录、修改记录、删除记录、定时
- [ ] 点击按钮后从后端 API 加载对应的实体类型选择器
- [ ] 支持多个条件组合（且/或逻辑）
- [ ] 支持多个执行动作配置

### US-027: [Frontend]  条件配置组件
**Description:** 作为用户，我希望配置触发条件，以便定义何时执行自动化。

**Acceptance Criteria:**
- [ ] 创建条件配置组件 `frontend/src/features/automation/components/ConditionBuilder.tsx`
- [ ] 从 API `/automation/entities` 获取实体类型列表
- [ ] 从 API `/automation/entities/:type/fields` 获取字段列表
- [ ] 从 API `/automation/operators` 获取操作符列表
- [ ] 支持选择实体类型、字段、操作符、输入值
- [ ] 支持条件组合（且/或）逻辑
- [ ] 支持添加/删除条件

### US-028: [Frontend]  执行动作配置组件
**Description:** 作为用户，我希望配置自动化执行的具体动作，以便实现自动化的业务操作。

**Acceptance Criteria:**
- [ ] 创建执行动作配置组件 `frontend/src/features/automation/components/ActionBuilder.tsx`
- [ ] 从 API `/automation/actions` 获取动作类型列表
- [ ] 支持选择动作类型：新增记录、修改记录、删除记录、发送 Webhook、定时任务
- [ ] 新增记录：选择目标实体、配置字段值映射
- [ ] 修改记录：选择目标实体、配置筛选条件、配置要修改的字段
- [ ] 删除记录：选择目标实体、配置筛选条件
- [ ] 发送 Webhook：选择已配置的 Webhook、配置消息内容（支持文本/Markdown/卡片）
- [ ] 定时任务：配置 cron 表达式或简单选项
- [ ] 支持添加多个执行动作
- [ ] 支持拖拽排序执行动作顺序

### US-029: [Frontend]  定时任务配置组件
**Description:** 作为用户，我希望配置定时触发的自动化规则，以便按计划执行任务。

**Acceptance Criteria:**
- [ ] 创建定时任务配置组件 `frontend/src/features/automation/components/ScheduleBuilder.tsx`
- [ ] 提供简单模式：每小时、每天、每周、每月
- [ ] 提供高级模式：支持 cron 表达式输入
- [ ] 提供 cron 表达式预览（显示下一次执行时间）
- [ ] 提供常用 cron 模板选择
- [ ] 验证 cron 表达式格式正确性

### US-030: [Frontend]  自动化规则保存和测试
**Description:** 作为用户，我希望保存自动化规则并进行测试，以便验证配置是否正确。

**Acceptance Criteria:**
- [ ] 保存时验证必填字段（规则名称、至少一个条件、至少一个执行动作）
- [ ] 保存前格式化数据结构
- [ ] 调用后端 API `/automation/rules` 保存规则
- [ ] 提供"测试执行"按钮，调用 `/automation/rules/:id/test` 模拟执行并显示结果
- [ ] 显示保存成功/失败的 toast 通知

### US-031: [Frontend]  自动化执行历史查看
**Description:** 作为用户，我希望查看自动化规则的执行历史，以便了解规则运行情况。

**Acceptance Criteria:**
- [ ] 在自动化列表页面添加"执行历史"按钮
- [ ] 点击后打开对话框展示执行历史列表
- [ ] 调用 API `/automation/rules/:id/executions` 获取执行历史
- [ ] 显示：执行时间、触发类型、状态（成功/失败/重试中）、重试次数、结果、错误信息（如果有）
- [ ] 支持分页和筛选

---

## Functional Requirements

### RBAC 系统
- FR-1: 系统必须支持多用户管理，包括用户的增删改查
- FR-2: 系统必须支持部门树形结构管理
- FR-3: 系统必须支持角色管理，一个用户可以属于多个角色
- FR-4: 权限必须支持三级：菜单级、页面级、按钮级
- FR-5: 系统必须记录所有用户的操作日志（登录、增删改等）
- FR-6: 系统必须记录系统日志（API 调用、错误信息等）
- FR-7: 系统必须支持 Webhook 消息发送（企业微信、飞书、钉钉）
- FR-8: 系统必须支持文件上传、预览、删除管理（阿里云 OSS）

### 业务页面统一
- FR-9: 所有业务列表必须使用相同的 DataTable 组件
- FR-10: 所有业务详情/编辑必须使用相同的 Drawer/Dialog 组件
- FR-11: 所有页面必须支持响应式布局（桌面端和移动端）
- FR-12: 所有页面必须支持暗色模式

### 自动化配置
- FR-13: 系统必须从后端 API 动态获取实体类型和字段信息
- FR-14: 条件配置必须支持：等于、不等于、大于、小于、包含、为空、不为空
- FR-15: 条件必须支持且/或逻辑组合
- FR-16: 执行动作必须支持：新增记录、修改记录、删除记录、发送 Webhook、定时任务
- FR-17: 系统必须支持实时触发（EventEmitter2 事件驱动）
- FR-18: 系统必须支持定时触发（简单间隔和 cron 表达式）
- FR-19: 系统必须支持测试执行功能
- FR-20: 自动化规则必须支持启用/禁用状态

### 自动化引擎
- FR-21: 引擎必须能解析条件并评估数据是否满足
- FR-22: 引擎必须能执行 CRUD 操作动作
- FR-23: 引擎必须能发送 Webhook 消息通知
- FR-24: 引擎必须支持 EventEmitter2 事件驱动的实时触发
- FR-25: 引擎必须支持定时任务调度
- FR-26: 引擎必须记录每次执行的详细历史
- FR-27: 引擎必须处理执行错误并自动重试（最多 3 次）

### Webhook 集成
- FR-28: 系统必须支持企业微信 Webhook 消息格式
- FR-29: 系统必须支持飞书 Webhook 消息格式
- FR-30: 系统必须支持钉钉 Webhook 消息格式
- FR-31: 系统必须支持文本、Markdown、卡片消息类型

## Non-Goals (Out of Scope)

### 本期不包含
- 数据级权限控制（如用户只能看自己创建的数据）- 后续版本考虑
- 系统主题自动检测 - 后续版本考虑
- 自定义颜色方案 - 暂时使用预设主题
- 自动化规则的可视化流程图编辑器 - 使用三栏布局
- 自动化规则的版本管理和回滚
- 复杂的表达式编辑器（如括号分组）- 使用简单的且/或组合
- 自动化规则的条件分组（嵌套条件）- 扁平化条件列表
- 分布式自动化引擎执行 - 单机执行即可
- 邮件服务发送 - 使用 Webhook 替代

## Technical Considerations

### 依赖关系
- 后端 API 开发优先于前端开发
- 后端完成后必须运行 `cd frontend && pnpm run generate:api` 生成 API 客户端

### 后端技术栈
- NestJS 框架
- TypeORM / Prisma（根据项目现有选择）
- MySQL / PostgreSQL 数据库
- `@nestjs/event-emitter` 或 `eventemitter2` - EventEmitter2 事件驱动
- `@nestjs/schedule` 或 `node-cron` - 定时任务
- `ali-oss` 或 `@alicloud/oss-sdk` - 阿里云 OSS SDK
- `class-validator` - DTO 验证
- `@nestjs/swagger` - API 文档
- `axios` - Webhook HTTP 请求

### 前端技术栈
- TanStack Router 路由管理
- TanStack Query 数据获取
- react-hook-form + zod 表单管理
- Radix UI 组件库
- Tailwind CSS 样式
- Zustand 状态管理

### 文件组织
- 后端模块：`backend/src/modules/`
  - `users/` - 用户模块
  - `roles/` - 角色模块
  - `departments/` - 部门模块
  - `permissions/` - 权限模块
  - `logs/` - 日志模块
  - `webhooks/` - Webhook 模块
  - `oss/` - OSS 模块
  - `automation/` - 自动化模块
    - `metadata/` - 元数据
    - `rules/` - 规则管理
    - `engine/` - 引擎（条件评估、动作执行、EventEmitter2 触发器）
- 前端功能模块：`frontend/src/features/`
  - `system/` - 系统功能
  - `automation/` - 自动化功能

### 阿里云 OSS 配置
需要的环境变量：
- `OSS_REGION` - 区域
- `OSS_BUCKET` - 存储桶名称
- `OSS_ACCESS_KEY_ID` - Access Key ID
- `OSS_ACCESS_KEY_SECRET` - Access Key Secret
- `OSS_ENDPOINT` - 自定义域名（可选）

### 自动化失败重试策略
- 最大重试次数：3 次
- 重试间隔：指数退避（1秒 → 2秒 → 4秒）
- 重试状态：执行记录中标记为 `retrying`
- 最终失败后：记录错误信息，状态标记为 `failed`

### EventEmitter2 事件定义
事件格式：`{entity}.{action}`
- `customer.created` - 客户创建
- `customer.updated` - 客户更新
- `customer.deleted` - 客户删除
- `contact.created` - 联系人创建
- `contract.created` - 合同创建
- 等等...

事件负载：
```typescript
{
  entityType: 'customer',
  entityId: '123',
  action: 'created',
  data: { /* 实体数据 */ },
  timestamp: '2026-02-03T10:00:00Z'
}
```

### Webhook 消息格式示例

**企业微信文本消息：**
```json
{
  "msgtype": "text",
  "text": {
    "content": "您的客户张三已成功创建"
  }
}
```

**飞书卡片消息：**
```json
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": {
        "tag": "plain_text",
        "content": "客户创建通知"
      }
    },
    "elements": [
      {
        "tag": "div",
        "text": {
          "tag": "plain_text",
          "content": "客户张三已成功创建"
        }
      }
    ]
  }
}
```

**钉钉 Markdown 消息：**
```json
{
  "msgtype": "markdown",
  "markdown": {
    "title": "客户创建通知",
    "text": "## 客户创建通知\n客户张三已成功创建"
  }
}
```

## Success Metrics

- 所有用户故事完成后，系统管理员能够完整管理用户和权限
- 权限系统能够正确控制菜单和按钮的显示
- 所有业务页面（合同、发票、产品）UI 风格统一
- 用户能够通过可视化界面配置自动化规则
- 自动化引擎能够通过 EventEmitter2 正确触发和执行
- 自动化失败时能够自动重试最多 3 次
- Webhook 消息能够成功发送到企业微信、飞书、钉钉
- OSS 文件上传、下载、删除功能正常工作
- 所有 API 通过类型检查和 lint 检查

## Open Questions

- Webhook 配置是否需要支持密钥签名验证？（建议后续版本添加）
- 自动化规则的执行频率限制？（建议添加防抖机制，避免短时间重复执行）

[/PRD]