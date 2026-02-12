# Findings & Decisions - 菜单重构与权限系统升级

---

## 2026-02-12 会话总结

### 经验教训

#### 1. migrations 文件不能删除
- **问题**：`backend/prisma/migrations/` 目录的 SQL 文件被意外删除
- **影响**：失去数据库结构变更历史，无法追踪数据库演变
- **解决**：`git checkout <commit> -- backend/prisma/migrations/` 恢复
- **教训**：migrations 是版本控制的关键部分，永远不要删除

#### 2. 虚拟菜单父节点会导致 404
- **问题**：后端定义了 `/sales`、`/finance` 等父节点，但前端没有对应路由
- **影响**：用户点击菜单分组会 404
- **解决**：删除 `hasChildren: true` 的虚拟父节点，菜单完全平铺
- **教训**：菜单结构必须与路由结构一致

#### 3. i18n 需要前后端配合
- **问题**：后端返回中文 title，前端直接使用，导致 i18n 失效
- **解决**：
  - 后端：每个菜单项定义独立的 i18nKey
  - 后端：mapToMenuItemDto 返回 i18nKey
  - 前端：使用 t(i18nKey) 翻译
- **教训**：i18n 翻译应该在数据源头做，而不是展示层

#### 4. 种子文件设计模式
- **最佳实践**：使用 `findUnique` 检查 + `create` 或 `upsert`
- **好处**：脚本可以安全地多次执行，不会重复创建数据
- **示例**：
```typescript
const existing = await prisma.tag.findUnique({ where: { slug } });
if (!existing) {
  await prisma.tag.create({ data: ... });
}
```

---

## 2026-02-12 会话：菜单路由清理调查

### 问题描述
用户反映 UI 团队改造了菜单，改为"全平铺"设计。用户问：`/sales` 等路由是否应该去掉？

### 调查结果

#### 1. `/sales` 路由状态
**不存在**。通过以下方式确认：
- `ls frontend/src/routes/_authenticated/` 目录列表
- `grep` 搜索路由定义
- 查看菜单配置 `sidebar-data.ts`

#### 2. 实际存在的路由目录
```
frontend/src/routes/_authenticated/
├── apps/           ⚠️ 未在菜单中
├── chats/          ⚠️ 未在菜单中
├── cms/            ✅ 内容管理
├── contacts/       ✅ 联系人管理
├── contract-templates/ ✅ 合同模板
├── contracts/      ✅ 合同管理
├── customer-rules/ ✅ 客户规则
├── customers/      ✅ 客户管理
├── departments/    ✅ 部门管理
├── errors/         ❌ 错误页（无需菜单）
├── help-center/    ⚠️ 未在菜单中
├── invoices/       ✅ 发票管理
├── login-logs/     ✅ 登录日志
├── operation-logs/ ✅ 操作日志
├── payments/       ✅ 收款管理
├── permissions/    ✅ 权限管理
├── products/       ✅ 产品管理
├── roles/          ✅ 角色管理
├── service-teams/  ✅ 服务团队
├── settings/       ⚠️ 未在菜单中
├── social-media/   ✅ 新媒体管理
├── system-logs/    ✅ 系统日志
├── tasks/          ⚠️ 未在菜单中
├── users/          ✅ 用户管理
└── webhooks.tsx    ✅ Webhook配置
```

#### 3. 未被菜单使用的路由（需确认是否删除）

| 路由 | 目录 | 可能用途 | 建议 |
|------|------|----------|------|
| `/apps` | apps/ | 应用中心？ | 需确认功能是否废弃 |
| `/chats` | chats/ | 聊天功能？ | 需确认是否已集成到其他模块 |
| `/tasks` | tasks/ | 任务管理？ | 需确认是否被跟进记录替代 |
| `/settings` | settings/ | 设置页面？ | 可能被迁移到其他位置 |
| `/help-center` | help-center/ | 帮助中心？ | 可选功能，可能无需菜单 |

### 当前菜单结构（sidebar-data.ts）
```
工作台        → /
客户中心      → /customers, /contacts, /follow-records, /service-teams
合同          → /contracts, /contract-templates
财务          → /invoices, /payments
内容管理      → /cms, /cms/pages, /cms/tags, /social-media
业务设置      → /products, /customer-rules, /webhooks
系统设置      → /users, /departments, /roles, /permissions, 日志管理
```

### 下一步行动
1. **确认用户意图** - 用户访问的 `/sales` 实际是什么页面？
2. **代码审计** - 搜索未使用路由的引用，确认是否可安全删除
3. **清理建议** - 提供具体删除清单

---

## Requirements
用户需求：
1. 重构菜单 UI/UX（现有菜单不好看，用户体验差）
2. 客户模块放在合适位置（联系人是客户潜质，客户是最重要的概念）
3. 菜单数据由后台管理（所有初始化数据可配置）
4. 角色与权限关联（菜单权限 + 数据权限）

## Research Findings

### 现有菜单结构分析

**当前菜单配置位置：**
- `frontend/src/components/layout/data/sidebar-data.ts`

**菜单分组结构：**
```
1. 业务 (Business)
   ├── 工作台 (/)
   ├── 销售管理
   │   ├── 联系人管理 (/contacts)    ← 潜质客户
   │   ├── 客户管理 (/customers)     ← 核心概念
   │   ├── 合同管理 (/contracts)
   │   └── 服务团队 (/service-teams)
   └── 财务管理
       ├── 发票管理 (/invoices)
       └── 收款管理 (/payments)

2. 内容管理 (Content)
   ├── 文章管理 (/cms)
   ├── 页面管理 (/cms/pages)
   ├── 标签管理 (/cms/tags)
   └── 新媒体管理 (/social-media)

3. 业务设置 (Business Settings)
   ├── 产品管理 (/products)
   ├── 合同模板设置 (/contract-templates)
   ├── 客户规则 (/customer-rules)
   └── Webhook配置 (/webhooks)

4. 系统设置 (System)
   ├── 用户管理 (/users)
   ├── 部门管理 (/departments)
   ├── 角色管理 (/roles)
   ├── 权限管理 (/permissions)
   └── 日志管理
       ├── 登录日志 (/login-logs)
       ├── 操作日志 (/operation-logs)
       └── 系统日志 (/system-logs)
```

### 现有菜单组件分析

**菜单组件位置：**
- `frontend/src/components/ui/sidebar.tsx` - 主侧边栏组件
- `frontend/src/features/menus/hooks/use-menu-tree.ts` - 菜单数据 Hook
- `frontend/src/components/layout/data/sidebar-data.ts` - 静态菜单配置

**组件特点：**
- 使用 shadcn/ui 的 Sheet 组件
- 支持嵌套菜单（最多 2 级）
- 支持图标显示
- 支持暗色模式

### 现有权限系统分析

**数据模型：**
```prisma
model Permission {
  id          String   @id @default(cuid())
  name        String   @unique
  code        String   @unique
  description String?
  type        String   // menu, button, data
  parentId    String?
  status      Int      @default(1)
  roles       Role[]
  menus       Menu[]
}

model Menu {
  id        String   @id @default(cuid())
  path      String   @unique
  name      String
  icon      String?
  parentId  String?
  sort      Int      @default(0)
  enabled   Boolean  @default(true)
  permissions Permission[]
}

model Role {
  id              String   @id @default(cuid())
  name            String
  code            String   @unique
  description     String?
  type            String   @default("system")
  dataScope       String   @default("all") // all, department, department_and_sub, custom, self
  dataScopeDeptIds String?
  status          String   @default("ACTIVE")
}
```

**权限类型：**
- `menu`: 菜单权限（能否访问页面）
- `button`: 按钮权限（增删改查按钮）
- `data`: 数据权限（查看范围）

**数据权限范围：**
- `all`: 全部数据
- `department`: 本部门数据
- `department_and_sub`: 本部门及下级部门数据
- `custom`: 自定义部门数据
- `self`: 仅本人数据

### 客户与联系人关系

**业务逻辑：**
- 联系人是客户的潜质（先有联系人）
- 经过跟进后转化为正式客户
- 客户是最重要的核心概念

**数据模型：**
```prisma
model Customer {
  id            String   @id @default(cuid())
  name          String   // 公司名称
  shortName     String?
  customerLevel String   @default("LEAD") // LEAD, PROSPECT, CUSTOMER, VIP
  contacts      CustomerContact[]
}

model Contact {
  id     String   @id @default(cuid())
  name   String
  phone  String   @unique
  status String   @default("ACTIVE")
}

model CustomerContact {
  id         String   @id @default(cuid())
  customerId String
  contactId  String
  isPrimary  Boolean  @default(false)
  isDecision Boolean  @default(false)
}
```

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| （待决策） | - |

## Issues to Address
| Issue | Description | Priority |
|-------|-------------|----------|
| 菜单 UI 过时 | 视觉设计不够现代化，用户体验差 | High |
| 菜单数据硬编码 | 菜单配置在前端静态文件中，无法动态管理 | High |
| 客户位置不合理 | 客户作为核心概念，应放在更显眼的位置 | Medium |
| 权限关联不完整 | 角色-权限-菜单的关联未完全实现 | High |
| 数据权限未生效 | dataScope 配置存在但前端未使用 | Medium |

## Resources
- shadcn/ui 组件库: https://ui.shadcn.com/
- 现有菜单配置: `frontend/src/components/layout/data/sidebar-data.ts`
- 权限数据模型: `backend/prisma/schema.prisma`
- 菜单组件: `frontend/src/components/ui/sidebar.tsx`

---

# UI/UX 设计方案（修订版）

## 品牌色系统

基于项目 `theme.css` 的实际颜色：

```css
/* 主色 - 深蓝紫色 */
--primary: oklch(0.208 0.042 265.755);    /* 深靛蓝 */
--primary-foreground: oklch(0.984 0.003 247.858);

/* 强调色 - 蓝紫色 */
--ring: oklch(0.704 0.04 256.788);       /* 中等蓝紫色 */
--secondary: oklch(0.968 0.007 247.896);

/* 暗色模式 */
.dark --primary: oklch(0.929 0.013 255.508);  /* 反转为浅色 */
```

**设计语言定位**：专业、简约、企业级 SCRM 系统

---

## 一、现有问题分析

### 1.1 视觉问题
| 问题 | 描述 |
|------|------|
| 层级不清晰 | 菜单项视觉权重相同，难以区分主次 |
| 缺乏视觉引导 | 客户作为核心概念，没有特殊视觉处理 |
| 交互反馈弱 | hover 状态过渡效果平淡 |
| 色彩单一 | 仅使用背景色区分，缺乏品牌色点缀 |

### 1.2 交互问题
| 问题 | 描述 |
|------|------|
| 折叠状态体验差 | 收起后仅显示图标，tooltip 显示不够直观 |
| 无快捷搜索 | 菜单项较多时，查找困难 |
| 无常用功能固定 | 无法将常用菜单项固定在顶部 |

## 二、新设计方案

### 2.1 设计理念

**核心原则**：在现有 shadcn/ui Sidebar 基础上进行**渐进式增强**，而非推倒重来。

- **最小化变更**：复用现有组件结构
- **品牌一致性**：使用项目主色 `oklch(0.208 0.042 265.755)`
- **渐进增强**：新增功能通过 CSS 类和可选属性实现
- **向后兼容**：现有菜单数据结构无需大改

### 2.2 菜单结构重组（已根据产品需求调整）

**设计原则：客户优先 + 扁平化**

基于产品需求分析，客户管理应提升为顶级菜单（非嵌套），减少层级提升效率：

```
┌─────────────────────────────────────┐
│  [Logo]  企智通 SCRM    [角色标签]   │  ← Header + 角色显示
├─────────────────────────────────────┤
│ 🔍 搜索菜单...          [⌘K]        │  ← 搜索栏（全局快捷键）
├─────────────────────────────────────┤
│                                     │
│ 📊 工作台                           │  ← 首页入口（所有角色）
│                                     │
│ ═══ 客户 ═══                        │  ← 顶级菜单：突出核心概念
│   🏢 客户管理       [12 待处理]      │  ← 主色调强调 + 徽章
│   👤 联系人管理    [潜质]            │  ← 转化标签
│   📋 跟进记录                        │  ← 新增：交互历史
│   💼 服务团队                        │
│                                     │
│ ═══ 合同 ═══                        │  ← 顶级菜单：销售+财务
│   📝 合同管理       [3 待审批]       │
│   📄 合同模板      [管理员]          │  ← 权限标识
│                                     │
│ ═══ 财务 ═══                        │  ← 顶级菜单：财务为主
│   💰 收款管理                        │
│   🧾 发票管理                        │
│   🏦 支付账户      [管理员]          │
│                                     │
│ ═══ 产品 ═══                        │  ← 顶级菜单：管理员配置
│   📦 产品管理                        │
│   🏷️ 定价规则      [管理员]          │
│                                     │
│ ═══ 营销 ═══                        │  ← 顶级菜单：运营+销售
│   📰 文章管理                        │
│   📋 案例展示                        │
│   🌐 新媒体管理                      │
│                                     │
│ ═══ 系统 ═══            [▼]        │  ← 可折叠（仅管理员）
│   👥 用户管理                        │
│   🏢 部门管理                        │
│   🔐 角色权限                        │
│   ⚙️ 客户规则                        │
│   🔗 Webhook配置                     │
│   📊 日志管理        [▼]            │
│      📝 登录日志                     │
│      ⚡ 操作日志                     │
│      🖥️ 系统日志                     │
│                                     │
├─────────────────────────────────────┤
│  [头像] 管理员      [⚙️ 设置]       │  ← 底部用户信息
└─────────────────────────────────────┘
```

**与原设计的关键变化：**
1. **客户成为顶级菜单**：从"销售管理"子菜单提升为独立一级菜单
2. **扁平化结构**：合同、财务、产品、营销均提升为顶级，减少点击层级
3. **角色权限标识**：管理员专用菜单显示 `[管理员]` 标签
4. **新增跟进记录**：体现客户生命周期管理
5. **徽章显示待办数量**：如 `[12 待处理]`、`[3 待审批]`

### 2.2 组件结构设计

```
frontend/src/components/layout/
├── app-sidebar.tsx           # 主容器
├── sidebar-header.tsx        # 头部：Logo + 标题
├── sidebar-search.tsx        # 搜索框（新增）
├── sidebar-section.tsx       # 分组容器（新增）
├── sidebar-nav-item.tsx      # 导航项（新增）
├── sidebar-user-profile.tsx  # 底部用户信息（新增）
└── data/
    └── sidebar-data.ts       # 静态配置（后续改为动态）
```

### 2.3 样式变量设计

```css
/* sidebar-theme.css - 新增 */

/* 菜单宽度 */
--sidebar-width-expanded: 280px;
--sidebar-width-collapsed: 72px;
--sidebar-transition: 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* 菜单项尺寸 */
--nav-item-height: 44px;
--nav-item-padding-x: 16px;
--nav-item-border-radius: 8px;

/* 视觉层级 */
--nav-item-gap: 4px;
--section-gap: 16px;
--section-title-height: 32px;

/* 品牌色强调 */
--sidebar-accent-primary: oklch(0.55 0.22 265);  /* 品牌紫色 */
--sidebar-accent-secondary: oklch(0.65 0.15 200); /* 辅助蓝色 */

/* 状态颜色 */
--nav-item-active-bg: oklch(0.95 0.02 265);
--nav-item-active-text: oklch(0.45 0.20 265);
--nav-item-hover-bg: oklch(0.98 0.01 265);

/* 客户中心特殊样式 */
--customer-section-bg: oklch(0.55 0.22 265 / 0.08);
--customer-section-border: oklch(0.55 0.22 265 / 0.2);
```

### 2.4 交互设计

#### 2.4.1 展开/收起交互

| 状态 | 宽度 | 行为 |
|------|------|------|
| 展开态 | 280px | 显示完整文字、图标、徽章 |
| 过渡态 | 变化中 | 文字淡出 → 宽度收缩 → 图标居中 |
| 收起态 | 72px | 仅显示图标，hover 显示 Tooltip |

**动画曲线：** `cubic-bezier(0.4, 0, 0.2, 1)` - Material 标准

#### 2.4.2 搜索交互

```
┌─────────────────────────────────┐
│ 🔍 搜索菜单...         [/]      │  ← 搜索框（可切换展开/收起）
└─────────────────────────────────┘
         ↓ [输入中]
┌─────────────────────────────────┐
│ 🔍 客户                          │  ← 搜索结果下拉
│   /customers                     │
├─────────────────────────────────┤
│ 🔍 客户规则                      │
│   /customer-rules                │
└─────────────────────────────────┘
```

**快捷键：** `Cmd/Ctrl + K` 全局呼出搜索

#### 2.4.3 菜单项状态

```tsx
// 状态枚举
type NavItemState = 'idle' | 'hover' | 'active' | 'disabled';

// 视觉表现
const itemStyles = {
  idle: {
    bg: 'transparent',
    text: 'var(--sidebar-foreground)',
    iconOpacity: 0.7,
  },
  hover: {
    bg: 'var(--nav-item-hover-bg)',
    text: 'var(--sidebar-foreground)',
    iconOpacity: 1,
    transform: 'translateX(4px)',  // 微动效果
  },
  active: {
    bg: 'var(--nav-item-active-bg)',
    text: 'var(--nav-item-active-text)',
    iconOpacity: 1,
    leftBorder: '3px solid var(--sidebar-accent-primary)',  // 左边条指示
  },
  disabled: {
    bg: 'transparent',
    text: 'var(--muted-foreground)',
    iconOpacity: 0.4,
    cursor: 'not-allowed',
  },
};
```

### 2.5 客户中心特殊设计

**设计意图：** 突出客户作为核心概念的重要性

```tsx
// 客户分组特殊样式（顶级菜单）
<SidebarSection
  variant="customer"  // 特殊变体
  title="客户"
  icon={BuildingIcon}
  badge="12"  // 待处理客户数
>
  <NavItem
    title="客户管理"
    url="/customers"
    icon={Building}
    variant="primary"  // 主色调强调
    badgeType="pending"
  />
  <NavItem
    title="联系人管理"
    url="/contacts"
    icon={UserCircle}
    badge="潜质"  // 显示转化关系
    badgeType="label"
  />
  <NavItem
    title="跟进记录"
    url="/follow-ups"
    icon={MessageSquare}
  />
  <NavItem
    title="服务团队"
    url="/service-teams"
    icon={Users}
  />
</SidebarSection>
```

**视觉效果：**
- 容器背景：淡淡的品牌色（`oklch(0.55 0.22 265 / 0.08)`）
- 顶部边框：品牌色线条强调（3px）
- 图标：稍大尺寸（20px vs 16px）
- 联系人项：右下角小标签"潜质"，视觉上与客户管理关联

### 2.6 客户生命周期视觉设计

基于产品需求，客户等级需要在界面上清晰区分：

```tsx
// 客户等级视觉规范
const customerLevelStyles = {
  LEAD: {
    label: '线索',
    color: 'oklch(0.65 0.15 200)',  // 蓝色
    bg: 'oklch(0.65 0.15 200 / 0.1)',
    icon: '🔍',  // 搜索图标
  },
  PROSPECT: {
    label: '意向',
    color: 'oklch(0.70 0.15 120)',  // 绿色
    bg: 'oklch(0.70 0.15 120 / 0.1)',
    icon: '🎯',  // 目标图标
  },
  CUSTOMER: {
    label: '正式',
    color: 'oklch(0.55 0.20 265)',  // 紫色
    bg: 'oklch(0.55 0.20 265 / 0.1)',
    icon: '🤝',  // 握手图标
  },
  VIP: {
    label: 'VIP',
    color: 'oklch(0.65 0.20 45)',   // 金色
    bg: 'oklch(0.65 0.20 45 / 0.15)',
    icon: '👑',  // 皇冠图标
  },
};
```

**菜单中的体现：**
- 徽章颜色根据客户等级动态变化
- 待处理数量按等级优先级排序（VIP > 正式 > 意向 > 线索）

### 2.7 角色差异化设计

不同角色看到的菜单应该不同：

```tsx
// 角色菜单配置示例
const roleMenus = {
  SALE: [
    '工作台', '客户', '合同', '产品', '营销',
  ],
  SALE_MANAGER: [
    '工作台', '客户', '合同', '产品', '营销',
  ],
  FINANCE: [
    '工作台', '合同', '财务',
  ],
  ADMIN: [
    '工作台', '客户', '合同', '财务', '产品', '营销', '系统',
  ],
};

// 只读菜单项样式（如销售看财务数据）
const readonlyStyles = {
  opacity: 0.6,
  cursor: 'not-allowed',
  after: {
    content: '"👁️ 只读"',
    fontSize: '10px',
    marginLeft: '4px',
  },
};
```

### 2.8 响应式设计

| 断点 | 宽度 | 行为 |
|------|------|------|
| < 768px | - | 抽屉式侧边栏（Sheet 组件） |
| 768px - 1024px | 72px | 默认收起，hover 展开 |
| > 1024px | 280px | 默认展开，可手动收起 |

### 2.9 暗色模式适配

```css
/* 暗色模式调整 */
.dark {
  --nav-item-active-bg: oklch(0.3 0.04 265);
  --nav-item-active-text: oklch(0.95 0.01 265);
  --nav-item-hover-bg: oklch(0.25 0.02 265);
  --customer-section-bg: oklch(0.55 0.22 265 / 0.12);
  --customer-section-border: oklch(0.55 0.22 265 / 0.3);
}
```

**原则：**
- 暗色模式下增加对比度
- 品牌色饱和度略微降低
- 保持视觉层级一致性

## 三、样式变量设计（基于实际品牌色）

```css
/* 菜单特定样式变量 */
:root {
  /* 菜单宽度（保持现有设计） */
  --sidebar-width: 16rem;
  --sidebar-width-mobile: 18rem;
  --sidebar-width-icon: 3rem;

  /* 菜单项尺寸 */
  --nav-item-height: 2.5rem;
  --nav-item-padding: 0.5rem 0.75rem;
  --nav-item-border-radius: 0.375rem;

  /* 客户中心强调样式（使用主色） */
  --customer-accent-bg: oklch(0.208 0.042 265.755 / 0.08);
  --customer-accent-border: oklch(0.208 0.042 265.755 / 0.2);
  --customer-accent-text: oklch(0.208 0.042 265.755);

  /* 潜质标签样式 */
  --prospect-badge-bg: oklch(0.95 0.01 130);
  --prospect-badge-text: oklch(0.5 0.08 130);

  /* 过渡动画 */
  --sidebar-transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 暗色模式 */
.dark {
  --customer-accent-bg: oklch(0.929 0.013 255.508 / 0.15);
  --customer-accent-border: oklch(0.929 0.013 255.508 / 0.3);
  --customer-accent-text: oklch(0.929 0.013 255.508);
  --prospect-badge-bg: oklch(0.25 0.05 130);
  --prospect-badge-text: oklch(0.85 0.02 130);
}
```

---

## 四、新增组件规格

### 3.1 SidebarSearch（搜索组件）

```tsx
interface SidebarSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  shortcut?: string;  // 默认 "⌘K"
  // 新增：权限过滤
  accessibleMenus?: NavItem[];  // 仅搜索有权限的菜单
}

// 搜索结果类型
interface SearchResult {
  title: string;
  url: string;
  icon?: React.ComponentType;
  category?: string;  // 所属分组：客户/合同/财务等
  shortcut?: string;  // 快捷键提示
}
```

### 3.2 SidebarSection（分组组件）

```tsx
interface SidebarSectionProps {
  title: string;
  icon?: React.ComponentType;
  variant?: 'default' | 'customer' | 'contract' | 'finance' | 'system' | 'collapsible';
  badge?: string | number;
  // 新增：角色权限控制
  roles?: string[];  // 允许访问的角色，空数组表示所有角色
  adminOnly?: boolean;  // 是否仅管理员可见
  collapsible?: boolean;  // 是否可折叠
  defaultOpen?: boolean;  // 默认展开状态
  children: React.ReactNode;
}
```

### 3.3 NavItem（导航项组件）

```tsx
interface NavItemProps {
  title: string;
  url: string;
  icon: React.ComponentType;
  badge?: string | number;
  badgeType?: 'count' | 'label' | 'pending';  // 徽章类型
  variant?: 'default' | 'primary' | 'accent';
  arrow?: 'up' | 'down' | 'left' | 'right';
  disabled?: boolean;
  // 新增：权限控制
  permission?: string;  // 所需权限代码
  roles?: string[];  // 允许访问的角色
  adminOnly?: boolean;  // 是否仅管理员可见
  readonly?: boolean;  // 只读模式（如财务数据对销售只读）
  // 新增：客户生命周期标识
  customerLevel?: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'VIP';  // 客户等级
}
```

### 3.4 RoleBadge（角色徽章组件-新增）

```tsx
// 显示当前用户角色的徽章
interface RoleBadgeProps {
  role: {
    code: string;
    name: string;
    type: 'system' | 'custom';
  };
  variant?: 'default' | 'admin' | 'sale' | 'finance';
}
```

### 3.5 PermissionGuard（权限守卫组件-新增）

```tsx
// 根据权限条件渲染菜单项
interface PermissionGuardProps {
  permissions?: string[];  // 需要的权限列表
  roles?: string[];  // 需要的角色列表
  dataScope?: string;  // 数据权限范围
  fallback?: React.ReactNode;  // 无权限时的显示内容
  children: React.ReactNode;
}

// 使用示例
<PermissionGuard permissions={['customer.view']}>
  <NavItem title="客户管理" url="/customers" icon={Building} />
</PermissionGuard>
```

## 五、客户中心增强设计

### 5.1 客户分组特殊样式

在现有 `NavGroup` 基础上，新增 `variant="customer"` 属性：

```tsx
// sidebar-data.ts 新增结构
{
  title: "客户中心",
  variant: "customer",  // 新增：特殊变体标识
  items: [
    {
      title: "客户管理",
      url: "/customers",
      icon: Building,
      variant: "primary",  // 主色强调
    },
    {
      title: "联系人管理",
      url: "/contacts",
      icon: UserCircle,
      badge: { text: "潜质", variant: "prospect" },  // 特殊徽章
    },
    // ...
  ]
}
```

### 5.2 潜质标签设计

```css
/* 潜质标签样式 */
.badge-prospect {
  background: oklch(0.95 0.01 130);  /* 淡绿色背景 */
  color: oklch(0.5 0.08 130);        /* 深绿色文字 */
  font-size: 0.65rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.badge-prospect::before {
  content: "→";
  margin-right: 0.125rem;
  color: oklch(0.208 0.042 265.755);  /* 主色箭头 */
}
```

---

## 六、实施计划（渐进式）

```css
/* 过渡动画 */
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 菜单项入场 */
.nav-item {
  animation: slideIn 0.2s ease-out backwards;
}

.nav-item:nth-child(1) { animation-delay: 0ms; }
.nav-item:nth-child(2) { animation-delay: 25ms; }
.nav-item:nth-child(3) { animation-delay: 50ms; }
/* ...以此类推 */

/* 徽章脉冲提醒 */
.nav-badge.has-news {
  animation: pulse 2s ease-in-out infinite;
}
```

## 五、实施计划（对齐产品需求 P0）

### 阶段一：P0 MVP 核心功能（3-4天）

**后端任务：**
1. 菜单 API 开发（CRUD + 权限过滤）
2. 角色与菜单权限关联实现
3. 客户管理顶级菜单数据迁移
4. 数据权限中间件实现

**前端任务：**
1. 创建新组件结构（SidebarSection、NavItem、PermissionGuard）
2. 前端动态菜单加载（对接后端 API）
3. 客户顶级菜单样式实现
4. 角色权限过滤逻辑

### 阶段二：P1 视觉与体验优化（2-3天）

**视觉升级：**
1. 客户分组特殊样式（品牌色背景、边框强调）
2. 客户生命周期徽章（LEAD/PROSPECT/CUSTOMER/VIP）
3. 菜单项交互动画（hover、active 状态）
4. 暗色模式适配

**体验优化：**
1. 数据权限生效（只读标识）
2. 角色预设模板
3. 菜单加载骨架屏

### 阶段三：P2 增强功能（2-3天）

**功能增强：**
1. 菜单搜索（Cmd+K 快捷键）
2. 常用菜单收藏/固定
3. 菜单个性化排序
4. 待办数量徽章实时更新

### 里程碑验收标准

| 阶段 | 验收标准 |
|------|----------|
| P0 | 菜单可通过后台管理、不同角色看到不同菜单、客户管理位于顶级菜单 |
| P1 | 菜单 UI 优化完成、数据权限生效、角色预设模板可用 |
| P2 | 搜索功能可用、支持收藏、菜单可个性化排序 |

## 六、参考设计

### 设计参考
- **shadcn/ui Sidebar**: 本项目已使用，保留其优秀特性（状态持久化、响应式、快捷键）
- **Linear**: 流畅的侧边栏动画参考
- **Notion**: 清晰的分组层级参考

### 与现有设计的兼容性
| 现有特性 | 处理方式 |
|---------|---------|
| shadcn/ui Sidebar 组件 | 完全保留，仅扩展样式 |
| Cookie 状态持久化 | 保持不变 |
| Cmd+B 切换快捷键 | 保持不变 |
| 响应式（移动端 Sheet） | 保持不变 |
| Collapsible 折叠菜单 | 保持不变 |

### 新增/变更点
1. **数据结构**：`sidebar-data.ts` 添加 `variant`、`badge` 可选属性
2. **CSS 变量**：新增客户中心相关变量
3. **类型定义**：`types.ts` 扩展支持新属性
4. **组件逻辑**：`nav-group.tsx` 添加 variant 渲染逻辑

---

# 产品需求分析

## 1. 用户角色分析

### 1.1 系统角色定义

基于代码分析，系统包含以下角色：

| 角色代码 | 角色名称 | 主要职责 | 数据权限建议 |
|---------|---------|---------|-------------|
| `SUPER_ADMIN` | 超级管理员 | 系统全权限管理 | 全部数据 |
| `SALE` | 销售人员 | 联系人跟进、客户转化 | 本人数据 |
| `SALE_MANAGER` | 销售经理 | 销售团队管理 | 本部门及下级 |
| `FINANCE` | 财务人员 | 发票、收款管理 | 全部数据 |
| `OUTWORK` | 外勤人员 | 客户现场服务 | 本人数据 |
| `ADMIN` | 系统管理员 | 用户、角色、配置管理 | 全部数据 |

### 1.2 用户场景分析

**销售场景：**
- 日常工作：查看工作台待办 → 跟进联系人 → 转化为客户 → 签订合同
- 高频使用：联系人管理、客户管理、跟进记录

**财务场景：**
- 日常工作：查看收款进度 → 开具发票 → 确认收款
- 高频使用：合同管理、发票管理、收款管理

**管理员场景：**
- 日常工作：系统配置、用户管理、数据统计
- 高频使用：系统设置、工作台统计

## 2. 客户生命周期分析

### 2.1 客户等级定义

| 等级 | 代码 | 含义 | 转化条件 |
|-----|------|------|---------|
| 线索 | `LEAD` | 初步接触的公司 | 首次添加 |
| 意向 | `PROSPECT` | 有明确需求 | 有效沟通 3 次 |
| 正式 | `CUSTOMER` | 已签约客户 | 签订合同 |
| VIP | `VIP` | 高价值客户 | 年消费 > 阈值 |

### 2.2 业务流程

```
联系人 → 跟进记录 → 客户(LEAD) → 客户(PROSPECT) → 合同 → 客户(CUSTOMER) → 服务团队
```

## 3. 菜单信息架构设计

### 3.1 设计原则

1. **以客户为中心**：客户管理应作为顶级入口，而非嵌套在销售管理下
2. **角色差异化**：不同角色看到不同菜单
3. **符合业务流程**：菜单顺序遵循用户日常工作流
4. **减少层级**：最多 2 级菜单，提升操作效率

### 3.2 推荐菜单结构

```
一级菜单（通用）
├── 工作台 (Dashboard)           - 所有角色
│
├── 客户 (Customers)             - 销售为主，管理员可见
│   ├── 客户管理                 - 核心功能
│   ├── 联系人管理               - 潜在客户池
│   ├── 跟进记录                 - 交互历史
│   └── 服务团队                 - 客户服务配置
│
├── 合同 (Contracts)             - 销售、财务
│   ├── 合同管理
│   └── 合同模板设置             - 管理员
│
├── 财务 (Finance)               - 财务为主，销售只读
│   ├── 收款管理
│   ├── 发票管理
│   └── 支付账户设置             - 管理员
│
├── 产品 (Products)              - 管理员、销售
│   ├── 产品管理
│   └── 定价规则                 - 管理员
│
├── 营销 (Marketing)             - 运营、销售
│   ├── 文章管理
│   ├── 案例展示
│   └── 新媒体管理
│
└── 系统 (System)                - 管理员
    ├── 用户管理
    ├── 部门管理
    ├── 角色权限
    ├── 客户规则
    ├── Webhook配置
    └── 日志管理
```

### 3.3 角色菜单映射

| 菜单 | 销售 | 销售经理 | 财务 | 管理员 |
|-----|------|---------|------|-------|
| 工作台 | ✅ | ✅ | ✅ | ✅ |
| 客户管理 | ✅ | ✅ | ❌ | ✅ |
| 联系人管理 | ✅ | ✅ | ❌ | ✅ |
| 合同管理 | ✅ | ✅ | ✅ | ✅ |
| 收款管理 | 只读 | 只读 | ✅ | ✅ |
| 发票管理 | ❌ | ❌ | ✅ | ✅ |
| 系统设置 | ❌ | ❌ | ❌ | ✅ |

## 4. 菜单权限需求

### 4.1 功能权限

| 模块 | 权限代码 | 说明 |
|-----|---------|------|
| 客户 | `customer.view` | 查看客户列表 |
| 客户 | `customer.create` | 新增客户 |
| 客户 | `customer.update` | 编辑客户 |
| 客户 | `customer.delete` | 删除客户 |
| 客户 | `customer.export` | 导出客户数据 |
| 联系人 | `contact.view` | 查看联系人 |
| 联系人 | `contact.create` | 新增联系人 |
| 联系人 | `contact.update` | 编辑联系人 |
| 联系人 | `contact.delete` | 删除联系人 |
| 合同 | `contract.view` | 查看合同 |
| 合同 | `contract.create` | 创建合同 |
| 合同 | `contract.approve` | 审批合同 |
| 发票 | `invoice.view` | 查看发票 |
| 发票 | `invoice.create` | 开具发票 |
| 收款 | `payment.view` | 查看收款 |
| 收款 | `payment.confirm` | 确认收款 |
| 系统 | `system.user` | 用户管理 |
| 系统 | `system.role` | 角色管理 |
| 系统 | `system.config` | 系统配置 |

### 4.2 数据权限

| 数据范围 | 说明 | 适用角色 |
|---------|------|---------|
| 全部 | 可查看所有数据 | 超级管理员、财务 |
| 本部门 | 只能查看本部门数据 | 销售经理 |
| 本部门及下级 | 查看本部门及下级部门数据 | 销售总监 |
| 自定义 | 查看指定部门数据 | - |
| 仅本人 | 只能查看自己的数据 | 销售、外勤 |

## 5. 用户故事

### 5.1 销售人员

**故事 1：快速跟进潜在客户**
> 作为销售人员，我希望能在工作台快速看到今天需要跟进的联系人，这样我就不会错过任何商机。

**验收标准：**
- 工作台显示今日待跟进联系人列表
- 显示联系人名称、公司、上次跟进时间
- 点击可快速跳转到联系人详情

**故事 2：客户转化可视化**
> 作为销售人员，我希望清楚地看到客户从线索到签约的全过程，这样我可以针对性地制定跟进策略。

**验收标准：**
- 客户列表显示客户等级（线索/意向/正式/VIP）
- 显示当前跟进阶段
- 显示合同状态

### 5.2 财务人员

**故事 1：收款进度跟踪**
> 作为财务人员，我希望一目了然地看到哪些合同已收款、哪些待收款，这样我可以及时跟进催款。

**验收标准：**
- 合同列表显示收款进度
- 待收款合同优先展示
- 支持按收款状态筛选

### 5.3 管理员

**故事 1：灵活配置菜单**
> 作为系统管理员，我希望可以根据不同角色配置不同的菜单，这样不同职位的员工只能看到自己需要的功能。

**验收标准：**
- 支持为角色分配菜单权限
- 用户登录后只显示有权限的菜单
- 菜单配置实时生效

## 6. 优先级排序

### P0 - 必须有（MVP）
1. 菜单后端 API（增删改查）
2. 角色与菜单权限关联
3. 前端动态菜单加载
4. 客户管理作为顶级菜单

### P1 - 应该有
1. 菜单 UI 优化
2. 数据权限生效
3. 角色预设模板

### P2 - 可以有
1. 菜单个性化排序
2. 常用菜单收藏
3. 菜单搜索功能

## 7. 验收标准

1. **功能验收**
   - [ ] 菜单可通过后台管理
   - [ ] 不同角色看到不同菜单
   - [ ] 客户管理位于顶级菜单
   - [ ] 菜单权限与后端 API 权限一致

2. **性能验收**
   - [ ] 菜单加载时间 < 500ms
   - [ ] 菜单切换无卡顿

3. **可用性验收**
   - [ ] 菜单层级不超过 2 级
   - [ ] 菜单项命名清晰易懂
   - [ ] 支持键盘快捷键导航

---

# 后端 API 设计

## 1. 数据模型扩展

### 1.1 现有 Menu 模型分析

```prisma
model Menu {
  id        String   @id @default(cuid())
  path      String   @unique     // 路由路径 (如: /customers)
  name      String                // 菜单名称
  icon      String?               // 图标名称 (lucide-react)
  parentId  String?               // 父级菜单ID
  sort      Int      @default(0)  // 排序
  enabled   Boolean  @default(true) // 是否启用
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  parent    Menu?             @relation("MenuHierarchy")
  children  Menu[]            @relation("MenuHierarchy")
  permissions Permission[]    @relation("MenuPermissions")
}
```

### 1.2 需要扩展的字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `groupTitle` | String? | 菜单分组标题（业务、系统设置等） |
| `i18nKey` | String? | 国际化 key（如 `menu.customer.title`） |
| `badge` | String? | 徽章/角标（如通知数量） |
| `isHidden` | Boolean | 是否隐藏（保留但不在菜单显示） |
| `isSystem` | Boolean | 是否系统菜单（不可删除） |

## 2. API 端点设计

### 2.1 菜单管理 CRUD

```typescript
// 基础路径: /api/menus

/**
 * 获取用户菜单树（前端侧边栏用）- P0
 * GET /menus/user
 * Response: MenuGroup[]
 */
interface MenuGroup {
  title: string;
  i18nKey?: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  path: string;
  title: string;
  i18nKey?: string;
  icon?: string;
  badge?: string | number;
  items?: MenuItem[];
}

/**
 * 获取菜单树（管理员用）- P1
 * GET /menus/tree?includeDisabled=true
 * Response: MenuTreeItem[]
 */

/**
 * 创建菜单 - P2
 * POST /menus
 */

/**
 * 更新菜单 - P1
 * PUT /menus/:id
 */

/**
 * 删除菜单 - P2
 * DELETE /menus/:id
 */

/**
 * 批量更新排序 - P1
 * PUT /menus/reorder
 */
```

### 2.2 角色-菜单关联

```typescript
/**
 * 为角色分配菜单 - P2
 * PUT /roles/:roleId/menus
 * Body: { menuIds: string[] }
 */

/**
 * 获取角色的菜单列表
 * GET /roles/:roleId/menus
 */
```

### 2.3 菜单初始化

```typescript
/**
 * 初始化默认菜单数据 - P0
 * POST /menus/initialize
 * Body: { force?: boolean }
 */
```

### 2.4 角色菜单权限映射

根据产品需求，不同角色看到不同菜单：

| 菜单分组 | 菜单 | SALE | SALE_MANAGER | FINANCE | OUTWORK | ADMIN |
|---------|-----|------|--------------|---------|---------|-------|
| (无) | 工作台 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 客户 | 客户管理 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 客户 | 联系人管理 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 客户 | 跟进记录 | ✅ | ✅ | ❌ | ✅ | ✅ |
| 客户 | 服务团队 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 合同 | 合同管理 | ✅ | ✅ | ✅ | ❌ | ✅ |
| 财务 | 发票管理 | ❌ | ❌ | ✅ | ❌ | ✅ |
| 财务 | 收款管理 | 只读 | 只读 | ✅ | ❌ | ✅ |
| 产品 | 产品管理 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 营销 | 文章/新媒体 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 系统设置 | 全部 | ❌ | ❌ | ❌ | ❌ | ✅ |

**说明**：
- ✅ = 完全访问
- ❌ = 不显示
- 只读 = 可查看但不能编辑
- 系统设置分组仅 ADMIN 角色可见

## 3. 用户菜单过滤逻辑

```typescript
async function getUserMenus(userId: string): Promise<MenuGroup[]> {
  // 1. 获取用户权限
  const { permissions } = await permissionService.getUserPermissions(userId);
  
  // 2. 获取所有启用的菜单
  const menus = await prisma.menu.findMany({
    where: { enabled: true, isHidden: false },
    include: { permissions: true },
    orderBy: [{ groupTitle: 'asc' }, { sort: 'asc' }]
  });
  
  // 3. 过滤有权限的菜单
  const accessibleMenus = menus.filter(menu => {
    if (!menu.permissions?.length) return true;
    return menu.permissions.some(p => permissions.includes(p.code));
  });
  
  // 4. 构建树形并分组返回
  return buildMenuTree(accessibleMenus);
}
```

## 4. 菜单初始化数据（根据产品需求更新）

**核心变化：客户管理提升为顶级分组**

```typescript
const DEFAULT_MENUS = [
  // ========== 工作台（独立） ==========
  {
    path: '/',
    name: '工作台',
    icon: 'LayoutDashboard',
    groupTitle: null, // 独立菜单，不属于任何分组
    sort: 0,
    isSystem: true,
    i18nKey: 'menu.dashboard.title',
  },

  // ========== 客户（顶级分组 - P0 优先级）==========
  {
    path: '/customers',
    name: '客户管理',
    icon: 'Building',
    groupTitle: '客户',
    sort: 10,
    permission: 'customer.view',
    i18nKey: 'menu.customer.title',
  },
  {
    path: '/contacts',
    name: '联系人管理',
    icon: 'UserCircle',
    groupTitle: '客户',
    sort: 11,
    permission: 'contact.view',
    i18nKey: 'menu.contact.title',
  },
  {
    path: '/follow-records',
    name: '跟进记录',
    icon: 'ClipboardList',
    groupTitle: '客户',
    sort: 12,
    i18nKey: 'menu.followRecord.title',
  },
  {
    path: '/service-teams',
    name: '服务团队',
    icon: 'UsersRound',
    groupTitle: '客户',
    sort: 13,
    i18nKey: 'menu.serviceTeam.title',
  },

  // ========== 合同（顶级分组）==========
  {
    path: '/contracts',
    name: '合同管理',
    icon: 'FileCheck',
    groupTitle: '合同',
    sort: 20,
    permission: 'contract.view',
    i18nKey: 'menu.contract.title',
  },

  // ========== 财务（顶级分组）==========
  {
    path: '/invoices',
    name: '发票管理',
    icon: 'Receipt',
    groupTitle: '财务',
    sort: 30,
    permission: 'invoice.view',
    i18nKey: 'menu.invoice.title',
  },
  {
    path: '/payments',
    name: '收款管理',
    icon: 'Wallet',
    groupTitle: '财务',
    sort: 31,
    permission: 'payment.view',
    i18nKey: 'menu.payment.title',
  },

  // ========== 产品（顶级分组）==========
  {
    path: '/products',
    name: '产品管理',
    icon: 'Archive',
    groupTitle: '产品',
    sort: 40,
    permission: 'product.view',
    i18nKey: 'menu.product.title',
  },
  {
    path: '/pricing',
    name: '定价规则',
    icon: 'Sliders',
    groupTitle: '产品',
    sort: 41,
    permission: 'pricing.manage',
    i18nKey: 'menu.pricing.title',
  },

  // ========== 营销（顶级分组）==========
  {
    path: '/cms',
    name: '文章管理',
    icon: 'FileText',
    groupTitle: '营销',
    sort: 50,
    i18nKey: 'menu.cms.title',
  },
  {
    path: '/cms/pages',
    name: '页面管理',
    icon: 'Layout',
    groupTitle: '营销',
    sort: 51,
    i18nKey: 'menu.cmsPage.title',
  },
  {
    path: '/cms/tags',
    name: '标签管理',
    icon: 'Tag',
    groupTitle: '营销',
    sort: 52,
    i18nKey: 'menu.cmsTag.title',
  },
  {
    path: '/social-media',
    name: '新媒体管理',
    icon: 'Share2',
    groupTitle: '营销',
    sort: 53,
    i18nKey: 'menu.socialMedia.title',
  },

  // ========== 系统设置（顶级分组 - 仅管理员）==========
  {
    path: '/users',
    name: '用户管理',
    icon: 'Users',
    groupTitle: '系统设置',
    sort: 100,
    permission: 'system.user',
    i18nKey: 'menu.user.title',
  },
  {
    path: '/departments',
    name: '部门管理',
    icon: 'Building',
    groupTitle: '系统设置',
    sort: 101,
    permission: 'system.department',
    i18nKey: 'menu.department.title',
  },
  {
    path: '/roles',
    name: '角色管理',
    icon: 'ShieldCheck',
    groupTitle: '系统设置',
    sort: 102,
    permission: 'system.role',
    i18nKey: 'menu.role.title',
  },
  {
    path: '/permissions',
    name: '权限管理',
    icon: 'Lock',
    groupTitle: '系统设置',
    sort: 103,
    permission: 'system.config',
    i18nKey: 'menu.permission.title',
  },
  {
    path: '/customer-rules',
    name: '客户规则',
    icon: 'Sliders',
    groupTitle: '系统设置',
    sort: 104,
    i18nKey: 'menu.customerRule.title',
  },
  {
    path: '/webhooks',
    name: 'Webhook配置',
    icon: 'Webhook',
    groupTitle: '系统设置',
    sort: 105,
    i18nKey: 'menu.webhooks.title',
  },
  // 日志管理（子菜单）
  {
    path: '/login-logs',
    name: '登录日志',
    icon: 'History',
    groupTitle: '系统设置',
    sort: 110,
    i18nKey: 'menu.loginLog.title',
  },
  {
    path: '/operation-logs',
    name: '操作日志',
    icon: 'ClipboardList',
    groupTitle: '系统设置',
    sort: 111,
    i18nKey: 'menu.operationLog.title',
  },
  {
    path: '/system-logs',
    name: '系统日志',
    icon: 'Terminal',
    groupTitle: '系统设置',
    sort: 112,
    i18nKey: 'menu.systemLog.title',
  },
];
```

## 5. API 优先级

| 优先级 | 端点 | 描述 |
|-------|------|------|
| P0 | GET /menus/user | 前端侧边栏 |
| P0 | POST /menus/initialize | 初始化 |
| P1 | GET /menus/tree | 管理后台 |
| P1 | PUT /menus/:id | 更新菜单 |
| P1 | PUT /menus/reorder | 排序 |
| P2 | POST /menus | 创建 |
| P2 | DELETE /menus/:id | 删除 |
| P2 | PUT /roles/:roleId/menus | 权限关联 |

## 6. 国际化 Key 规范

```
menu.{module}.{property}
```

示例：`menu.customer.title`, `menu.sales.title`

---

# 前端菜单组件设计

## 一、现状分析

### 1.1 现有技术栈

| 组件/库 | 用途 |
|---------|------|
| `shadcn/ui` | UI 组件库（Sidebar、Collapsible、DropdownMenu） |
| `TanStack Router` | 路由管理（Link、useLocation） |
| `react-i18next` | 国际化 |
| `TanStack Query` | 数据获取（useQuery） |
| `lucide-react` | 图标库 |
| `Radix UI` | 底层无样式组件 |

### 1.2 现有组件架构

```
frontend/src/components/layout/
├── app-sidebar.tsx          # 侧边栏主组件（入口）
├── nav-group.tsx            # 菜单分组渲染组件
├── nav-user.tsx             # 侧边栏用户菜单
├── team-switcher.tsx        # 团队切换器
├── types.ts                 # 类型定义
└── data/
    └── sidebar-data.ts      # 硬编码的菜单数据（静态）

frontend/src/components/ui/
└── sidebar.tsx              # shadcn/ui Sidebar 基础组件（728行）

frontend/src/features/menus/hooks/
└── use-menu-tree.ts         # 菜单数据获取 Hook
```

### 1.3 核心组件职责

#### `app-sidebar.tsx`
- 当前使用**硬编码**的 `sidebarData`
- 调用 `NavGroup` 渲染各个菜单分组
- 集成 `TeamSwitcher` 和 `SidebarRail`

#### `nav-group.tsx`
- 处理单级菜单（`NavLink`）和多级菜单（`NavCollapsible`）
- 支持侧边栏折叠状态下的下拉菜单模式
- 实现路由高亮（`checkIsActive`）
- 支持徽章（Badge）显示

#### `sidebar.tsx` (shadcn/ui)
- 提供完整的 Sidebar 上下文系统
- 支持三种折叠模式：`offcanvas` | `icon` | `none`
- 支持三种变体：`inset` | `sidebar` | `floating`
- Cookie 持久化状态
- 响应式设计（移动端使用 Sheet）

### 1.4 现有问题

1. **数据源硬编码**：`sidebar-data.ts` 是静态数据，未与后端 API 关联
2. **重复定义**：菜单在前端静态定义，后端也存储了菜单结构
3. **权限未集成**：虽然后端有完整的 RBAC 权限系统，但前端菜单未做权限过滤
4. **图标映射缺失**：后端存储的 `icon` 字段是字符串，前端需要映射到 lucide-react 组件

---

## 二、后端 API 分析

### 2.1 菜单数据结构

```typescript
// 后端返回的 Menu 类型
interface MenuNode {
  id: string;
  path: string;        // 路由路径，如 "/customers"
  name: string;        // 菜单名称，如 "客户管理"
  icon?: string;       // 图标名称，如 "Building"
  parentId?: string;   // 父菜单 ID
  sort: number;        // 排序
  enabled: boolean;    // 是否启用
  createdAt: Date;
  updatedAt: Date;
  children?: MenuNode[];
  permissions?: Permission[];
}
```

### 2.2 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/permissions/menus` | GET | 获取当前用户的菜单树 |
| `/permissions/menus/:id` | GET | 获取菜单详情 |
| `/permissions/menus/:id` | PUT | 更新菜单 |
| `/permissions/menus/:id` | DELETE | 删除菜单 |

### 2.3 权限系统集成

后端已实现完整的 RBAC：
- `User` ↔ `UserRole` ↔ `Role` ↔ `RolePermission` ↔ `Permission`
- `Menu` ↔ `MenuPermission` ↔ `Permission`

但 **菜单 API 未过滤用户权限**，需要后端改进或在前端过滤。

---

## 三、新组件设计方案

### 3.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      AppSidebar                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SidebarProvider                         │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │         useMenuTree (React Query)            │    │   │
│  │  │         ↓                                    │    │   │
│  │  │         MenuTreeTransformer                 │    │   │
│  │  │         ↓                                    │    │   │
│  │  │         NavGroup (多个)                      │    │   │
│  │  │         ↓                                    │    │   │
│  │  │         NavItem / NavCollapsible             │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
frontend/src/features/menus/
├── components/
│   ├── app-menu.tsx              # 新的菜单入口组件
│   ├── menu-group.tsx            # 菜单分组组件（基于 nav-group 改造）
│   ├── menu-item.tsx             # 单个菜单项组件
│   └── menu-skeleton.tsx         # 加载骨架屏
├── hooks/
│   ├── use-menu-tree.ts          # 菜单数据获取（已存在，需增强）
│   ├── use-menu-permissions.ts   # 菜单权限过滤 Hook
│   └── use-menu-state.ts         # 菜单展开/收起状态管理
├── lib/
│   ├── icon-mapper.ts            # 图标名称 → lucide-react 组件映射
│   ├── menu-transformer.ts       # 后端数据 → 前端 NavGroup 格式转换
│   └── menu-utils.ts             # 菜单工具函数（高亮判断等）
└── types/
    └── menu.ts                   # 菜单相关类型定义
```

### 3.3 关键组件规格

#### icon-mapper.ts
- 将后端返回的图标字符串（如 "Building"）映射到 lucide-react 组件
- 支持未知图标的降级处理

#### menu-transformer.ts
- 将后端 MenuNode[] 转换为前端 NavGroup[]
- 实现分组逻辑（业务、财务、内容、系统等）
- 处理图标映射和排序

#### app-menu.tsx
- 使用 useMenuTree 获取数据
- 使用 transformMenuToNavGroups 转换数据
- 渲染 MenuGroup 列表
- 处理加载和错误状态

### 3.4 主题适配

现有 `sidebar.tsx` 已通过 CSS 变量支持亮色/暗色模式，新组件直接继承。

### 3.5 路由集成

使用 TanStack Router 的 `Link` 和 `useLocation` 实现路由高亮。

---

## 四、性能优化

### 4.1 数据缓存
- `staleTime: 5 * 60 * 1000` - 5 分钟内不重新请求
- `gcTime: 10 * 60 * 1000` - 10 分钟后垃圾回收

### 4.2 组件懒加载
- 权限模块按需加载

### 4.3 虚拟滚动（可选）
- 超大菜单使用 `react-window`

---

## 五、实施计划

### 阶段 1：基础数据层
1. 增强 `useMenuTree` Hook
2. 实现 `icon-mapper.ts`
3. 实现 `menu-transformer.ts`
4. 编写单元测试

### 阶段 2：组件开发
1. 创建 `app-menu.tsx`
2. 改造 `nav-group.tsx` 为 `menu-group.tsx`
3. 创建 `menu-skeleton.tsx`
4. 集成到 `app-sidebar.tsx`

### 阶段 3：权限集成
1. 实现 `use-menu-permissions.ts`
2. 添加权限过滤逻辑
3. 实现权限变更后的菜单刷新

### 阶段 4：优化与测试
1. 响应式设计验证
2. 暗色模式测试
3. 性能优化
4. 国际化文本迁移

---

## 六、开放问题

1. **后端菜单 API 是否需要按用户权限过滤？**
   - 建议：后端增加 `getUserMenuTree()` 接口

2. **菜单分组规则如何确定？**
   - 建议：后端增加 `group` 字段

3. **菜单顺序如何控制？**
   - 确认是否支持拖拽排序

4. **国际化如何处理？**
   - 建议：后端返回 `i18nKey`，前端使用 i18n 翻译

---

## 七、参考文件

| 文件 | 说明 |
|------|------|
| `frontend/src/components/ui/sidebar.tsx` | shadcn/ui Sidebar 组件（728行） |
| `frontend/src/components/layout/nav-group.tsx` | 菜单分组渲染逻辑 |
| `frontend/src/components/layout/types.ts` | NavItem、NavGroup 类型定义 |
| `frontend/src/features/menus/hooks/use-menu-tree.ts` | 菜单数据 Hook |
| `frontend/src/components/layout/data/sidebar-data.ts` | 当前硬编码菜单数据 |
| `backend/src/modules/permission/permission.service.ts` | 后端菜单树查询逻辑 |
