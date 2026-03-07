# 更新日志 - 2026-03-07

## 新增功能

### 1. 数据可视化增强 📊

#### 新增图表组件
- **销售业绩排行图表** (`SalesPerformanceChart`)
  - 显示 TOP 10 销售人员的业绩
  - 按客户等级分类（VIP、正式、意向、线索）
  - 支持自定义时间范围筛选

- **产品销售统计图表** (`ProductSalesChart`)
  - 饼图展示各产品销售额占比
  - 显示合同数量和总金额
  - 支持时间范围筛选

- **合同状态分布图表** (`ContractStatusChart`)
  - 饼图展示合同状态分布（待收款、部分收款、已收全）
  - 显示各状态的合同数量和金额

#### 后端 API 增强
- 新增 `GET /statistics/contract-status` 端点
  - 返回合同状态分布数据
  - 包含数量和金额统计

### 2. 通知系统完善 🔔

#### 新增通知组件
- **通知铃铛组件** (`NotificationBell`)
  - 实时显示未读通知数量
  - 支持查看、标记已读、删除通知
  - 每30秒自动刷新
  - 支持点击跳转到相关链接

### 3. 导出功能增强 📥

#### 新增导出组件
- **通用导出按钮** (`ExportButton`)
  - 支持导出为 CSV、Excel、JSON 格式
  - 自动处理中文编码（CSV）
  - 友好的加载状态和错误提示
  - 可用于任何列表页面

### 4. 用户体验优化 ✨

#### 新增功能组件
- **快速操作面板** (`QuickActions`)
  - Dashboard 顶部显示常用操作
  - 一键访问新增客户、创建合同、记录收款等功能

- **全局搜索** (`GlobalSearch`)
  - 支持搜索客户、合同、产品
  - 键盘快捷键支持（待集成）
  - 实时搜索结果展示

- **数据筛选组件** (`DataFilter`)
  - 支持文本、下拉、日期等多种筛选类型
  - 显示当前激活的筛选数量
  - 一键重置所有筛选

- **统计卡片组件** (`StatCard`)
  - 显示关键指标和趋势
  - 支持图标和颜色自定义
  - 显示环比/同比变化

### 5. 代码质量改进 🧪

#### 测试增强
- 新增 `StatisticsService` 单元测试
  - 测试 Dashboard 统计数据获取
  - 测试合同状态分布
  - 测试销售业绩统计

## 技术改进

### 前端
- 优化图表组件的数据处理逻辑
- 改进错误处理和加载状态显示
- 增强类型定义

### 后端
- 新增合同状态分布查询方法
- 优化数据库查询性能（使用 groupBy）

## 文件变更

### 新增文件
```
frontend/src/features/dashboard/components/sales-performance-chart.tsx
frontend/src/features/dashboard/components/product-sales-chart.tsx
frontend/src/features/dashboard/components/contract-status-chart.tsx
frontend/src/features/dashboard/components/quick-actions.tsx
frontend/src/components/notification-bell.tsx
frontend/src/components/export-button.tsx
frontend/src/components/data-filter.tsx
frontend/src/components/global-search.tsx
frontend/src/components/stat-card.tsx
backend/src/modules/statistics/statistics.service.spec.ts
```

### 修改文件
```
frontend/src/features/dashboard/index.tsx
frontend/src/features/dashboard/hooks/use-dashboard-stats.ts
backend/src/modules/statistics/statistics.service.ts
backend/src/modules/statistics/statistics.controller.ts
```

## 下一步计划

1. **集成通知铃铛** - 将 NotificationBell 组件集成到顶部导航栏
2. **完善全局搜索** - 添加键盘快捷键（Cmd/Ctrl + K）
3. **导出功能应用** - 在客户、合同、发票列表页面应用导出功能
4. **数据筛选应用** - 在各列表页面应用筛选组件
5. **移动端适配** - 优化图表和组件在移动端的显示
6. **更多测试** - 添加更多单元测试和 E2E 测试

## 版本信息

- 版本号: 2026.03.07.1
- 分支: feature/enhance-qzt
- 基于版本: 2026.02.08.1
