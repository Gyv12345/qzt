# QZT Packages

企智通 Monorepo 共享包目录

[English](./README.en.md)

## 包列表

### [@qzt/shared-types](./shared-types/)

前后端共享的 TypeScript 类型定义。

**技术栈**: TypeScript, Zod

**用途**:
- API 响应类型定义
- 数据模型共享
- 类型安全验证

**使用方式**:
```typescript
// 后端
import { PaginatedResponseDto } from '@qzt/shared-types'

// 前端
import { type Customer } from '@qzt/shared-types'
```

## 开发命令

```bash
# 构建所有包
pnpm -F @qzt/shared-types build

# 开发模式（监听文件变化）
pnpm -F @qzt/shared-types dev

# 类型检查
pnpm -F @qzt/shared-types type-check
```

## 许可证

MIT
