# 功能增强测试指南

## 🚀 快速开始

### 1. 启动后端服务
```bash
cd D:\ccproject\qzt\backend
pnpm install
pnpm run start:dev
```
后端将运行在 http://localhost:7890

### 2. 启动前端服务
```bash
cd D:\ccproject\qzt\frontend
pnpm install
pnpm run dev
```
前端将运行在 http://localhost:3458

### 3. 访问 Dashboard
打开浏览器访问: http://localhost:3458

## ✅ 测试清单

### Dashboard 增强功能

#### 1. 统计卡片
- [ ] 查看8个统计卡片显示正常
- [ ] 检查数据刷新功能
- [ ] 验证未读通知数量显示

#### 2. 销售业绩排行图表
- [ ] 图表正常渲染
- [ ] 显示 TOP 10 销售人员
- [ ] 客户等级分类显示正确
- [ ] 鼠标悬停显示详情

#### 3. 产品销售统计图表
- [ ] 饼图正常渲染
- [ ] 显示产品销售额
- [ ] 显示总销售额
- [ ] 颜色区分明显

#### 4. 合同状态分布图表
- [ ] 饼图正常渲染
- [ ] 显示三种状态（待收款、部分收款、已收全）
- [ ] 显示合同数量和金额
- [ ] 颜色符合设计规范

#### 5. 客户增长趋势图
- [ ] 折线图正常渲染
- [ ] 显示近30天数据
- [ ] 累计新增客户显示正确

#### 6. 快速操作面板
- [ ] 6个操作按钮显示正常
- [ ] 点击跳转到对应页面
- [ ] 响应式布局正常

### 组件测试

#### 1. 导出按钮组件
```bash
# 在客户列表页面测试
1. 访问 http://localhost:3458/customers
2. 点击"导出"按钮
3. 分别测试 CSV、Excel、JSON 导出
4. 检查导出文件是否正常
```

#### 2. 数据筛选组件
```bash
# 在客户列表页面测试
1. 点击"筛选"按钮
2. 测试各种筛选条件
3. 测试重置功能
4. 验证筛选数量显示
```

#### 3. 通知铃铛组件
```bash
# 需要先集成到导航栏
1. 在导航栏添加 NotificationBell 组件
2. 创建测试通知
3. 测试未读数量显示
4. 测试标记已读功能
5. 测试删除通知功能
```

#### 4. 全局搜索组件
```bash
# 需要先集成到导航栏
1. 在导航栏添加 GlobalSearch 组件
2. 输入搜索关键词
3. 测试客户、合同、产品搜索
4. 点击结果跳转
```

### API 测试

#### 1. 合同状态分布 API
```bash
# 使用 curl 或 Postman 测试
curl -X GET "http://localhost:7890/statistics/contract-status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

预期响应：
```json
[
  {
    "status": "PAID",
    "count": 20,
    "totalAmount": 200000
  },
  ...
]
```

#### 2. Dashboard 统计 API
```bash
curl -X GET "http://localhost:7890/statistics/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 后端单元测试

```bash
cd D:\ccproject\qzt\backend
pnpm test statistics.service.spec.ts
```

预期输出：
```
PASS  src/modules/statistics/statistics.service.spec.ts
  StatisticsService
    ✓ should be defined
    ✓ should return dashboard statistics
    ✓ should return contract status distribution
    ✓ should return sales performance data
```

## 🐛 常见问题

### 1. 图表不显示
**原因**: 数据为空或 API 请求失败
**解决**:
- 检查后端服务是否启动
- 检查数据库是否有数据
- 查看浏览器控制台错误

### 2. 导出文件乱码
**原因**: CSV 编码问题
**解决**: 已添加 BOM，应该不会出现此问题

### 3. 通知不显示
**原因**: API 参数问题
**解决**: 检查 userId 是否正确传递

### 4. 全局搜索无结果
**原因**: 后端 API 不支持 search 参数
**解决**: 需要确保后端 API 支持 search 查询参数

## 📊 性能测试

### 1. Dashboard 加载时间
- 目标: < 2秒
- 测试方法: 浏览器开发者工具 Network 标签

### 2. 图表渲染时间
- 目标: < 1秒
- 测试方法: React DevTools Profiler

### 3. 导出大数据量
- 测试导出 1000+ 条记录
- 目标: < 5秒

## 🔍 测试数据准备

### 创建测试客户
```bash
# 通过 API 或界面创建至少 10 个客户
# 分配给不同的销售人员
# 设置不同的客户等级
```

### 创建测试合同
```bash
# 创建至少 20 个合同
# 设置不同的状态（UNPAID, PARTIAL, PAID）
# 关联到不同客户
```

### 创建测试产品
```bash
# 创建至少 5 个产品
# 设置不同的价格
```

### 创建测试通知
```bash
# 通过 API 创建测试通知
curl -X POST "http://localhost:7890/notifications/send" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_id"],
    "type": "TEST",
    "title": "测试通知",
    "content": "这是一条测试通知"
  }'
```

## 📝 测试报告模板

```
测试人员: ___________
测试日期: ___________
测试环境: ___________

Dashboard 测试:
- [ ] 统计卡片: 通过/失败
- [ ] 销售业绩图: 通过/失败
- [ ] 产品销售图: 通过/失败
- [ ] 合同状态图: 通过/失败
- [ ] 客户增长图: 通过/失败
- [ ] 快速操作: 通过/失败

组件测试:
- [ ] 导出按钮: 通过/失败
- [ ] 数据筛选: 通过/失败
- [ ] 通知铃铛: 通过/失败
- [ ] 全局搜索: 通过/失败

API 测试:
- [ ] 合同状态 API: 通过/失败
- [ ] Dashboard API: 通过/失败

单元测试:
- [ ] StatisticsService: 通过/失败

发现的问题:
1. _________________________
2. _________________________
3. _________________________

总体评价: ___________
```

## 🎯 下一步

测试完成后，请：
1. 记录发现的问题
2. 提交 Bug 报告
3. 反馈用户体验问题
4. 提出改进建议

---

**最后更新**: 2026-03-07
**版本**: 2026.03.07.1
