# 企账通后端功能完善 - PRD 任务文件

## 📋 概述

本目录包含企账通后端功能完善的 PRD 文件，已转换为 ralph-tui 可执行的 JSON 格式。

## 📁 文件说明

- `prd-qzt-backend-features.json` - Ralph TUI 任务配置文件
- `prd-qzt-backend-features.md` - PRD 原始文档（如果有）

## 🚀 使用方法

### 1. 使用 Ralph TUI 执行任务

```bash
# 查看任务列表
ralph-tui run --prd ./tasks/prd-qzt-backend-features.json

# 或者指定工作目录
ralph-tui run --prd ./tasks/prd-qzt-backend-features.json --cwd /path/to/backend
```

### 2. 查看任务统计

```bash
# 查看任务总数
cat tasks/prd-qzt-backend-features.json | jq '.userStories | length'

# 查看有依赖的任务数
cat tasks/prd-qzt-backend-features.json | jq '[.userStories[] | select(.dependsOn | length > 0)] | length'

# 查看任务优先级分布
cat tasks/prd-qzt-backend-features.json | jq '.userStories | group_by(.priority) | map({priority: .[0].priority, count: length}) | sort_by(.priority)'
```

## 📊 任务概览

- **总任务数**: 33 个用户故事
- **有依赖的任务**: 24 个
- **独立任务**: 9 个
- **分支名称**: `ralph/qzt-backend-features`

## 🎯 功能模块

### 1. 自动化规则引擎 (US-001 ~ US-004)
- 条件树嵌套逻辑评估
- 工作流动作类型扩展
- 工作流触发机制
- 工作流执行器完善

### 2. 产品流程执行引擎 (US-005 ~ US-009)
- 通知节点执行逻辑
- 任务节点执行逻辑
- 流程执行策略
- 流程执行状态管理
- 流程异常处理

### 3. 新媒体多平台发布 (US-010 ~ US-014)
- 平台令牌自动刷新
- 单平台内容发布
- 多平台同时发布
- 定时发布功能
- 发布状态跟踪

### 4. 在线支付集成 (US-015 ~ US-019)
- Mock 支付提供者
- 证书管理服务
- 支付模式切换和降级策略
- 支付配置 CRUD 接口
- 测试支付接口

### 5. Webhook 通知集成 (US-020 ~ US-028)
- 全局 Webhook 服务
- Webhook 模板管理
- Webhook 发送策略
- 集成到产品流程
- 集成到自动化规则
- 集成到支付事件
- 集成到合同事件
- Webhook 配置管理接口
- Webhook 发送记录查询

### 6. API 版本管理 (US-029 ~ US-033)
- 版本号自动管理
- Swagger 中显示版本信息
- 版本查询接口
- 自动生成 CHANGELOG
- 交付打包功能

## ✅ 质量门禁

每个用户故事都必须满足以下质量门禁：

- `pnpm run build passes` - TypeScript 编译通过
- `pnpm test passes with 60% coverage` - 测试覆盖率不低于 60%
- `npx prisma migrate dev validates` - Prisma 迁移验证通过
- `npx prisma generate passes` - Prisma Client 生成成功
- 完整的 Swagger API 文档注解

## 🔍 依赖关系示例

```json
{
  "id": "US-004",
  "title": "完善工作流执行器",
  "dependsOn": ["US-002", "US-003"]
}
```

这意味着 US-004 必须在 US-002 和 US-003 完成后才能开始执行。

## 📝 任务执行流程

1. Ralph TUI 选择优先级最高且无阻塞依赖的任务
2. 生成详细的提示词（包含故事描述、验收标准）
3. 启动 AI 代理执行任务
4. 验证质量门禁是否通过
5. 标记任务为 `passes: true`
6. 重复上述过程，直到所有任务完成

## 🎓 学习要点

### 细粒度任务拆分
- 每个任务可在 2-4 小时内完成
- 单一职责，易于验证
- 依赖关系清晰

### 质量门禁设计
- 编译检查确保类型安全
- 单元测试确保代码质量
- 迁移验证确保数据库一致性
- Swagger 文档确保 API 可维护性

### 依赖关系管理
- 数据库变更优先（无依赖）
- 后端逻辑次之（依赖数据库）
- 集成功能最后（依赖前两者）

## 📞 联系方式

如有问题，请查看项目文档或联系开发团队。

---

**生成时间**: 2025-02-04  
**版本**: 1.0.0  
**工具**: Ralph TUI PRD Generator
