# 企账通后端 API 端点参考

本文档包含所有后端 API 端点的完整列表，用于测试覆盖。

## 认证模块 (Auth)

- `POST /auth/login` - 用户登录
- `GET /auth/me` - 获取当前用户信息
- `POST /auth/refresh` - 刷新访问令牌
- `POST /auth/logout` - 用户登出

## 客户管理 (Customer)

- `GET /customers` - 查询客户列表（支持分页、搜索、筛选）
- `GET /customers/:id` - 获取客户详情
- `POST /customers` - 创建客户
- `PATCH /customers/:id` - 更新客户信息
- `DELETE /customers/:id` - 删除客户
- `POST /customers/:id/assign` - 分配客户

## 跟进记录 (Follow Record)

- `GET /follow-records` - 查询跟进记录列表（支持分页、筛选）
- `GET /follow-records/:id` - 获取跟进记录详情
- `POST /follow-records` - 创建跟进记录
- `PATCH /follow-records/:id` - 更新跟进记录
- `DELETE /follow-records/:id` - 删除跟进记录

## 合同管理 (Contract)

- `GET /contracts` - 查询合同列表（支持分页、搜索）
- `GET /contracts/:id` - 获取合同详情
- `POST /contracts` - 创建合同
- `PATCH /contracts/:id` - 更新合同
- `DELETE /contracts/:id` - 删除合同

## 发票管理 (Invoice)

- `GET /invoices` - 查询发票列表（支持分页、筛选）
- `GET /invoices/:id` - 获取发票详情
- `POST /invoices` - 创建发票
- `PATCH /invoices/:id` - 更新发票
- `DELETE /invoices/:id` - 删除发票

## 收款记录 (Payment)

- `GET /payments` - 查询收款记录列表（支持分页、筛选）
- `GET /payments/:id` - 获取收款记录详情
- `POST /payments` - 创建收款记录
- `PATCH /payments/:id` - 更新收款记录
- `DELETE /payments/:id` - 删除收款记录

## 服务团队 (Service Team)

- `GET /service-teams` - 查询所有服务团队
- `GET /service-teams/:id` - 获取服务团队详情
- `POST /service-teams` - 创建服务团队
- `PATCH /service-teams/:id` - 更新服务团队
- `DELETE /service-teams/:id` - 删除服务团队

## 定价规则 (Pricing)

- `GET /pricing/rules` - 查询定价规则列表
- `GET /pricing/rules/:id` - 获取定价规则详情
- `POST /pricing/rules` - 创建定价规则
- `PATCH /pricing/rules/:id` - 更新定价规则
- `DELETE /pricing/rules/:id` - 删除定价规则
- `POST /pricing/calculate` - 计算价格

## 产品流程 (Product)

- `GET /products/flows` - 查询产品流程列表
- `GET /products/flows/:id` - 获取产品流程详情
- `POST /products/flows` - 创建产品流程
- `PATCH /products/flows/:id` - 更新产品流程
- `DELETE /products/flows/:id` - 删除产品流程

## 规则引擎 (Rule Engine)

- `GET /rule-engine/triggers` - 查询触发器列表
- `GET /rule-engine/triggers/:id` - 获取触发器详情
- `POST /rule-engine/triggers` - 创建触发器
- `PATCH /rule-engine/triggers/:id` - 更新触发器
- `DELETE /rule-engine/triggers/:id` - 删除触发器
- `GET /rule-engine/logs` - 查询规则引擎日志
- `GET /rule-engine/triggers/enabled` - 查询已启用的触发器

## 统计分析 (Statistics)

- `GET /statistics/performance` - 获取业绩统计数据
- `GET /statistics/invoice` - 获取发票统计
- `GET /statistics/payment` - 获取收款统计

## 系统设置 (System)

- `GET /system/common-phrases` - 查询常用语列表
- `POST /system/common-phrases` - 创建常用语
- `PATCH /system/common-phrases/:id` - 更新常用语
- `DELETE /system/common-phrases/:id` - 删除常用语
- `GET /system/payment-accounts` - 查询收款账户列表
- `POST /system/payment-accounts` - 创建收款账户
- `PATCH /system/payment-accounts/:id` - 更新收款账户
- `DELETE /system/payment-accounts/:id` - 删除收款账户
- `POST /system/payment-accounts/:id/set-default` - 设置默认收款账户

## 权限管理 (Permission)

- `GET /permissions` - 查询权限列表
- `GET /permissions/:id` - 获取权限详情
- `POST /permissions` - 创建权限
- `PATCH /permissions/:id` - 更新权限
- `DELETE /permissions/:id` - 删除权限

## 测试覆盖策略

### 优先级 1（核心功能）
- 认证模块：登录、获取用户信息
- 客户管理：列表查询、创建、更新
- 跟进记录：列表查询、创建

### 优先级 2（重要功能）
- 合同管理：列表查询、创建
- 发票管理：列表查询、创建
- 收款记录：列表查询、创建
- 服务团队：查询

### 优先级 3（辅助功能）
- 定价规则：查询、计算
- 产品流程：查询
- 规则引擎：查询触发器、日志
- 统计分析：业绩、发票、收款统计
- 系统设置：常用语、收款账户
- 权限管理：查询

### 测试类型

1. **黑盒测试**：不关注内部实现，只测试输入输出
2. **回归测试**：每次更新后运行全部测试
3. **接口测试**：验证 API 响应、状态码、数据格式
4. **UI 测试**：使用 Playwright 测试前端界面

### 测试数据准备

- 默认管理员账号：`admin` / `admin123`
- 测试环境数据库：使用独立测试数据库
- 测试数据：准备标准测试数据集
