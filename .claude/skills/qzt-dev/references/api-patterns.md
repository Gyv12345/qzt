# QZT API 开发规范和模式

## ⚠️ 核心规则

**前端绝对不能直接修改或手写 API 调用代码！**

## 完整开发流程

### 1. 后端开发 API

在 NestJS 中开发或修改 API 接口，确保：

```typescript
// backend/src/customers/customers.controller.ts
@Controller('customers')
export class CustomerController {
  @Get()
  findAll(@Query() query: any) {
    // 实现逻辑
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // 实现逻辑
  }

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    // 实现逻辑
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    // 实现逻辑
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // 实现逻辑
  }
}
```

**重要**: 确保 Swagger 注解正确，以便 Orval 能生成正确的类型定义。

### 2. 启动后端服务

```bash
cd backend
pnpm run start:dev
```

确认后端运行在 `http://localhost:7890`。

### 3. 生成前端 API 客户端

```bash
cd frontend
pnpm run generate:api
```

Orval 会从 `http://localhost:7890/api-docs-json` 获取 OpenAPI spec，并生成：
- `src/services/api.ts` - API 函数
- `src/models/` - TypeScript 类型定义

### 4. 检查生成的类型

```bash
# 查看生成的类型
cat frontend/src/models/customerControllerFindAllParams.ts

# 查看 API 函数
cat frontend/src/services/api.ts | grep -A 5 "customerControllerFindAll"
```

### 5. 前端使用生成的 API

```typescript
// frontend/src/pages/customer/CustomerList.tsx
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'

export function CustomerList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', { page: 1, pageSize: 10 }],
    queryFn: () => getScrmApi().customerControllerFindAll({
      page: 1,
      pageSize: 10,
    }),
  })

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return (
    <div>
      {data?.data.map((customer) => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  )
}
```

## API 配置详解

### Mutator 配置（Axios 实例）

```typescript
// frontend/src/services/mutator.ts
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: 'http://localhost:7890',  // ✅ 直接指向后端，无 /api 前缀
  timeout: 10000,
})

// 请求拦截器：添加 token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理错误
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const customInstance = async ({ url, method, data, params }) => {
  const response = await axiosInstance.request({
    url,
    method,
    data,
    params,
  })
  return response.data
}
```

### Vite 代理配置（开发环境）

```typescript
// frontend/vite.config.ts
export default defineConfig({
  server: {
    port: 3456,
    proxy: {
      '/api': {
        target: 'http://localhost:7890',
        changeOrigin: true,
        // ⚠️ 不需要 pathRewrite！因为后端路由不带 /api
      },
    },
  },
})
```

**注意**: 这个代理配置仅用于开发环境，实际生产部署需要配置 Nginx 反向代理。

### 实际请求流程

1. **前端代码调用**:
   ```typescript
   getScrmApi().customerControllerFindAll({ page: 1 })
   ```

2. **Orval 生成的 API**:
   ```typescript
   // src/services/api.ts
   const customerControllerFindAll = (params) => {
     return customInstance({
       url: `/customers`,  // ✅ 无前缀
       method: 'GET',
       params,
     })
   }
   ```

3. **Mutator Axios 实例**:
   ```typescript
   baseURL: 'http://localhost:7890'
   url: `/customers`
   // 最终请求: http://localhost:7890/customers
   ```

4. **后端接收**:
   ```typescript
   @Controller('customers')  // ✅ 路径匹配
   @Get()
   findAll() { }
   ```

## ❌ 常见错误

### 错误 1: 手动添加 /api 前缀

```typescript
// ❌ 错误
getScrmApi().customerControllerFindAll({ page: 1 })
// 修改为:
request('/api/customers')  // 会变成 /api/api/customers 或错误
```

### 错误 2: 修改 Orval 生成的文件

```typescript
// ❌ 不要手动修改 src/services/api.ts
// ✅ 如果需要自定义，创建适配器层
```

```typescript
// ✅ 正确做法：创建适配器
// frontend/src/lib/api-adapter.ts
import { getScrmApi } from '@/services/api'

export const qztApi = {
  getCustomers: (params) =>
    getScrmApi().customerControllerFindAll(params),
  // 可以添加额外的逻辑，如缓存、重试等
}
```

### 错误 3: 使用错误的 baseURL

```typescript
// ❌ 错误
const axiosInstance = axios.create({
  baseURL: 'http://localhost:7890/api',  // 不要加 /api
})

// ✅ 正确
const axiosInstance = axios.create({
  baseURL: 'http://localhost:7890',
})
```

## 调试技巧

### 检查 API 是否正常

```bash
# 1. 检查后端 Swagger 文档
curl http://localhost:7890/api-docs-json

# 2. 检查后端 API
curl http://localhost:7890/customers

# 3. 检查前端 Orval 生成
ls frontend/src/services/api.ts
ls frontend/src/models/

# 4. 浏览器开发者工具
# Network 面板查看实际请求 URL
# 应该是: http://localhost:7890/customers
# 不应该是: http://localhost:7890/api/customers
```

### 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 404 错误 | API 路径错误 | 检查是否有 `/api` 前缀 |
| CORS 错误 | 后端未配置 CORS | 在 backend/main.ts 添加 CORS 配置 |
| 类型错误 | 未重新生成 API | 运行 `pnpm run generate:api` |
| 401 错误 | Token 未添加 | 检查 mutator 拦截器 |

## 响应拦截器的影响

**重要**: `api-client.ts` 的响应拦截器会自动提取 `data.data`，所以返回的数据已经去除了外层包装。

```typescript
// 后端统一响应格式
{
  "success": true,
  "statusCode": 200,
  "message": "操作成功",
  "data": {
    "items": [...],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}

// 拦截器自动提取 data 字段
// 所以返回的是 { items, total, page, pageSize }
```

**在 API Hooks 中**:
```typescript
// ✅ 正确 - 直接返回 API 调用结果
queryFn: async () => {
  return await getScrmApi().customerControllerFindAll(params)
}

// ❌ 错误 - response.data 是 undefined
queryFn: async () => {
  const response = await getScrmApi().customerControllerFindAll(params)
  return response.data  // undefined!
}
```
