# 企账通后端测试报告

**测试时间**: {{TEST_DATE}}
**测试人员**: {{TESTER}}
**测试版本**: {{VERSION}}

---

## 测试摘要

| 指标 | 数值 |
|------|------|
| 总计测试用例 | {{TOTAL_TESTS}} |
| 通过 | {{PASSED_TESTS}} |
| 失败 | {{FAILED_TESTS}} |
| 通过率 | {{PASS_RATE}}% |

---

## 测试环境

- 后端服务: `{{BACKEND_URL}}`
- 前端服务: `{{FRONTEND_URL}}`
- 数据库: `{{DATABASE_URL}}`
- 测试工具: Python + Playwright + Requests

---

## 测试结果详情

### 1. 认证模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 用户登录 | {{AUTH_LOGIN_STATUS}} | {{AUTH_LOGIN_DESC}} |
| 获取用户信息 | {{AUTH_ME_STATUS}} | {{AUTH_ME_DESC}} |

### 2. 客户管理模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询客户列表 | {{CUSTOMER_LIST_STATUS}} | {{CUSTOMER_LIST_DESC}} |
| 创建客户 | {{CUSTOMER_CREATE_STATUS}} | {{CUSTOMER_CREATE_DESC}} |
| 更新客户 | {{CUSTOMER_UPDATE_STATUS}} | {{CUSTOMER_UPDATE_DESC}} |

### 3. 跟进记录模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询跟进记录 | {{FOLLOW_LIST_STATUS}} | {{FOLLOW_LIST_DESC}} |
| 创建跟进记录 | {{FOLLOW_CREATE_STATUS}} | {{FOLLOW_CREATE_DESC}} |

### 4. 合同管理模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询合同列表 | {{CONTRACT_LIST_STATUS}} | {{CONTRACT_LIST_DESC}} |

### 5. 发票管理模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询发票列表 | {{INVOICE_LIST_STATUS}} | {{INVOICE_LIST_DESC}} |

### 6. 收款记录模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询收款记录 | {{PAYMENT_LIST_STATUS}} | {{PAYMENT_LIST_DESC}} |

### 7. 服务团队模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询服务团队 | {{TEAM_LIST_STATUS}} | {{TEAM_LIST_DESC}} |

### 8. 定价规则模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询定价规则 | {{PRICING_LIST_STATUS}} | {{PRICING_LIST_DESC}} |

### 9. 产品流程模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询产品流程 | {{PRODUCT_LIST_STATUS}} | {{PRODUCT_LIST_DESC}} |

### 10. 规则引擎模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询触发器 | {{TRIGGER_LIST_STATUS}} | {{TRIGGER_LIST_DESC}} |

### 11. 统计分析模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 业绩统计 | {{STATS_PERFORMANCE_STATUS}} | {{STATS_PERFORMANCE_DESC}} |

### 12. 系统设置模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询常用语 | {{SYSTEM_PHRASE_STATUS}} | {{SYSTEM_PHRASE_DESC}} |

### 13. 权限管理模块

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 查询权限列表 | {{PERMISSION_LIST_STATUS}} | {{PERMISSION_LIST_DESC}} |

---

## UI 测试结果

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 登录页面 | {{UI_LOGIN_STATUS}} | {{UI_LOGIN_DESC}} |
| 客户管理页面 | {{UI_CUSTOMER_STATUS}} | {{UI_CUSTOMER_DESC}} |
| 跟进记录页面 | {{UI_FOLLOW_STATUS}} | {{UI_FOLLOW_DESC}} |
| 合同管理页面 | {{UI_CONTRACT_STATUS}} | {{UI_CONTRACT_DESC}} |

---

## 失败用例详情

{{FAILED_CASES_DETAILS}}

---

## 测试截图

{{TEST_SCREENSHOTS}}

---

## 问题清单

| ID | 问题描述 | 严重程度 | 状态 |
|----|---------|---------|------|
{{ISSUES_TABLE}}

---

## 建议与改进

{{RECOMMENDATIONS}}

---

## 附录

### 测试执行命令
```bash
# 后端 API 测试
.claude/skills/qzt-backend-test/scripts/run_backend_tests.py --url http://localhost:7890

# UI 测试
.claude/skills/qzt-backend-test/scripts/run_ui_tests.py --url http://localhost:3456
```

### 相关文档
- API 端点参考: `references/api-endpoints.md`
- 测试工作流: `SKILL.md`
