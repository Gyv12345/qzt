# 前后端联调设计方案

**日期**: 2026-02-04
**项目**: QZT 企账通
**目标**: 建立完整的前后端联调测试体系,确保 API 契约验证、业务流程正确性和错误处理机制

---

## 一、联调环境检查与准备

### 1.1 环境配置验证

**后端检查项:**
- ✅ 服务运行在 `http://localhost:7890`
- ✅ Swagger 文档可访问: `http://localhost:7890/api-docs-json`
- ✅ CORS 配置允许前端域名(`http://localhost:3456`)
- ✅ 数据库连接正常

**前端检查项:**
- ✅ 服务运行在 `http://localhost:3456`
- ✅ Orval 配置正确(`orval.config.ts`)
- ✅ API 客户端已配置(`api-client.ts`)
- ✅ 环境变量配置正确

**准备工作:**
```bash
# 1. 启动前端服务
pnpm run dev

# 2. 重新生成 API 客户端
cd frontend && pnpm run generate:api

# 3. TypeScript 类型检查
cd frontend && pnpm exec tsc --noEmit
```

### 1.2 API 契约验证

```bash
# 检查后端 API 规范
curl -f http://localhost:7890/api-docs-json | jq '.paths | keys'

# 检查前端生成的 API 文件
ls -la frontend/src/services/api/
ls -la frontend/src/models/
```

---

## 二、认证功能联调

### 2.1 登录流程测试

**场景 1: 正常登录**
- API: `POST /auth/login`
- 返回: `{ access_token, user: { id, username, ... } }`
- 存储: `localStorage.setItem('access_token', token)`
- 跳转: `/dashboard`

**场景 2: 登录失败**
- 错误凭据 → 401 → 提示"用户名或密码错误"

### 2.2 Token 刷新与过期处理

**场景 3: Token 过期自动处理**
- 后端返回 401
- 前端清除 token
- 触发 `unauthorized` 事件
- AuthContext 自动跳转登录页

### 2.3 用户信息获取

**场景 4: 获取当前用户信息**
- API: `GET /auth/me`
- 请求头自动携带 Token

**场景 5: 未登录访问受保护路由**
- 路由守阻(`beforeLoad`)
- 自动重定向到 `/login`

### 2.4 退出登录

**场景 6: 正常退出**
- 清除 localStorage(token + user_info)
- 跳转到登录页

---

## 三、客户管理模块联调

### 3.1 客户列表查询

**场景 7: 客户列表分页查询**
- API: `GET /customers?page=1&pageSize=10`
- TanStack Query 缓存数据
- 返回格式: `{ items, total, page, pageSize }`

**场景 8: 客户搜索过滤**
- API: `GET /customers?keyword=张三&status=1&page=1`
- URL 同步更新搜索状态

### 3.2 创建客户

**场景 9: 创建新客户**
- API: `POST /customers`
- 表单验证: Zod schema
- 后端业务规则验证
- `invalidateQueries(['customers'])` 刷新列表

### 3.3 更新客户

**场景 10: 编辑客户信息**
- API: `PATCH /customers/:id`
- 表单预填充数据
- 乐观更新或重新获取

### 3.4 删除客户

**场景 11: 删除客户(软删除)**
- API: `DELETE /customers/:id`
- 显示确认对话框
- status = 0

**场景 12: 删除已有关联合同的客户**
- 后端检查关联关系
- 返回 400 错误提示

### 3.5 关联数据查询

**场景 13: 查看客户详情**
- API: `GET /customers/:id`
- Prisma include 查询合同和联系人
- Tab 页切换展示关联数据

---

## 四、产品与合同管理联调

### 4.1 产品管理模块

**场景 14: 产品列表与分类**
- API: `GET /products?category=saas`
- 分类过滤: SaaS、定制开发、咨询服务

**场景 15: 创建产品**
- API: `POST /products`
- 字段: 名称、类型、价格、描述、状态
- 价格格式验证(保留两位小数)

### 4.2 合同管理模块

**场景 16: 创建合同(关联客户和产品)**
- API: `POST /contracts`
- 关联客户和产品
- 验证客户资格、产品状态
- 合同编号唯一性

**场景 17: 合同状态流转**
- 草稿(0) → 执行中(1) → 已完成(2)
- API: `PATCH /contracts/:id/status`
- 后端记录状态变更日志

**场景 18: 合同详情(级联查询)**
- API: `GET /contracts/:id`
- Prisma include 查询客户和产品
- 展示完整关联数据

### 4.3 跨模块数据验证

**场景 19: 创建合同时验证客户资格**
- 只有"已认证"客户才能创建合同
- 前端下拉列表过滤
- 后端再次验证

**场景 20: 产品价格变更历史**
- 合同存储创建时快照价格
- 新合同使用最新价格

---

## 五、支付管理联调

### 5.1 支付订单创建

**场景 21: 创建支付订单**
- API: `POST /payment-orders`
- 验证合同状态
- 检查未支付订单总金额
- 生成支付订单号

### 5.2 支付状态回调

**场景 22: 支付成功回调**
- API: `POST /payments/callback`
- 验证签名
- 更新订单状态
- 触发业务逻辑

**场景 23: 前端轮询支付状态**
- API: `GET /payment-orders/:id/status`
- 每 3 秒轮询一次
- 状态变更后停止轮询

**优化**: 使用 WebSocket 替代轮询

### 5.3 支付记录查询

**场景 24: 查看支付历史**
- API: `GET /payments?contractId=xxx`
- 显示所有支付记录
- 支持时间范围过滤

### 5.4 异常处理

**场景 25: 支付超时自动取消**
- 定时任务检查待支付订单
- 超过 30 分钟自动取消

**场景 26: 部分支付处理**
- 记录部分支付金额
- 显示支付进度条
- 后续订单检查剩余金额

---

## 六、API 集成验证

### 6.1 OpenAPI 规范验证

**场景 27: Swagger 文档完整性检查**
- 每个接口都有请求/响应定义
- DTO 类型完整

**场景 28: Orval 生成验证**
- 重新生成 API 客户端
- TypeScript 类型检查无错误

### 6.2 类型安全测试

**场景 29: API 请求类型验证**
- TypeScript 编译时检查
- 确保请求参数类型正确

**场景 30: API 响应类型验证**
- TanStack Query 自动推断返回类型
- 响应数据类型安全

### 6.3 请求/响应格式验证

**场景 31: 后端统一响应格式**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "操作成功",
  "data": { /* 实际数据 */ }
}
```

**场景 32: 分页参数标准化**
- 请求: `{ page, pageSize }`
- 响应: `{ items, total, page, pageSize }`

### 6.4 环境变量与代理配置

**场景 33: 开发环境代理**
- Vite 代理 `/api` → 后端

**场景 34: 生产环境配置**
- 环境变量: `VITE_API_BASE_URL`
- Nginx 反向代理

---

## 七、错误处理机制联调

### 7.1 HTTP 状态码处理

**场景 35: 400 Bad Request**
- 参数验证失败
- 显示具体错误字段

**场景 36: 401 Unauthorized**
- Token 过期
- 清除 token,跳转登录

**场景 37: 403 Forbidden**
- 无权限访问
- 提示无权限

**场景 38: 404 Not Found**
- 资源不存在
- 友好提示并返回列表

**场景 39: 409 Conflict**
- 资源冲突(如编号重复)
- 提示冲突原因

**场景 40: 500 Internal Server Error**
- 服务器错误
- 友好提示,不暴露技术细节

### 7.2 网络错误处理

**场景 41: 网络超时**
- Axios 超时配置: 30 秒
- 提示检查网络连接

**场景 42: 网络断开**
- 检测离线状态
- 提供重试按钮

**场景 43: CORS 错误**
- 后端配置 CORS
- 开发环境使用 Vite 代理

### 7.3 业务错误处理

**场景 44: 乐观更新回滚**
- 更新失败时回滚 UI
- 显示错误提示

### 7.4 错误日志与监控

**场景 45: 前端错误上报**
- 全局错误监听
- API 错误上报
- 开发环境记录详细日志

### 7.5 错误提示规范

- ✅ 具体明确
- ✅ 提供解决方案
- ✅ 避免技术术语
- ✅ 使用 Toast 临时提示
- ✅ 关键操作使用 Modal 确认

---

## 八、测试工具与脚本

### 8.1 手动测试检查清单

**环境准备:**
- [ ] 后端服务运行(7890)
- [ ] 前端服务运行(3456)
- [ ] API 客户端已生成
- [ ] 无 TypeScript 错误

**认证功能:**
- [ ] 正常登录
- [ ] 错误凭据登录失败
- [ ] Token 过期自动跳转
- [ ] 退出登录

**客户管理:**
- [ ] 客户列表分页
- [ ] 创建客户
- [ ] 编辑客户
- [ ] 删除客户
- [ ] 客户详情(关联数据)

**产品管理:**
- [ ] 产品列表
- [ ] 创建产品

**合同管理:**
- [ ] 创建合同(关联客户和产品)
- [ ] 合同状态流转
- [ ] 合同详情

**支付管理:**
- [ ] 创建支付订单
- [ ] 支付状态查询
- [ ] 支付记录查询

**错误处理:**
- [ ] 400 参数错误
- [ ] 401 Token 过期
- [ ] 403 无权限
- [ ] 404 资源不存在
- [ ] 500 服务器错误
- [ ] 网络超时
- [ ] 网络断开

### 8.2 自动化测试脚本

```bash
#!/bin/bash
# frontend/scripts/test-integration.sh

echo "🧪 开始前后端联调测试..."

# 1. 环境检查
echo "📋 检查环境..."
curl -f http://localhost:7890/api-docs-json > /dev/null
echo "✅ 后端服务正常"

curl -f http://localhost:3456 > /dev/null
echo "✅ 前端服务正常"

# 2. API 生成
echo "🔄 重新生成 API 客户端..."
cd frontend
pnpm run generate:api

# 3. 类型检查
echo "🔍 TypeScript 类型检查..."
pnpm exec tsc --noEmit
echo "✅ 类型检查通过"

# 4. API 测试
echo "🧪 测试 API 端点..."
# 测试登录
curl -X POST http://localhost:7890/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

echo "✅ 联调测试完成!"
```

---

## 九、技术要点总结

### 9.1 类型安全

- Orval 自动生成类型定义
- TypeScript 编译时检查
- 运行时 Zod 验证

### 9.2 数据缓存策略

- TanStack Query 管理服务器状态
- 合理设置 `staleTime`
- 使用 `invalidateQueries` 刷新数据

### 9.3 关联查询优化

- 简单场景: Prisma include + select
- 复杂场景: 手动链接查询
- 避免 N+1 查询

### 9.4 错误处理原则

- 优雅降级
- 友好提示
- 详细日志(开发环境)
- 错误上报(生产环境)

### 9.5 性能优化

- 乐观更新
- 请求去重
- 分页加载
- 懒加载组件

---

## 十、后续优化方向

1. **自动化测试**: 引入 Vitest + Playwright 进行 E2E 测试
2. **API Mock**: 使用 MSW 进行 API Mock,提升开发效率
3. **实时通信**: 引入 WebSocket 替代轮询
4. **离线支持**: 使用 Service Worker 支持离线操作
5. **监控告警**: 集成 Sentry 等错误监控服务

---

## 附录:参考资料

- [Orval 文档](https://orval.dev/)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [NestJS 文档](https://docs.nestjs.com)
- [Prisma 文档](https://www.prisma.io/docs)
