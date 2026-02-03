# Token 认证示例

本文档演示测试脚本中的 Token 认证机制。

## 实际测试流程

### 1. 登录并获取 Token

```python
# 步骤 1: 调用登录 API
POST http://localhost:7890/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

# 响应:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}

# 提取 token 并存储
self.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
```

### 2. 使用 Token 访问受保护的 API

```python
# 步骤 2: 所有后续请求都自动携带这个 token

# 示例 1: 查询客户列表
GET http://localhost:7890/customers?page=1&pageSize=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

# 示例 2: 创建客户
POST http://localhost:7890/customers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
Content-Type: application/json

{
  "name": "测试客户",
  "phone": "13800138000"
}

# 示例 3: 查询跟进记录
GET http://localhost:7890/follow-records?page=1&pageSize=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 3. 代码实现

```python
class QZTBackendTest:
    def __init__(self):
        self.token = None  # 存储 token

    def login(self, username="admin", password="admin123"):
        """登录并获取 token"""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"username": username, "password": password}
        )

        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token')  # 存储 token
            print(f"✅ 登录成功，token: {self.token[:20]}...")
            return True
        return False

    def test_endpoint(self, method, path, description, require_auth=True):
        """测试 API 端点，自动携带 token"""
        headers = {}

        # 如果需要认证，自动添加 Authorization header
        if require_auth:
            if not self.token:
                print("⚠️ 需要认证但未登录")
                return False
            headers["Authorization"] = f"Bearer {self.token}"

        # 发送请求
        response = requests.request(
            method=method,
            url=f"{self.base_url}{path}",
            headers=headers,  # token 自动携带
            timeout=10
        )

        return response.status_code == 200
```

## 测试执行流程

```
开始测试
  ↓
1. 检查后端服务
  ├─ GET /health
  └─ ✅ 服务正常
  ↓
2. 用户登录
  ├─ POST /auth/login
  ├─ 获取 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  └─ ✅ 登录成功
  ↓
3. 测试需要认证的 API（自动携带 token）
  ├─ GET /auth/me
  │   ├─ Header: Authorization: Bearer {token}
  │   └─ ✅ 成功
  ├─ GET /customers
  │   ├─ Header: Authorization: Bearer {token}
  │   └─ ✅ 成功
  ├─ GET /follow-records
  │   ├─ Header: Authorization: Bearer {token}
  │   └─ ✅ 成功
  ├─ GET /contracts
  │   ├─ Header: Authorization: Bearer {token}
  │   └─ ✅ 成功
  └─ ... (其他 API 测试)
  ↓
4. 生成测试报告
```

## 认证失败处理

### 场景 1: 登录失败

```
登录测试
  ├─ POST /auth/login
  ├─ 响应: 401 Unauthorized
  └─ ❌ 登录失败
  ↓
后续测试
  ├─ GET /customers
  ├─ 检测: self.token is None
  ├─ 结果: 跳过测试
  └─ ⚠️ 需要认证但未登录，跳过测试
```

### 场景 2: Token 过期

```
使用过期 token
  ├─ GET /customers
  ├─ Header: Authorization: Bearer {expired_token}
  ├─ 响应: 401 Unauthorized
  └─ ❌ 认证失败
```

**注意**: 当前版本不支持自动刷新 token。如果 token 过期，需要重新运行测试脚本。

## 关键点总结

1. **登录是前提**: 测试开始时必须先登录获取 token
2. **自动携带**: 所有需要认证的 API 请求都会自动在 Header 中携带 `Authorization: Bearer {token}`
3. **统一管理**: token 存储在 `self.token` 属性中，整个测试会话共享
4. **安全保护**: 如果登录失败，所有需要认证的测试会被跳过
5. **简化使用**: 开发者无需手动管理 token，框架自动处理
