---
name: qzt-backend-test
description: 企账通（QZT）项目后端测试工程。提供完整的后端 API 测试和前端 UI 测试能力，支持自动化测试、回归测试和黑盒测试。包含测试用例管理、测试报告生成、测试文档维护等功能。能够调用 webapp-testing 技能进行 Playwright UI 测试。在以下场景使用：1) 需要对后端 API 进行测试时，2) 需要运行回归测试时，3) 需要生成测试报告时，4) 需要更新测试用例时，5) 需要进行 UI 端到端测试时。
---

# 企账通后端测试工程

企账通项目的完整测试解决方案，支持后端 API 测试和前端 UI 测试。

## 快速开始

### 运行后端 API 测试

```bash
# 使用虚拟环境中的 Python
.venv/bin/python .claude/skills/qzt-backend-test/scripts/run_backend_tests.py

# 指定后端 URL
.venv/bin/python .claude/skills/qzt-backend-test/scripts/run_backend_tests.py --url http://localhost:7890

# 输出 JSON 格式测试报告
.venv/bin/python .claude/skills/qzt-backend-test/scripts/run_backend_tests.py --output test-report.json
```

### 运行前端 UI 测试

```bash
# 使用虚拟环境中的 Python
.venv/bin/python .claude/skills/qzt-backend-test/scripts/run_ui_tests.py

# 指定前端 URL
.venv/bin/python .claude/skills/qzt-backend-test/scripts/run_ui_tests.py --url http://localhost:3456
```

## 测试工作流

### 1. 测试前准备

- **检查服务状态**: 确保后端（端口 7890）和前端（端口 3456）服务正在运行
- **准备测试数据**: 使用默认测试账号 `admin` / `admin123`
- **查看 API 文档**: 参考 `references/api-endpoints.md` 了解完整的 API 端点列表

### 2. 执行测试

**测试流程**:
1. **健康检查**: 验证后端服务是否运行
2. **登录认证**: 使用 `admin` / `admin123` 登录，获取 JWT token
3. **Token 管理**: token 自动存储并在后续所有需要认证的请求中携带
4. **API 测试**: 依次测试各个模块的 API 端点

**后端 API 测试**:
- 认证模块：登录（获取 token）、获取用户信息（验证 token）
- 核心业务模块：客户、跟进记录、合同、发票、收款（所有请求都自动携带 token）
- 辅助功能模块：服务团队、定价规则、产品流程、规则引擎、统计、系统设置、权限
- 验证 HTTP 状态码、响应格式、数据正确性、认证有效性

**前端 UI 测试**:
- 测试登录功能
- 测试主要页面访问（客户管理、跟进记录、合同管理等）
- 截图保存测试结果
- 验证页面导航和交互

### 3. 生成测试报告

测试完成后，生成包含以下内容的报告：
- 测试摘要（总数、通过、失败、通过率）
- 各模块测试结果详情
- 失败用例详情
- 问题清单
- 测试截图（UI 测试）

使用 `assets/test-report-template.md` 作为报告模板。

### 4. 维护测试用例

当后端添加新 API 或修改现有 API 时：
1. 更新 `references/api-endpoints.md` 中的 API 列表
2. 在 `scripts/run_backend_tests.py` 中添加新的测试用例
3. 运行测试验证新功能
4. 更新测试报告模板（如果需要）

## 测试覆盖范围

### 核心模块（优先测试）
- ✅ 认证模块: 登录、获取用户信息
- ✅ 客户管理: 列表查询、创建、更新、删除
- ✅ 跟进记录: 列表查询、创建、更新

### 重要模块
- ✅ 合同管理: 列表查询、创建
- ✅ 发票管理: 列表查询、创建
- ✅ 收款记录: 列表查询、创建
- ✅ 服务团队: 查询

### 辅助模块
- ✅ 定价规则: 查询、计算
- ✅ 产品流程: 查询
- ✅ 规则引擎: 查询触发器、日志
- ✅ 统计分析: 业绩、发票、收款统计
- ✅ 系统设置: 常用语、收款账户
- ✅ 权限管理: 查询

完整 API 端点列表参见 `references/api-endpoints.md`。

## 集成 webapp-testing 技能

本技能可以调用 `webapp-testing` 技能的功能进行更复杂的 UI 测试。

**使用场景**:
- 需要更细致的浏览器自动化测试
- 需要调试 UI 行为
- 需要捕获浏览器日志
- 需要进行元素发现和选择器分析

**调用方式**:
直接使用 `webapp-testing` 技能，参考其文档进行操作。

## 测试脚本使用说明

### run_backend_tests.py

后端 API 测试脚本，使用 Python `requests` 库。

**核心机制**:
- **登录优先**: 测试开始时自动执行登录，获取 JWT token
- **Token 自动携带**: 登录后获取的 token 会自动存储，所有需要认证的 API 请求都会自动在 Header 中携带 `Authorization: Bearer {token}`
- **认证保护**: 如果登录失败，所有需要认证的测试会被跳过并记录警告

**类结构**:
- `QZTBackendTest`: 主测试类
  - `check_server()`: 检查后端服务状态
  - `login()`: 用户登录并获取 token
  - `test_endpoint()`: 测试单个 API 端点（自动携带 token）
  - `run_all_tests()`: 运行所有测试
  - `print_summary()`: 打印测试摘要

**属性**:
- `self.token`: 登录后存储的 JWT token，用于所有需要认证的请求

**命令行参数**:
- `--url`: 后端服务 URL（默认: http://localhost:7890）
- `--username`: 测试用户名（默认: admin）
- `--password`: 测试密码（默认: admin123）
- `--output`: 测试报告输出文件（JSON 格式）

### run_ui_tests.py

前端 UI 测试脚本，使用 Playwright。

**类结构**:
- `QZTUITest`: UI 测试类
  - `test_login()`: 测试登录功能
  - `test_customer_page()`: 测试客户管理页面
  - `test_follow_record_page()`: 测试跟进记录页面
  - `test_contract_page()`: 测试合同管理页面
  - `run_all_tests()`: 运行所有测试

**命令行参数**:
- `--url`: 前端服务 URL（默认: http://localhost:3456）

## 测试文档管理

### references/api-endpoints.md
包含所有后端 API 端点的完整列表，按模块组织。用于：
- 了解完整的 API 接口
- 规划测试覆盖范围
- 添加新测试用例时参考

### assets/test-report-template.md
测试报告模板，包含：
- 测试摘要
- 测试环境
- 各模块测试结果详情
- UI 测试结果
- 失败用例详情
- 问题清单
- 建议与改进

## Token 认证机制

### 自动登录和 Token 管理

测试框架实现了完整的 JWT token 认证流程：

1. **自动登录**
   ```python
   # 测试开始时自动执行
   def login(self, username: str = "admin", password: str = "admin123") -> bool:
       response = requests.post(f"{self.base_url}/auth/login", json={
           "username": username,
           "password": password
       })
       # 从响应中提取 access_token
       self.token = response.json().get('access_token')
   ```

2. **Token 存储**
   - 登录成功后，token 存储在 `self.token` 属性中
   - 该 token 在整个测试会话中持久化
   - 所有后续的 API 请求都会自动使用这个 token

3. **自动携带 Token**
   ```python
   def test_endpoint(self, method, path, description, ..., require_auth=True):
       headers = {}
       if require_auth:
           # 自动添加 Authorization header
           headers["Authorization"] = f"Bearer {self.token}"

       response = requests.request(
           method=method,
           url=url,
           headers=headers,  # token 自动携带
           ...
       )
   ```

4. **认证失败保护**
   - 如果登录失败，`self.token` 为 `None`
   - 所有需要认证的测试会被跳过
   - 测试日志会显示警告："需要认证但未登录，跳过测试"

### 示例：Token 使用流程

```python
# 1. 创建测试实例
tester = QZTBackendTest(base_url="http://localhost:7890")

# 2. 运行测试（自动登录）
tester.run_all_tests()
# 内部流程：
#   - check_server() ✓
#   - login() → 获取 token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   - self.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. 测试 API（自动携带 token）
tester.test_endpoint("GET", "/customers", "查询客户列表", require_auth=True)
# 实际请求：
#   GET http://localhost:7890/customers
#   Headers: {
#     "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   }
```

### Token 生命周期

- **获取时机**: 测试开始时，调用 `login()` 方法
- **存储位置**: `QZTBackendTest` 实例的 `self.token` 属性
- **使用范围**: 所有 `require_auth=True` 的 API 请求
- **有效期**: 整个测试会话期间（除非 token 过期）
- **刷新机制**: 当前版本不支持自动刷新，如果 token 过期需要重新登录

## 测试最佳实践

### 1. 回归测试
每次代码变更后运行完整测试套件，确保现有功能未受影响。

### 2. 黑盒测试
关注输入输出，不关注内部实现。验证 API 响应是否符合预期。

### 3. 测试隔离
- 使用独立的测试数据库
- 每次测试前准备干净的测试数据
- 测试完成后清理临时数据

### 4. 测试报告
- 每次测试后生成报告
- 记录失败用例的详细信息
- 跟踪问题修复进度

### 5. 持续改进
- 定期更新测试用例
- 根据实际情况调整测试策略
- 优化测试脚本性能

## 故障排查

### 后端服务无法连接
```bash
# 检查后端服务状态
curl http://localhost:7890/health

# 启动后端服务
cd backend && pnpm run start:dev
```

### 前端服务无法连接
```bash
# 检查前端服务状态
curl http://localhost:3456

# 启动前端服务
cd frontend && pnpm dev
```

### Playwright 浏览器问题
确保系统已安装 Chrome 浏览器。脚本使用系统 Chrome（`channel="chrome"`），无需下载 Playwright 浏览器。

### 权限问题
```bash
# 确保脚本有执行权限
chmod +x .claude/skills/qzt-backend-test/scripts/*.py
```

## 扩展测试

### 添加新的 API 测试

在 `scripts/run_backend_tests.py` 的 `run_all_tests()` 方法中添加：

```python
self.test_endpoint(
    "GET", "/new-endpoint", "测试新端点",
    params={"key": "value"},
    expect_status=200,
    require_auth=True
)
```

### 添加新的 UI 测试

在 `scripts/run_ui_tests.py` 的 `run_all_tests()` 方法中添加新测试方法，并调用它。

## 相关技能

- `webapp-testing`: 提供基于 Playwright 的 web 应用测试能力
- `qzt-dev`: 企账通项目开发工作流

## 更新日志

### v1.1.0 (2025-02-03)
- ✅ 完善文档，详细说明 Token 认证机制
- ✅ 添加 Token 认证示例文档（references/token-auth-example.md）
- ✅ 明确说明登录是测试的前提条件
- ✅ 强调 Token 自动携带机制

### v1.0.0 (2025-02-03)
- 初始版本
- 支持后端 API 测试
- 支持前端 UI 测试
- 包含测试报告生成
- 包含 API 端点文档
- 包含测试报告模板
