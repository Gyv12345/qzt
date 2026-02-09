# Zod v4 i18n 使用指南

企智通项目已实现完整的 Zod v4 多语言验证支持。

## 快速开始

### 前端使用

#### 1. 使用 `useZodSchema` Hook

```tsx
import { useZodSchema, validators } from '@/hooks/use-zod-schema'

function CustomerForm() {
  const schema = useZodSchema((t) => ({
    name: validators.requiredString(t, 1, 200),
    email: validators.email(t).optional(),
    phone: validators.phone(t),
    website: validators.url(t),
  }))

  const form = useForm({ resolver: zodResolver(schema) })
  // ...
}
```

#### 2. 可用的验证器

| 验证器 | 说明 |
|--------|------|
| `validators.email(t)` | 邮箱验证 |
| `validators.phone(t)` | 手机号验证 |
| `validators.url(t)` | 网址验证 |
| `validators.cuid(t)` | CUID 验证 |
| `validators.requiredString(t, min, max)` | 必填字符串 |
| `validators.positiveNumber(t)` | 正数 |
| `validators.nonNegativeNumber(t)` | 非负数 |

#### 3. 自定义错误消息

```tsx
const schema = useZodSchema((t) => ({
  username: z.string()
    .min(3, { error: t('validation.string.min', { min: 3 }) })
    .max(50, { error: t('validation.string.max', { max: 50 }) }),
}))
```

### 后端使用

#### 1. 导入验证器工厂

```ts
import { v } from '@/common/validation/zod-i18n'

export const createUserSchema = z.object({
  email: v.email(),
  phone: v.phone(),
  name: v.requiredString(1, 50),
})
```

#### 2. 使用 i18n 错误处理

```ts
import { ZodI18nError, validateAndThrow } from '@/common/validation/zod-i18n'

async createUser(dto: CreateUserDto) {
  const result = await validateAndThrow(createUserSchema, dto, this.i18n)
  // ...
}
```

## i18n 翻译键

所有验证消息已在 `i18n/locales/*/translation.json` 中定义：

```json
{
  "validation": {
    "_required": "此字段为必填项",
    "string": {
      "min": "至少需要 {{min}} 个字符",
      "max": "最多 {{max}} 个字符",
      "email": "请输入有效的邮箱地址",
      "phone": "手机号格式不正确"
    },
    "number": {
      "positive": "必须大于 0",
      "nonnegative": "必须大于等于 0"
    }
  }
}
```

## 迁移现有 Schema

### 从硬编码迁移到 i18n

**之前：**
```ts
export const customerSchema = z.object({
  name: z.string().min(1, '公司名称不能为空'),
  email: z.string().email('请输入有效的邮箱地址'),
})
```

**之后（前端）：**
```tsx
const schema = useZodSchema((t) => ({
  name: z.string().min(1, { error: t('validation._required') }),
  email: z.string().email({ error: t('validation.string.email') }),
}))
```

**之后（后端）：**
```ts
import { v } from '@/common/validation/zod-i18n'

export const customerSchema = z.object({
  name: v.requiredString(1, 200),
  email: v.email().optional(),
})
```

## 注意事项

1. **Zod v4 语法**：使用 `message` 而非 `errorMap`
2. **前端必须用 Hook**：`useZodSchema` 确保与 i18n 同步
3. **后端使用工厂**：`v.xxx()` 提供默认中文消息
4. **shared-types**：仅定义类型，不包含具体错误消息
