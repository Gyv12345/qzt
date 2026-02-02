# 测试指南

## 后端测试

1. 启动后端:
```bash
cd backend
npm install
cp .env.example .env.development
npm run start:dev
```

2. 访问Swagger文档:
http://localhost:3456/api-docs

3. 测试健康检查:
```bash
curl http://localhost:3456/health
```

4. 测试登录:
```bash
curl -X POST http://localhost:3456/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

## 前端测试

1. 启动后端(确保后端先运行)

2. 启动前端:
```bash
cd frontend
npm install
npm run dev
```

3. 访问:
http://localhost:7890

## OpenAPI生成测试

1. 确保后端运行在 http://localhost:3456

2. 在前端目录运行:
```bash
cd frontend
npm run openapi
```

3. 检查生成的文件:
- `src/services/typings.d.ts`
- `src/services/api.ts`
