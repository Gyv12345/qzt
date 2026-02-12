# Task Plan: 菜单重构与权限系统升级
<!--
  WHAT: 重构菜单 UI/UX + 实现动态菜单权限管理
  WHY: 现有菜单体验差，权限数据需后台管理，菜单初始化数据应从后端获取
  WHEN: 2026-02-11
-->

## Goal
打造一个现代化、用户友好的菜单系统，实现：
- 重新设计菜单 UI/UX（视觉 + 交互）
- 客户模块放在合适位置（联系人是客户的潜质，先有联系人后有客户）
- 菜单数据完全由后台管理（初始化数据从数据库获取）
- 角色与权限完全关联（菜单权限 + 数据权限）
- 支持灵活的权限配置

## 2026-02-12 会话：菜单路由清理与种子数据

### 问题 1：菜单 404 问题
- **原因**：后端 `menu.service.ts` 中定义了 `/sales`、`/finance`、`/logs` 等虚拟父节点，但前端没有对应路由
- **解决**：删除这些 `hasChildren: true` 的虚拟父节点定义

### 问题 2：菜单 i18n 失效
- **原因**：后端 `mapToMenuItemDto` 没有返回 i18nKey，前端也没有使用 i18n 翻译
- **解决**：
  1. 后端：给每个菜单项添加独立的 i18nKey（如 `menu.sidebar.contacts`）
  2. 后端：`mapToMenuItemDto` 从 DEFAULT_MENUS 查找并返回 i18nKey
  3. 前端：`convertToNavGroups` 使用 `t(i18nKey)` 翻译
  4. 前端：添加 `menu.sidebar.*` 翻译 key

### 问题 3：migrations 文件被删除
- **原因**：`backend/prisma/migrations/` 目录下的 SQL 文件被删除
- **解决**：`git checkout 064d013 -- backend/prisma/migrations/` 恢复文件

### 问题 4：CMS 种子数据包含不需要的案例和团队成员
- **原因**：`seed.cms.ts` 包含案例（CASE_STUDY）和团队成员（PROFILE）
- **解决**：删除案例和团队成员部分，只保留文章和产品展示

---

## 决策记录

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-02-12 | 菜单配置不使用虚拟父节点 | 前端路由是平铺结构，父节点无实际路由会导致 404 |
| 2026-02-12 | 菜单 i18nKey 按颗粒度设计 | 分组用 `groupI18nKey`，菜单项用 `i18nKey` |
| 2026-02-12 | migrations 文件必须保留 | 记录数据库结构变更历史，不能删除 |

---

## 种子数据文件清单

| 文件 | 说明 | 执行方式 |
|------|------|---------|
| `scripts/seed.ts` | 主种子：部门、用户、角色、系统配置 | `npx ts-node scripts/seed.ts` |
| `scripts/seed-rules.ts` | 客户规则种子 | `npx ts-node scripts/seed-rules.ts` |
| `prisma/seed.cms.ts` | CMS 内容：标签、文章、产品展示 | `npx ts-node prisma/seed.cms.ts` |

**注意**：种子文件使用 `findUnique` + `create` 或 `upsert` 模式，可以安全地多次执行，不会重复创建数据。

## Team Structure
| 角色 | 负责项目 | 职责 | 状态 |
|------|----------|------|------|
| UI/UX 工程师 | 菜单设计 | 视觉设计、交互方案、组件设计 | ⏸️ 待启动 |
| 产品工程师 | 需求分析 | 业务流程、用户故事、优先级 | ⏸️ 待启动 |
| 后端工程师 | backend | 菜单 API、权限 API、数据权限 | ⏸️ 待启动 |
| 前端工程师 A | frontend | 菜单组件、权限组件 | ⏸️ 待启动 |
| 前端工程师 B | frontend | 客户/联系人模块调整 | ⏸️ 待启动 |

## Phases

### Phase 0: 需求分析与方案设计
- [x] 分析当前菜单痛点和用户体验问题
- [x] 设计新的菜单信息架构（客户模块位置）
- [x] 设计菜单 UI/UX 方案（视觉 + 交互）
- [x] 设计动态菜单数据模型
- [x] 设计权限关联方案（角色-权限-菜单）
- [x] 设计数据权限实现方案
- **Status:** complete

### Phase 1: 后端动态菜单 API（Backend Engineer 负责）
- [ ] 创建菜单管理 CRUD API
- [ ] 创建菜单初始化数据种子
- [ ] 创建角色-菜单关联 API
- [ ] 创建数据权限 API
- [ ] 实现菜单权限过滤逻辑
- **Status:** pending

### Phase 2: 菜单 UI/UX 重构（Frontend Engineer A + UI/UX 负责）
- [ ] 实现新菜单组件（视觉设计）
- [ ] 实现菜单交互逻辑（展开/收起/搜索）
- [ ] 实现菜单主题适配
- [ ] 实现菜单响应式布局
- **Status:** pending

### Phase 3: 权限管理后台（Frontend Engineer B 负责）
- [ ] 创建菜单管理页面
- [ ] 创建角色权限配置页面
- [ ] 创建数据权限配置页面
- [ ] 实现权限树选择组件
- **Status:** pending

### Phase 4: 客户/联系人模块调整（Frontend Engineer B 负责）
- [ ] 调整客户模块菜单位置
- [ ] 优化联系人 → 客户转化流程
- [ ] 更新路由和面包屑
- **Status:** pending

### Phase 5: 集成测试与优化
- [ ] 端到端测试（登录 → 菜单 → 权限）
- [ ] 性能优化（菜单懒加载）
- [ ] 无障碍访问测试
- **Status:** pending

## Key Questions
1. **菜单信息架构如何调整？**
   - 客户应该放在哪里？（工作台快捷入口？独立顶级菜单？）
   - 联系人如何体现是"客户的潜质"？
   - 菜单分组是否需要重新命名？

2. **动态菜单数据如何管理？**
   - 菜单是否需要支持启用/禁用？
   - 菜单是否需要支持排序？
   - 是否需要支持菜单的国际化 Key？

3. **权限粒度如何控制？**
   - 菜单级权限（能否访问某个页面）
   - 按钮级权限（增删改查按钮）
   - 数据级权限（查看范围）

4. **数据权限如何实现？**
   - 全部数据
   - 本部门数据
   - 本部门及下级部门数据
   - 自定义部门数据
   - 仅本人数据

5. **UI/UX 风格选择？**
   - 扁平化 / 拟物化 / 新拟态
   - 暗色模式支持
   - 动画效果（展开/收起/切换）

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| （待决策） | - |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| （暂无） | - | - |

## Created Files
| 文件 | 描述 |
|------|------|
| （待创建） | - |

## Business Logic Notes

### 客户与联系人关系
- **联系人是客户的潜质**：先有联系人信息，经过跟进后转化为正式客户
- **客户是最重要的概念**：应该放在菜单的显著位置
- **转化流程**：联系人 → 跟进记录 → 转化为客户

### 现有菜单结构（待重构）
```
业务
├── 工作台
├── 销售管理
│   ├── 联系人管理    ← 潜质客户
│   ├── 客户管理      ← 核心概念
│   ├── 合同管理
│   └── 服务团队
├── 财务管理
│   ├── 发票管理
│   └── 收款管理
...
```

## Resources
- 现有菜单配置: `frontend/src/components/layout/data/sidebar-data.ts`
- 权限数据模型: `backend/prisma/schema.prisma`
- 菜单组件: `frontend/src/components/ui/sidebar.tsx`
