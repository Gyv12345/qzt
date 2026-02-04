# QZT 国际化（i18n）实现总结

## 📋 概述

企账通（QZT）项目已完成前后端国际化配置，支持**中文（默认）**和**英文**两种语言。

**实现日期**: 2026-02-04

## ✅ 完成的工作

### 1. 后端国际化（nestjs-i18n）

#### 安装依赖
```bash
cd backend && pnpm add nestjs-i18n
```

#### 文件结构
```
backend/src/i18n/
├── zh/                    # 中文翻译
│   ├── auth.json         # 认证相关
│   ├── common.json       # 通用消息
│   └── customer.json     # 客户相关
└── en/                    # 英文翻译
    ├── auth.json
    ├── common.json
    └── customer.json
```

#### 配置模块（app.module.ts）
```typescript
I18nModule.forRoot({
  fallbackLanguage: 'zh',  // 默认中文
  loaderOptions: {
    path: path.join(__dirname, '/i18n/'),
    watch: true,           // 开发环境热重载
  },
  resolvers: [AcceptLanguageResolver],  // 自动解析请求头
})
```

#### 使用示例（auth.service.ts）
```typescript
import { I18nService } from 'nestjs-i18n';

constructor(private i18n: I18nService) {}

// 错误消息国际化
throw new UnauthorizedException(this.i18n.t('auth.INVALID_CREDENTIALS'));
```

### 2. 前端国际化（i18next）

#### 安装依赖
```bash
cd frontend && pnpm add i18next react-i18next i18next-browser-languagedetector
```

#### 文件结构
```
frontend/src/i18n/
├── config.ts                    # i18n 配置
└── locales/
    ├── zh/
    │   └── translation.json     # 中文翻译
    └── en/
        └── translation.json     # 英文翻译
```

#### 配置（i18n/config.ts）
```typescript
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',           // 默认中文
    lng: 'zh',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });
```

#### 使用示例（React 组件）
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('common.success')}</h1>;
}

// 切换语言
const { i18n } = useTranslation();
i18n.changeLanguage('en');  // 切换到英文
```

### 3. 前后端协同

#### API 客户端配置（api-client.ts）
```typescript
// 自动添加 Accept-Language 请求头
const language = localStorage.getItem('i18nextLng') || 'zh'
config.headers['Accept-Language'] = language
```

#### 工作流程
1. 用户在前端切换语言（如切换到英文）
2. 前端保存到 `localStorage`：`i18nextLng: 'en'`
3. API 请求自动添加请求头：`Accept-Language: en`
4. 后端 `AcceptLanguageResolver` 自动解析
5. 后端返回英文错误消息

## 📚 翻译文件示例

### 后端翻译（backend/src/i18n/zh/auth.json）
```json
{
  "INVALID_CREDENTIALS": "用户名或密码错误",
  "ACCOUNT_DISABLED": "账号已被禁用",
  "USER_NOT_FOUND": "用户不存在",
  "UNAUTHORIZED": "未授权，请先登录"
}
```

### 前端翻译（frontend/src/i18n/locales/zh/translation.json）
```json
{
  "common": {
    "success": "操作成功",
    "error": "操作失败",
    "confirm": "确认",
    "cancel": "取消"
  },
  "auth": {
    "login": "登录",
    "username": "用户名",
    "invalidCredentials": "用户名或密码错误"
  }
}
```

## 🎯 最佳实践

### 后端开发
1. **所有用户可见的消息必须使用 i18n**
   ```typescript
   // ✅ 正确
   throw new UnauthorizedException(this.i18n.t('auth.INVALID_CREDENTIALS'));

   // ❌ 错误 - 硬编码中文
   throw new UnauthorizedException('用户名或密码错误');
   ```

2. **翻译 key 命名规范**
   - 使用大写字母和下划线：`INVALID_CREDENTIALS`
   - 按模块分组：`auth.INVALID_CREDENTIALS`
   - 语义化命名：`USER_NOT_FOUND` 而非 `ERROR_001`

3. **添加新翻译时**
   - 同时添加中文和英文版本
   - 保持 key 一致
   - 在对应模块的 JSON 文件中添加

### 前端开发
1. **所有 UI 文本使用 i18n**
   ```tsx
   // ✅ 正确
   <Button>{t('common.confirm')}</Button>

   // ❌ 错误 - 硬编码中文
   <Button>确认</Button>
   ```

2. **翻译 key 命名规范**
   - 使用小写字母和点号：`common.success`
   - 按功能分组：`auth.login`、`customer.title`
   - 语义化命名：`loginSuccess` 而非 `text1`

3. **动态内容使用插值**
   ```tsx
   // 翻译文件
   {
     "welcome": "欢迎, {{name}}!"
   }

   // 组件
   <div>{t('welcome', { name: '张三' })}</div>
   ```

## 🔧 添加新模块的翻译

### 后端添加新模块翻译

1. 创建翻译文件：
   ```bash
   touch backend/src/i18n/zh/{module}.json
   touch backend/src/i18n/en/{module}.json
   ```

2. 添加翻译内容：
   ```json
   {
     "NOT_FOUND": "资源不存在",
     "CREATE_SUCCESS": "创建成功"
   }
   ```

3. 在 Service 中使用：
   ```typescript
   throw new NotFoundException(this.i18n.t('{module}.NOT_FOUND'));
   ```

### 前端添加新模块翻译

1. 在 `translation.json` 中添加：
   ```json
   {
     "module": {
       "title": "模块标题",
       "create": "创建",
       "edit": "编辑"
     }
   }
   ```

2. 在组件中使用：
   ```tsx
   <h1>{t('module.title')}</h1>
   ```

## 🎨 UI 组件示例

### 语言切换器（LanguageSwitcher）
已创建位置：`frontend/src/components/language-switcher.tsx`

```tsx
import { LanguageSwitcher } from '@/components/language-switcher';

// 在布局中使用
<Header>
  <LanguageSwitcher />
</Header>
```

## 📖 相关文档

- [nestjs-i18n 官方文档](https://github.com/toonvanstrijp/nestjs-i18n)
- [i18next 官方文档](https://www.i18next.com/)
- [react-i18next 官方文档](https://react.i18next.com/)

## ✅ 验证清单

- [x] 后端安装 nestjs-i18n
- [x] 后端配置 I18nModule
- [x] 后端创建翻译文件（zh/en）
- [x] 后端 Service 使用 i18n
- [x] 前端安装 i18next
- [x] 前端配置 i18next
- [x] 前端创建翻译文件（zh/en）
- [x] 前端 API 客户端发送语言头
- [x] 前后端语言协同工作
- [x] 技能文档更新（SKILL.md）

## 🚀 下一步

1. 逐步将所有硬编码的中文文本迁移到 i18n
2. 为每个模块添加完整的翻译
3. 添加更多语言支持（如需要）
4. 考虑添加翻译管理后台
