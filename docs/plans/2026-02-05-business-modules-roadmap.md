# 业务模块开发路线图

**创建日期**: 2026-02-05
**状态**: 进行中
**相关会话**: 2025-02-05 业务菜单扩展开发

---

## 📊 项目概述

本次开发会话完成了业务菜单的扩展和基础架构搭建，新增了 6 个业务模块的框架。

### ✅ 已完成工作

1. **侧边栏菜单重组**
   - 新增"销售管理"父菜单：客户、合同、联系人、产品
   - 新增"财务管理"父菜单：发票、收款
   - 新增"自动化"顶层菜单
   - 隐藏任务、应用、聊天菜单

2. **完整 CRUD 模块（2个）**
   - ✅ **合同管理**：完整 CRUD、客户选择器、产品选择器、收款状态管理
   - ✅ **产品管理**：完整 CRUD、价格管理、开票额度配置

3. **基础架构模块（4个）**
   - ✅ **联系人管理**：类型定义、Hooks、路由、占位页面
   - ✅ **自动化管理**：类型定义、Hooks、路由、占位页面
   - ✅ **发票管理**：类型定义、Hooks、路由、占位页面
   - ✅ **收款管理**：类型定义、Hooks、路由、占位页面

4. **可复用组件（2个）**
   - ✅ **CustomerSelector**：企业选择器（支持搜索 + 高级查找按钮）
   - ✅ **ProductSelector**：产品选择器（支持搜索）

5. **依赖安装**
   - ✅ `@uidotdev/usehooks`（提供 useDebounce）

---

## 🎯 待完成任务

### 优先级 1：核心功能完善

#### 1.1 完善合同管理模块

**状态**: ✅ 基础功能已完成
**待完成**:
- [ ] 实现企业选择器的高级查找对话框
- [ ] 添加合同状态筛选（草稿、生效、已完成、已取消）
- [ ] 添加日期范围筛选
- [ ] 优化合同详情页面（显示关联合同的产品信息）
- [ ] 添加收款进度条（已收款/合同金额）

**文件位置**: `frontend/src/features/contracts/`

**预计工时**: 2-3 小时

---

#### 1.2 完善产品管理模块

**状态**: ✅ 基础功能已完成
**待完成**:
- [ ] 添加产品分类管理（硬件、软件、服务、其他）
- [ ] 实现产品流程子资源管理（已存在 API）
- [ ] 添加产品复制功能
- [ ] 添加批量导入/导出功能
- [ ] 显示开票额度使用情况

**文件位置**: `frontend/src/features/products/`

**API 参考**:
- `productControllerCreateFlow`
- `productControllerFindFlows`
- `productControllerUpdateFlow`

**预计工时**: 3-4 小时

---

### 优先级 2：基础模块实现

#### 2.1 联系人管理模块（完整 CRUD）

**状态**: ⏸️ 基础架构已完成
**待完成**:
- [ ] 创建表格组件（`contacts-table.tsx`）
- [ ] 创建列定义（`contacts-columns.tsx`）
- [ ] 创建表单对话框（`contact-form-dialog.tsx`）
- [ ] 创建按钮组件（`contacts-primary-buttons.tsx`）
- [ ] 创建对话框容器（`contacts-dialogs.tsx`）
- [ ] 实现企业关联功能
- [ ] 添加手机号唯一性验证
- [ ] 添加"主要联系人"和"决策人"标识
- [ ] 实现生日提醒功能

**文件位置**: `frontend/src/features/contacts/`

**API 特殊功能**:
- `contactControllerFindByPhone(phone)` - 通过手机号查找
- `contactControllerLinkCompany(id, linkCompanyDto)` - 关联企业
- `contactControllerUnlinkCompany(id, customerId)` - 取消关联

**预计工时**: 4-5 小时

---

#### 2.2 发票管理模块（完整 CRUD）

**状态**: ⏸️ 基础架构已完成
**待完成**:
- [ ] 创建表格组件（`invoices-table.tsx`）
- [ ] 创建列定义（`invoices-columns.tsx`）
- [ ] 创建表单对话框（`invoice-form-dialog.tsx`）
- [ ] 实现客户开票汇总统计
- [ ] 添加月份选择器
- [ ] 添加超额警告（超过产品开票额度时红色提示）
- [ ] 实现发票打印功能（生成 PDF）

**文件位置**: `frontend/src/features/invoices/`

**API 特殊功能**:
- `invoiceControllerGetCustomerSummary(customerId, params)` - 获取客户开票汇总

**预计工时**: 4-5 小时

---

#### 2.3 收款管理模块（完整 CRUD）

**状态**: ⏸️ 基础架构已完成
**待完成**:
- [ ] 创建表格组件（`payments-table.tsx`）
- [ ] 创建列定义（`payments-columns.tsx`）
- [ ] 创建表单对话框（`payment-form-dialog.tsx`）
- [ ] 实现凭证上传组件（文件上传，返回 URL）
- [ ] 添加收款方式下拉（1:银行转账 2:微信 3:支付宝 4:现金）
- [ ] 实现收款确认按钮
- [ ] 添加收款进度条（已收款/合同金额）

**文件位置**: `frontend/src/features/payments/`

**API 特殊功能**:
- `paymentControllerConfirmPayment(id)` - 确认收款
- `paymentControllerGetContractPayments(contractId)` - 获取合同的收款记录

**预计工时**: 4-5 小时

---

#### 2.4 自动化管理模块

**状态**: ⏸️ 基础架构已完成
**待完成**:
- [ ] 创建规则列表组件（`automation-rules-table.tsx`）
- [ ] 创建规则表单对话框（`automation-rule-form-dialog.tsx`）
- [ ] 实现 Tabs 切换（规则列表 / 通知 / 执行历史）
- [ ] 实现启用/禁用开关
- [ ] 实现手动触发按钮
- [ ] 添加通知徽章（显示未读数量）
- [ ] 实现执行状态显示（成功/失败）

**文件位置**: `frontend/src/features/automation/`

**API 特殊功能**:
- `automationControllerToggleEnabled(id)` - 启用/禁用规则
- `automationControllerTriggerRule(id)` - 手动触发规则
- `automationControllerGetTaskHistory(params)` - 查询执行历史
- `automationControllerGetNotifications(params)` - 查询通知
- `automationControllerMarkNotificationAsRead(id)` - 标记通知为已读

**预计工时**: 5-6 小时

---

### 优先级 3：优化与增强

#### 3.1 企业选择器高级查找

**状态**: 📋 已规划
**待完成**:
- [ ] 创建高级查找对话框组件
- [ ] 复用 `CustomersTable` 组件
- [ ] 支持高级筛选（等级、行业、创建时间）
- [ ] 支持搜索和分页
- [ ] 点击行或"选择"按钮确认

**文件位置**:
- 新建：`frontend/src/components/selectors/CustomerAdvancedSearch.tsx`
- 复用：`frontend/src/features/customers/components/customers-table.tsx`

**预计工时**: 2-3 小时

---

#### 3.2 API 响应结构统一

**状态**: ⚠️ 需要修复
**问题**: 不同后端接口返回的分页数据结构不统一

**当前情况**:
- 产品、合同：`{ data: [], total, page, pageSize }`
- 客户：`{ items: [], total, page, pageSize }`

**解决方案**:

**选项 A（推荐）**: 前端适配
- 在 hooks 层统一数据转换
- 不修改后端代码
- 快速解决问题

**选项 B**: 后端统一
- 统一所有接口的响应格式
- 需要修改多个后端 Controller
- 彻底解决问题但耗时较长

**相关文件**:
- `frontend/src/features/*/hooks/use-*.ts`
- `frontend/src/features/*/components/*-table.tsx`

**预计工时**:
- 选项 A: 1-2 小时
- 选项 B: 4-6 小时

---

#### 3.3 国际化（i18n）完善

**状态**: 📋 已规划
**待完成**:
- [ ] 为新增菜单项添加翻译
  - 销售管理、财务管理、自动化
  - 合同、联系人、产品、发票、收款

**相关文件**:
- `frontend/src/i18n/locales/zh/translation.json`
- `frontend/src/i18n/locales/en/translation.json`

**预计工时**: 1 小时

---

#### 3.4 权限控制

**状态**: 📋 已规划
**待完成**:
- [ ] 根据用户角色显示/隐藏菜单项
- [ ] 为不同模块添加权限验证
- [ ] 实现按钮级别的权限控制

**相关模块**:
- 已有：`frontend/src/features/roles/`
- 已有：`frontend/src/features/permissions/`

**预计工时**: 3-4 小时

---

## 📈 技术债务清单

### 代码质量

- [ ] **类型定义完善**: 为所有模块添加准确的 TypeScript 类型定义
- [ ] **错误处理**: 统一错误处理和用户提示
- [ ] **加载状态**: 优化加载和空状态显示
- [ ] **单元测试**: 为核心组件添加测试

### 性能优化

- [ ] **查询优化**: 优化 TanStack Query 的缓存策略
- [ ] **代码分割**: 使用 lazy loading 减少初始加载体积
- [ ] **选择器优化**: 实现虚拟滚动（针对超大数据量）
- [ ] **图片优化**: 凭证图片压缩和懒加载

### 用户体验

- [ ] **响应式设计**: 优化移动端显示
- [ ] **快捷键支持**: 添加键盘快捷键
- [ ] **批量操作**: 实现批量删除、批量导出
- [ ] **数据导出**: Excel、CSV 导出功能

---

## 🗂️ 参考文档

### 内部文档

- **CRUD 模块开发最佳实践**: `/Users/shichenyang/WebstormProjects/qzt/CLAUDE.md`
- **API 开发规范**: `/Users/shichenyang/WebstormProjects/qzt/CLAUDE.md`
- **客户管理参考实现**: `frontend/src/features/customers/`

### 外部文档

- **Shadcn UI**: https://ui.shadcn.com/
- **TanStack Query**: https://tanstack.com/query/latest
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/

---

## 📝 开发日志

### 2026-02-05

**完成**:
- ✅ 创建了 6 个业务模块的基础架构
- ✅ 实现了合同和产品的完整 CRUD 功能
- ✅ 创建了企业选择器和产品选择器组件
- ✅ 修复了数据访问路径问题（`data?.data` vs `data?.items`）
- ✅ 修复了 ES 模块导入问题（`require()` → `import`）
- ✅ 更新了项目文档（CLAUDE.md）

**问题与解决**:
1. **表格数据不显示**: 后端返回 `data` 字段，代码访问 `items` 字段 → 已修复
2. **模块导入错误**: 使用 `require()` 导致错误 → 已改用 `import`
3. **依赖缺失**: 需要安装 `@uidotdev/usehooks` → 已安装

**经验总结**:
- 优先查看实际 API 响应，而非推测数据结构
- 在浏览器开发者工具中验证 API 调用
- 使用 Zod schema 确保类型安全
- 统一的模块结构便于维护和扩展

---

## 🎯 下一步行动

**立即开始**:
1. 完善联系人管理模块（完整 CRUD）- 预计 4-5 小时
2. 实现企业选择器高级查找 - 预计 2-3 小时
3. 完善发票管理模块（完整 CRUD）- 预计 4-5 小时

**本周完成**:
- 所有 6 个模块的完整 CRUD 功能
- 企业选择器高级查找
- API 响应结构统一

**本月完成**:
- 国际化完善
- 权限控制
- 性能优化

---

## 📞 联系方式

**问题反馈**: 在开发会话中直接提出
**文档更新**: 随着开发进展持续更新此文档
