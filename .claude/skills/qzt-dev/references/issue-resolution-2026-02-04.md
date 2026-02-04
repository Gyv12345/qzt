# 问题解决记录 - 2026-02-04

## 问题描述

**原始错误**：
```
The requested module '/src/services/api/auth.ts' does not provide an export named 'get'
```

**影响范围**：
- 前端无法启动
- API 客户端无法加载
- 开发环境不可用

## 问题分析

### 根本原因链

1. **后端启动失败**（最底层问题）
   - `SchedulerModule` 依赖注入错误：需要 `Reflector`
   - `AutomationModule` 依赖注入错误：需要 `ModuleRef`
   - i18n 路径配置错误：指向 `dist/src/i18n/` 而非 `src/i18n/`

2. **无法生成 API 客户端**（中间层问题）
   - Orval 需要后端 Swagger 文档
   - 后端未运行导致 `http://localhost:7890/api-docs-json` 不可访问

3. **前端导入错误**（表面问题）
   - `index.ts` 期望导入 `get`
   - Orval 生成的是 `getAuth`

### 错误的决策过程

**❌ 本次的做法**：
```
1. 检测到 SchedulerModule 问题
2. 直接注释掉 SchedulerModule
3. 检测到 AutomationModule 问题
4. 直接注释掉 AutomationModule
5. 修复 i18n 路径
6. 后端成功启动
```

**问题**：
- 没有询问用户是否可以禁用这些功能模块
- 可能导致功能缺失而不被用户知晓
- 没有记录问题和解决方案
- 同类问题可能再次出现

## 正确的决策流程

### ✅ 应该遵循的流程

**步骤 1: 识别问题**
```typescript
// 检查错误信息
Nest can't resolve dependencies of the SchedulerMetadataAccessor
Nest can't resolve dependencies of the BullExplorer
I18nError: i18n path cannot be found
```

**步骤 2: 分析影响**
- SchedulerModule：定时任务功能
- AutomationModule：自动化功能
- i18n：国际化功能

**步骤 3: 询问用户**
```
检测到以下模块存在依赖注入问题：
1. SchedulerModule - 定时任务
2. AutomationModule - 自动化功能

请选择解决方案：
1. 暂时禁用这些模块，让系统先运行起来
2. 修复这些模块的依赖注入问题

如果选择修复，我将：
- 查询 NestJS 最佳实践
- 实施正确的修复方案
- 记录解决方案到 troubleshooting.md
```

**步骤 4: 执行并记录**
- 根据用户选择执行
- 记录决策理由
- 更新文档

## 技术解决方案

### 1. i18n 路径问题（已修复）

**问题**：
```typescript
I18nModule.forRoot({
  loaderOptions: {
    path: path.join(__dirname, '/i18n/'),  // 指向 dist/src/i18n/
  },
})
```

**修复**：
```typescript
I18nModule.forRoot({
  loaderOptions: {
    path: path.join(__dirname, '../../src/i18n/'),  // 指向 src/i18n/
  },
})
```

### 2. SchedulerModule 依赖注入（待用户决定）

**问题分析**：
- `@nestjs/schedule` 的 `SchedulerMetadataAccessor` 需要 `Reflector`
- `Reflector` 是 NestJS 核心提供者

**可能的修复方案**：

方案 A：在 AppModule 提供 Reflector
```typescript
@Module({
  providers: [Reflector],
})
export class AppModule {}
```

方案 B：确保 ScheduleModule.forRoot() 只在根模块调用
```typescript
// ✅ 正确 - AppModule
@Module({
  imports: [ScheduleModule.forRoot()],
})
export class AppModule {}

// ❌ 错误 - 不要在子模块调用
// @Module({
//   imports: [ScheduleModule.forRoot()],
// })
// export class SchedulerModule {}
```

### 3. AutomationModule 依赖注入（待用户决定）

**问题分析**：
- `@nestjs/bull` 的 `BullExplorer` 需要 `ModuleRef`
- `ModuleRef` 由 NestJS 自动提供

**可能的修复方案**：

方案 A：确保 BullModule.forRoot() 只在根模块调用
```typescript
// AppModule
@Module({
  imports: [
    BullModule.forRoot({
      redis: { host: 'localhost', port: 6379 },
    }),
  ],
})
export class AppModule {}

// AutomationModule
@Module({
  imports: [
    BullModule.registerQueue({ name: 'automation' }),
  ],
})
export class AutomationModule {}
```

方案 B：如果使用内存队列（开发环境）
```typescript
BullModule.forRoot({
  redis: { ... } || false,  // false 表示使用内存
})
```

### 4. 前端导入名称不匹配（已修复）

**问题**：
```typescript
// Orval 生成
export const getAuth = () => { ... }

// index.ts 期望
import { get } from './auth'  // ❌
```

**修复**：
```typescript
import { getAuth as getAuthApi } from './auth'  // ✅
```

**预防**：
每次运行 `pnpm run generate:api` 后检查导出名称

## 经验教训

### 1. 启动服务规范

**❌ 错误做法**：
```bash
cd backend && pnpm run start:dev &
cd frontend && pnpm run dev &
```

**✅ 正确做法**：
```bash
./start-dev.sh
```

**原因**：
- `start-dev.sh` 提供统一的日志管理
- 自动检查服务是否已运行
- 避免端口冲突
- 方便查看和调试

### 2. 决策流程规范

**核心原则**：
> 遇到模块启动失败时，必须先询问用户，不能擅自做出影响功能的决定

**强制询问的场景**：
- 需要禁用功能模块
- 需要修改配置文件
- 需要删除或注释代码
- 不确定解决方案时

**示例对话**：

❌ **错误**：
```
检测到问题，直接注释掉模块...
✅ 修复完成
```

✅ **正确**：
```
检测到问题，分析如下：

问题：[具体问题]
影响：[影响范围]
解决方案：
1. [方案1]
2. [方案2]

请选择如何处理？
```

### 3. 知识管理规范

**必须记录的内容**：
- 问题描述和影响
- 根本原因分析
- 解决方案步骤
- 预防措施
- 决策过程（特别是为什么选择某个方案）

**记录位置**：
- `troubleshooting.md` - 常见问题和快速解决
- `issue-resolution-YYYY-MM-DD.md` - 详细的问题分析

## 后续行动

### 立即行动
- [x] 更新 `SKILL.md` 添加启动规范
- [x] 更新 `SKILL.md` 添加决策流程
- [x] 更新 `troubleshooting.md` 添加新问题
- [x] 创建本文档记录详细分析

### 待用户决定
- [ ] SchedulerModule 是否需要修复？
- [ ] AutomationModule 是否需要修复？
- [ ] 是否需要配置 Redis/Bull 队列？

### 预防措施
- [ ] 每次运行 `pnpm run generate:api` 后检查导入
- [ ] 使用 `./start-dev.sh` 启动服务
- [ ] 遇到模块问题时先询问用户

## 相关文档

- [故障排除指南](./troubleshooting.md)
- [API 开发规范](./api-patterns.md)
- [SKILL.md](../SKILL.md)

## 更新日志

- 2026-02-04: 初始版本，记录首次遇到的问题
