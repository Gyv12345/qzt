# 记账通(QZT)项目设计文档

## 文档信息
- **项目名称**: 记账通 (QZT)
- **文档版本**: v1.0
- **创建日期**: 2025-02-03
- **文档类型**: 产品需求 + 技术设计 + 开发路线图

---

## 目录
1. [项目定位与核心架构](#1-项目定位与核心架构)
2. [核心业务模块设计](#2-核心业务模块设计)
3. [自动化任务系统设计](#3-自动化任务系统设计)
4. [权限管理系统设计](#4-权限管理系统设计)
5. [数据模型与核心表设计](#5-数据模型与核心表设计)
6. [技术架构与实现方案](#6-技术架构与实现方案)
7. [自动化任务技术实现](#7-自动化任务技术实现)
8. [权限系统技术实现](#8-权限系统技术实现)
9. [开发路线图与迭代计划](#9-开发路线图与迭代计划)
10. [技术难点与解决方案](#10-技术难点与解决方案)
11. [部署与运维](#11-部署与运维)

---

## 1. 项目定位与核心架构

### 1.1 项目概述
**记账通(QZT)** 是一款专为代理记账公司设计的内部管理系统,采用前后端分离架构。后端使用 NestJS + Prisma + MySQL,前端使用 React + Ant Design + TailwindCSS,支持按钮级别的精细化权限控制。

### 1.2 核心业务流程
从新媒体渠道(抖音、小红书、视频号)获取客户线索 → 销售跟进并签订合同 → 配置产品与阶梯定价规则 → 服务期内财务通过待办提醒持续服务 → 自动化监控合同到期、客户状态等关键节点 → 发票管理与分析统计。

### 1.3 系统角色
- **超级管理员**: 系统内置,不可删除,负责管理所有用户和权限
- **财务人员**: 查看客户列表、处理待办任务、管理发票
- **销售人员**: 跟进客户、管理合同、查看业绩统计
- **服务人员**: 协同处理客户服务相关事务

### 1.4 技术特点
- 前端路由配置与后端权限数据同步,菜单可编辑但不可删除
- 自动化任务引擎支持定时触发和事件驱动
- 阶梯定价引擎支持按金额、按次数等多种计费模式
- 完整的操作日志和审计追踪

---

## 2. 核心业务模块设计

### 2.1 客户管理模块
- 客户基本信息(公司名称、税号、法人、联系方式等)
- 客户状态管理(线索、跟进中、已签约、服务中、已流失)
- 客户标签与分组(行业、规模、重要等级等)
- 跟进记录管理,支持销售人员记录每次沟通内容
- 客户资料上传与共享(营业执照、身份证件等)

### 2.2 产品与定价模块
- 产品库管理(代理记账、工商注册、税务筹划等)
- **阶梯定价规则引擎**:
  - 按开票金额阶梯: 如年费1200元含20万额度,超额加收300元
  - 按开票次数计费: 零申报客户免费N次,超额按次收费
  - 支持自定义规则: 按服务项目、按附加服务等
- 产品与发票关联配置
- 价格版本管理,支持历史价格追溯

### 2.3 合同管理模块
- 合同基本信息(客户、产品、服务期限、价格)
- 合同状态(草稿、生效、即将到期、已到期、已续约、已终止)
- 电子合同附件上传
- 续约提醒与续约流程
- 合同变更记录

### 2.4 发票管理模块
- 发票录入与分类(专票、普票、电子发票)
- 发票与产品关联,自动触发阶梯计价
- 开票额度统计与超额提醒
- 发票统计分析(按时间、按客户、按产品)
- 月度/季度/年度开票汇总

### 2.5 跟进记录模块
- 跟进记录的增删改查
- 关联到客户
- 跟进时间线展示
- 下次跟进时间提醒
- 跟进方式记录(电话、微信、上门等)

---

## 3. 自动化任务系统设计

### 3.1 自动化任务引擎
**技术方案**: 采用 **Bull 消息队列 + Node-cron** 实现定时任务调度,支持灵活的任务配置和执行。

### 3.2 核心自动化场景

#### 3.2.1 合同到期提醒
- **触发时机**: 合同到期前30天、15天、7天、1天
- **提醒对象**: 客户的销售负责人 + 财务负责人
- **提醒方式**: 站内消息 + 可选邮件/企业微信通知
- **提醒内容**: 客户名称、合同到期日、续约建议
- **操作入口**: 直接跳转到续约页面

#### 3.2.2 新客户跟进提醒
- **触发时机**: 新客户添加后,每日早上9:00自动提醒
- **持续周期**: 连续提醒7天或直到客户转为"已签约"状态
- **提醒对象**: 客户的销售负责人
- **提醒内容**: 新客户待跟进列表,包含客户基本信息和跟进建议

#### 3.2.3 财务月度待办任务
- **触发时机**: 每月1号上午10:00
- **提醒对象**: 所有财务人员
- **任务内容**:
  - 生成当月需要服务的客户清单
  - 提醒查看各客户开票情况
  - 提醒即将到期的合同
  - 标记需要老板关注的异常客户
- **任务状态**: 支持"已完成"/"待处理"/"已延期"状态跟踪

#### 3.2.4 客户激活提醒
- **触发时机**: 客户超过30天无互动
- **提醒对象**: 客户的销售负责人
- **提醒内容**: 长期未联系客户列表,建议回访

### 3.3 任务配置界面
- 前端提供自动化规则配置页面
- 支持开启/关闭各类自动化任务
- 支持自定义提醒时间和频率
- 支持查看任务执行历史和失败日志

---

## 4. 权限管理系统设计

### 4.1 权限管理模块
**技术方案**: 采用 **RBAC(基于角色的访问控制)** 模型,实现从前端路由到后端接口的全链路权限控制。

### 4.2 核心概念
- **用户**: 系统使用者,通过用户名+密码登录
- **角色**: 用户的职位类型(超级管理员、财务、销售、服务人员等)
- **权限**: 对系统资源的访问控制能力
  - 菜单权限: 控制左侧导航菜单的显示
  - 按钮权限: 控制页面内操作按钮的显示/禁用
  - 数据权限: 控制能查看的数据范围(如只看自己的客户)
  - 接口权限: 后端API的访问控制

### 4.3 权限配置流程
1. **前端路由注册**: 开发时在前端路由配置中定义所有页面路径
2. **菜单同步**: 前端路由自动同步到后端,生成菜单权限数据
3. **角色授权**: 在管理后台为角色分配菜单和按钮权限
4. **用户赋权**: 为用户分配角色,用户继承角色的所有权限
5. **运行时校验**:
   - 前端: 路由守卫检查菜单权限,组件内根据按钮权限控制显示
   - 后端: 装饰器检查接口权限,返回403无权限

### 4.4 超级管理员特性
- 系统内置用户,不可删除
- 拥有所有权限,无需单独配置
- 负责创建和管理其他用户
- 负责配置角色和权限

### 4.5 菜单管理规则
- 菜单数据来源于前端路由配置
- 支持编辑菜单名称、图标、排序
- **不支持删除**菜单(防止破坏路由结构)
- 菜单的启用/禁用控制用户是否可见

### 4.6 按钮级权限控制示例
- 客户列表页: 新增客户、编辑、删除、导出按钮
- 合同详情页: 编辑合同、上传附件、发起续约按钮
- 发票页面: 录入发票、审核、删除按钮

---

## 5. 数据模型与核心表设计

### 5.1 客户相关
- `Customer`: 客户基本信息(公司名称、税号、法人、行业、状态等)
- `FollowRecord`: 跟进记录(客户ID、跟进人、跟进内容、下次跟进时间)
- `CustomerTag`: 客户标签
- `CustomerAttachment`: 客户附件(营业执照、证件等文件)

### 5.2 产品与定价
- `Product`: 产品信息(名称、类型、基础价格、描述)
- `PricingRule`: 定价规则(产品ID、规则类型、阶梯配置)
- `PricingTier`: 定价阶梯(规则ID、阈值、价格/加价)
  - 示例: 规则类型="按金额", 阶梯=[{0-20万: 1200元}, {20万-50万: 1500元}]

### 5.3 合同相关
- `Contract`: 合同信息(客户ID、产品ID、服务期限、价格、状态)
- `ContractAttachment`: 合同附件
- `ContractChangeLog`: 合同变更记录

### 5.4 发票相关
- `Invoice`: 发票信息(客户ID、合同ID、类型、金额、开票日期)
- `InvoiceProduct`: 发票与产品关联,用于计价触发

### 5.5 权限相关
- `User`: 用户信息(用户名、密码、姓名、所属部门)
- `Role`: 角色信息(角色名称、描述)
- `Permission`: 权限信息(类型、资源标识、描述)
- `RolePermission`: 角色与权限关联
- `UserRole`: 用户与角色关联
- `Menu`: 菜单信息(路径、名称、图标、父级菜单、排序)

### 5.6 自动化任务
- `AutomationRule`: 自动化规则(类型、触发条件、执行动作、启用状态)
- `AutomationTask`: 任务执行记录(规则ID、执行时间、执行结果、失败原因)
- `Notification`: 系统通知(用户ID、类型、标题、内容、阅读状态)

### 5.7 统计分析
- `DailyTaskLog`: 每日任务日志(用户ID、日期、任务类型、完成情况)
- `StatisticsCache`: 统计缓存(缓存Key、数据JSON、更新时间)

---

## 6. 技术架构与实现方案

### 6.1 前端技术栈
- **框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5.x
- **样式方案**: TailwindCSS + CSS Variables
- **状态管理**: Zustand
- **路由**: React Router v6
- **HTTP客户端**: Axios + React Query
- **构建工具**: Vite
- **端口**: 3456

### 6.2 后端技术栈
- **框架**: NestJS 10.x + TypeScript
- **ORM**: Prisma
- **数据库**: MySQL 8.x
- **身份认证**: JWT + Passport
- **任务队列**: Bull + Redis
- **定时任务**: @nestjs/schedule + node-cron
- **参数校验**: class-validator
- **API文档**: Swagger
- **端口**: 7890

### 6.3 目录结构
```
backend/src/
├── modules/
│   ├── auth/           # 认证模块
│   ├── customer/       # 客户管理
│   ├── contract/       # 合同管理
│   ├── product/        # 产品与定价
│   ├── invoice/        # 发票管理
│   ├── follow-record/  # 跟进记录
│   ├── automation/     # 自动化任务
│   ├── statistics/     # 统计分析
│   ├── system/         # 系统配置
│   └── service-team/   # 服务团队
├── common/
│   ├── guards/         # 守卫(权限验证)
│   ├── decorators/     # 装饰器
│   ├── filters/        # 异常过滤器
│   └── prisma/         # Prisma客户端
└── config/             # 配置文件

frontend/src/
├── pages/
│   ├── customer/       # 客户管理页面
│   ├── contract/       # 合同管理页面
│   ├── product/        # 产品管理页面
│   ├── invoice/        # 发票管理页面
│   ├── follow-record/  # 跟进记录页面
│   ├── automation/     # 自动化配置页面
│   ├── statistics/     # 统计分析页面
│   └── system/         # 系统配置页面
├── components/         # 公共组件
├── services/           # API服务
├── stores/             # 状态管理
├── router/             # 路由配置
└── models/             # TypeScript类型定义
```

---

## 7. 自动化任务技术实现

### 7.1 任务调度架构
- **Bull Queue**: 处理异步任务,支持重试、延迟、优先级
- **Node-cron**: 处理周期性定时任务
- **Redis**: 作为Bull的后端存储
- **任务处理器**: 独立的任务执行模块,易于扩展

### 7.2 核心任务类型实现

#### 7.2.1 定时任务
使用 `@nestjs/schedule` 的 `CronJob`:

```typescript
// 每月1号10:00生成财务待办
@Cron('0 10 1 * *', { timeZone: 'Asia/Shanghai' })
async generateMonthlyTasks() {
  // 查询所有财务人员
  // 生成当月待办任务
  // 发送通知
}

// 每日9:00检查新客户跟进
@Cron('0 9 * * *', { timeZone: 'Asia/Shanghai' })
async checkNewCustomerFollow() {
  // 查询7天内添加的未签约客户
  // 发送跟进提醒
}
```

#### 7.2.2 延迟任务
使用 Bull 的延迟队列:

```typescript
// 合同签订后,设置到期前提醒
async scheduleContractExpiryAlert(contractId: string) {
  const delay = this.calculateDelayBeforeExpiry();
  await this.contractQueue.add(
    'expiry-alert',
    { contractId },
    { delay }
  );
}
```

#### 7.2.3 事件驱动任务
使用 NestJS 事件系统:

```typescript
// 发票录入后,触发阶梯计价检查
@OnEvent('invoice.created')
async handleInvoiceCreated(payload: InvoiceCreatedEvent) {
  // 检查是否触发阶梯加价
  // 计算新的服务费用
  // 生成费用变更记录
}
```

### 7.3 任务配置界面
- 前端页面展示所有自动化规则
- 支持开启/关闭规则
- 支持修改触发时间
- 查看任务执行历史和失败日志
- 手动触发任务执行(测试用)

### 7.4 错误处理
- 任务执行失败自动重试(最多3次)
- 失败任务记录到日志表
- 管理员可查看失败原因并手动重试
- 关键任务失败发送告警通知

---

## 8. 权限系统技术实现

### 8.1 数据库设计
```sql
-- 菜单表(从前端路由同步)
Menu {
  id: string
  path: string          -- 路由路径
  name: string          -- 菜单名称
  icon?: string         -- 图标
  parentId?: string     -- 父级菜单
  sort: number          -- 排序
  enabled: boolean      -- 是否启用
}

-- 权限表(按钮级权限)
Permission {
  id: string
  resource: string      -- 资源标识,如 "customer.delete"
  description: string   -- 权限描述
  type: enum            -- MENU | BUTTON | API
}

-- 角色表
Role {
  id: string
  name: string          -- 角色名称
  description: string
}

-- 角色-权限关联
RolePermission {
  roleId: string
  permissionId: string
}
```

### 8.2 前端实现

#### 8.2.1 路由守卫
```typescript
// 检查用户是否有访问该路由的权限
const ProtectedRoute = ({ children, path }) => {
  const { user } = useAuthStore();
  const hasPermission = checkMenuPermission(user, path);
  return hasPermission ? children : <NoPermission />;
};
```

#### 8.2.2 按钮权限控制
```typescript
// 根据权限标识控制按钮显示
const hasPermission = (resource: string) => {
  return user.permissions?.includes(resource);
};

// 使用
{hasPermission('customer.create') && (
  <Button>新增客户</Button>
)}
```

### 8.3 后端实现

#### 8.3.1 权限装饰器
```typescript
// require-permissions.decorator.ts
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// 使用
@Post()
@RequirePermissions('customer.create')
async createCustomer(@Body() dto: CreateCustomerDto) {
  // ...
}
```

#### 8.3.2 权限守卫
```typescript
// permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = Reflect.getMetadata('permissions', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return checkPermissions(user, requiredPermissions);
  }
}
```

### 8.4 菜单同步机制
- 前端启动时扫描所有路由配置
- 自动同步到后端 Menu 表
- 管理员在后台编辑菜单名称、图标
- 删除菜单操作被禁用(防止破坏路由)

---

## 9. 开发路线图与迭代计划

### 9.1 Phase 1: 核心基础 (P0 - 必须完成)
**目标**: 完成基础架构和核心业务流程
**预计时间**: 2周

**功能清单**:
1. 用户认证与权限基础
   - 登录/注册/登出
   - JWT token管理
   - 超级管理员账号初始化
   - 基础的菜单权限控制

2. 客户管理
   - 客户列表/新增/编辑/删除
   - 客户详情查看
   - 客户状态管理
   - 客户搜索与筛选

3. 跟进记录
   - 跟进记录的增删改查
   - 关联到客户
   - 跟进时间线展示

4. 产品管理
   - 产品列表/新增/��辑
   - 基础价格设置
   - 产品分类

5. 合同管理
   - 合同列表/新增/编辑
   - 关联客户和产品
   - 合同状态流转
   - 合同到期日显示

---

### 9.2 Phase 2: 阶梯定价与发票 (P0 - 必须完成)
**目标**: 实现核心的差异化定价能力
**预计时间**: 1.5周

**功能清单**:
1. 阶梯定价引擎
   - 定价规则配置界面
   - 支持按金额阶梯
   - 支持按次数计费
   - 零申报特殊规则

2. 发票管理
   - 发票录入
   - 发票与产品关联
   - 开票额度统计
   - 超额提醒

3. 价格计算服务
   - 根据发票自动计算服务费用
   - 费用变更记录
   - 价格差异通知

---

### 9.3 Phase 3: 自动化任务 (P1 - 高优先级)
**目标**: 提升效率,减少人工干预
**预计时间**: 2周

**功能清单**:
1. 任务调度基础
   - Bull队列集成
   - Redis配置
   - 任务处理器框架

2. 合同到期提醒
   - 定时检查到期合同
   - 发送站内消息
   - 提醒历史记录

3. 新客户跟进提醒
   - 每日自动检查新客户
   - 销售人员跟进提醒
   - 提醒持续7天或签约后停止

4. 财务月度待办
   - 每月1号自动生成
   - 客户服务清单
   - 任务完成状态跟踪

5. 自动化配置界面
   - 规则开启/关闭
   - 触发时间配置
   - 执行历史查看

---

### 9.4 Phase 4: 统计分析 (P1 - 高优先级)
**目标**: 数据可视化,支持业务决策
**预计时间**: 1.5周

**功能清单**:
1. Dashboard仪表盘
   - 客户数量统计
   - 合同金额统计
   - 发票金额统计
   - 待办任务统计

2. 统计分析页面
   - 客户增长趋势
   - 合同续约率
   - 开票金额分析
   - 销售业绩排行

3. 数据导出
   - 客户列表导出
   - 合同列表导出
   - 发票明细导出

---

### 9.5 Phase 5: 权限系统完善 (P1 - 高优先级)
**目标**: 实现按钮级精细权限控制
**预计时间**: 1.5周

**功能清单**:
1. 角色管理
   - 角色列表/新增/编辑
   - 角色权限配置

2. 权限管理
   - 菜单权限(从前端路由同步)
   - 按钮权限配置
   - 权限与角色关联

3. 用户管理
   - 用户列表/新增/编辑/禁用
   - 用户角色分配
   - 用户密码重置

4. 前端权限控制
   - 路由守卫
   - 按钮显示控制
   - 接口权限校验

---

### 9.6 Phase 6: 增强功能 (P2 - 中优先级)
**目标**: 完善系统功能,提升用户体验
**预计时间**: 1.5周

**功能清单**:
1. 合同附件管理
   - 附件上传
   - 附件下载
   - 附件预览

2. 客户资料管理
   - 客户附件上传
   - 资料共享
   - 资料版本管理

3. 消息通知中心
   - 站内消息列表
   - 消息已读/未读状态
   - 消息分类筛选

4. 操作日志
   - 用户操作记录
   - 数据变更记录
   - 日志查询与导出

---

### 9.7 Phase 7: 新媒体模块 (P3 - 低优先级)
**目标**: 扩展获客渠道管理
**预计时间**: 1周

**功能清单**:
1. 线索管理
   - 线索录入(来源:抖音/小红书/视频号)
   - 线索分配
   - 线索转化跟踪

2. 来源统计
   - 各平台线索数量
   - 转化率分析
   - ROI分析

3. 内容管理(可选)
   - 发布计划
   - 素材管理

---

### 9.8 总体时间规划
- **预计总开发时间**: 约10-12周
- **推荐团队规模**: 2-3人(1后端 + 1前端 + 1全栈/测试)
- **迭代周期**: 每2-3周完成一个Phase

---

## 10. 技术难点与解决方案

### 10.1 阶梯定价引擎的灵活性与性能

**挑战**:
- 需要支持多种定价模式(按金额、按次数、零申报)
- 定价规则可能频繁调整,需要版本管理
- 实时计算可能影响性能

**解决方案**:
```typescript
// 规则引擎设计
interface PricingRule {
  id: string;
  productId: string;
  ruleType: 'AMOUNT_TIER' | 'COUNT_TIER' | 'ZERO_DECLARATION';
  tiers: PricingTier[];
  effectiveDate: Date;
  expiryDate?: Date;
}

interface PricingTier {
  minThreshold: number;
  maxThreshold?: number;
  price: number;
  additionalPrice?: number;  // 加价部分
}

// 计算服务
class PricingCalculator {
  // 使用缓存优化性能
  private cache = new Map<string, CalculatedPrice>();

  calculate(contractId: string, invoiceAmount: number): number {
    // 1. 检查缓存
    // 2. 查询定价规则
    // 3. 匹配阶梯
    // 4. 计算价格
    // 5. 更新缓存
  }
}
```

**优化策略**:
- Redis缓存客户当前累计开票额
- 异步计算,不阻塞主流程
- 定时任务预计算下月费用

---

### 10.2 自动化任务的可靠性与监控

**挑战**:
- 定时任务可能失败,需要重试机制
- 任务执行状态需要可视化
- 大量任务可能影响系统性能

**解决方案**:
```typescript
// 任务执行记录
@Entity()
class AutomationTaskLog {
  id: string;
  ruleId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  executedAt: Date;
  error?: string;
  retryCount: number;
}

// 任务监控
class TaskMonitorService {
  // 失败告警
  async checkFailedTasks() {
    const recentFailures = await this.getRecentFailedTasks();
    if (recentFailures.length > THRESHOLD) {
      await this.sendAlert(recentFailures);
    }
  }
}
```

**监控指标**:
- 任务成功率
- 任务平均执行时间
- 失败任务分布
- 队列积压情况

---

### 10.3 权限系统的同步与一致性

**挑战**:
- 前端路由与后端权限数据需要同步
- 菜单不能删除,但需要支持编辑
- 按钮权限需要细粒度控制

**解决方案**:
```typescript
// 路由同步服务
class RouteSyncService {
  // 前端启动时调用
  async syncRoutes(routes: RouteConfig[]) {
    for (const route of routes) {
      await this.upsertMenu({
        path: route.path,
        name: route.name,
        icon: route.icon,
        // 不删除,只插入或更新
      });
    }
  }
}

// 权限装饰器
@RequirePermissions('customer.create')
@UseGuards(PermissionsGuard)
async createCustomer() {
  // 如果用户没有权限,守卫会返回403
}
```

**同步策略**:
- 前端启动时自动同步路由到后端
- 后端存储菜单的启用状态和编辑后的名称
- 前端渲染时结合路由配置和后端数据
- 提供强制刷新按钮重新同步

---

### 10.4 数据统计的实时性

**挑战**:
- 统计数据需要频繁更新
- 大数据量下查询可能较慢
- 多维度统计复杂度高

**解决方案**:
```typescript
// 统计缓存策略
class StatisticsService {
  // 增量更新
  async updateCustomerStats() {
    const today = new Date();
    const cache = await this.getCache(today);

    if (!cache) {
      // 首次计算全量
      await this.calculateFullStats(today);
    } else {
      // 后续增量更新
      await this.updateIncremental(today);
    }
  }

  // 定时预计算(每天凌晨)
  @Cron('0 2 * * *')
  async preCalculateDailyStats() {
    const yesterday = getYesterday();
    await this.calculateFullStats(yesterday);
  }
}
```

**优化策略**:
- 统计数据缓存
- 定时任务预计算
- 实时数据使用 WebSocket 推送
- 复杂查询使用数据库索引优化

---

## 11. 部署与运维

### 11.1 生产环境部署

#### 11.1.1 技术栈与依赖
- **Node.js**: 18.x LTS
- **MySQL**: 8.0+
- **Redis**: 7.x (用于Bull队列和缓存)
- **PM2**: 进程管理
- **Nginx**: 反向代理

#### 11.1.2 环境配置

**后端环境变量** (.env.production):
```bash
# 数据库
DATABASE_URL="mysql://user:pass@localhost:3306/qzt_prod"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-production-secret
JWT_EXPIRES_IN=7d

# 服务端口
PORT=7890

# 前端地址(允许跨域)
FRONTEND_URL=https://your-domain.com
```

**前端环境变量** (.env.production):
```bash
# API地址
VITE_API_BASE_URL=https://api.your-domain.com

# 应用配置
VITE_APP_NAME=记账通
VITE_APP_VERSION=1.0.0
```

#### 11.1.3 数据库迁移
```bash
# 生成迁移
cd backend
npx prisma migrate dev --name init

# 生产环境部署
npx prisma migrate deploy

# 生成客户端
npx prisma generate
```

#### 11.1.4 启动脚本

**后端 PM2 配置** (ecosystem.config.js):
```javascript
module.exports = {
  apps: [{
    name: 'qzt-backend',
    script: 'dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 7890
    }
  }]
};
```

**启动命令**:
```bash
# 后端
cd backend
pnpm build
pm2 start ecosystem.config.js

# 前端
cd frontend
pnpm build
# 将 dist 目录部署到静态服务器
```

---

### 11.2 监控与日志

#### 11.2.1 日志管理
- **应用日志**: Winston 日志库,按日期分文件
- **日志级别**: error, warn, info, debug
- **日志路径**: `logs/app-YYYY-MM-DD.log`
- **日志轮转**: 保留30天,自动清理旧日志

#### 11.2.2 性能监控
- **响应时间**: 接口平均响应时间 < 500ms
- **数据库查询**: 慢查询日志(>1s)
- **队列监控**: Bull Board 可视化队列状态
- **错误告警**: Sentry 错误追踪(可选)

#### 11.2.3 备份策略
- **数据库备份**: 每天凌晨3点自动备份
- **备份保留**: 保留最近7天 + 每周一的备份
- **备份脚本**: MySQL dump + 压缩存储

---

### 11.3 安全措施

#### 11.3.1 认证与授权
- JWT token 有效期7天
- 密码使用 bcrypt 加密
- 敏感操作需要二次验证
- 登录失败5次锁定账号30分钟

#### 11.3.2 数据安全
- 数据库连接使用 SSL
- 定期更新依赖包修复漏洞
- 环境变量不提交到代码仓库
- 生产环境关闭 Swagger 文档

#### 11.3.3 网络安全
- API 限流: 每个用户每分钟最多100次请求
- CORS 限制: 只允许信任的域名
- XSS 防护: 前端输入验证和转义
- SQL 注入防护: Prisma ORM 参数化查询

---

### 11.4 循环开发流程

#### 11.4.1 每日开发流程
```
晚上开始:
1. 拉取最新代码
2. 运行 ./start-dev.sh 启动开发环境
3. 查看今日任务清单(Todo或任务管理工具)
4. 按优先级开发功能
5. 本地测试验证
6. 提交代码(规范的commit message)
7. 推送到远程

次日继续:
1. 查看昨天的进度
2. 继续未完成的任务
3. 或者开始新的任务
```

#### 11.4.2 迭代周期
- **小迭代**: 每周一个 Phase 的一部分功能
- **中迭代**: 每2-3周完成一个 Phase
- **大迭代**: 每2-3个月完成一个大的版本更新

#### 11.4.3 质量保证
- **代码审查**: 合并前必须经过代码审查
- **自动化测试**: 核心业务逻辑编写单元测试
- **功能测试**: 每个功能完成后手动测试
- **回归测试**: 每次发布前进行全面测试

---

## 附录

### A. 开发环境启动
```bash
# 克隆项目
git clone <repository-url>
cd qzt

# 安装依赖
pnpm install

# 启动开发环境(自动启动前后端)
./start-dev.sh

# 或手动启动
# 终端1: 启动后端 (端口7890)
cd backend && pnpm dev

# 终端2: 启动前端 (端口3456)
cd frontend && pnpm dev
```

### B. 技术选型理由
- **NestJS**: 企业级Node.js框架,模块化架构,依赖注入,TypeScript原生支持
- **Prisma**: 现代化ORM,类型安全,迁移管理优秀
- **React + Ant Design**: 成熟的前端技术栈,组件丰富,开发效率高
- **Bull**: 稳定的任务队列,支持Redis,重试和延迟任务
- **Zustand**: 轻量级状态管理,比Redux简单,性能优秀

### C. 参考资料
- NestJS官方文档: https://docs.nestjs.com/
- Prisma文档: https://www.prisma.io/docs/
- Ant Design文档: https://ant.design/
- Bull文档: https://docs.bullmq.io/

---

**文档结束**

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>
