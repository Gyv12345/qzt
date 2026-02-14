# 移除 Website 项目设计文档

> 日期：2025-02-14
> 状态：已批准
> 目的：集中精力于核心业务系统，移除分散精力的 website 项目

---

## 背景

Website 是一个基于 Next.js 15 的公司官网项目，与核心业务系统（SCRM）关联度低。为减少维护负担和精力分散，决定从 monorepo 中完全移除。

## 决策

**方案 A：激进清理** - 彻底删除 website 相关代码、配置和文档引用。

## 清理范围

### 1. 删除目录和文件

| 路径 | 说明 |
|------|------|
| `website/` | 整个目录（含 .next 构建缓存） |
| `.claude/plans/fuzzy-moseying-wozniak.md` | 过时的部署计划文件 |

### 2. 修改配置文件

**pnpm-workspace.yaml** - 移除 `'website'` 行

### 3. 更新文档

| 文件 | 修改内容 |
|------|----------|
| `CLAUDE.md` | 移除 Website 章节、清理命令、依赖示例 |
| `.claude/skills/glm-monorepo/SKILL.md` | 同步 CLAUDE.md 的变更 |
| `README.md` | 项目结构表格移除 website 行 |
| `README.en.md` | 同步英文版 |
| `docs/DEPLOYMENT.md` | 移除 qzt-website 进程引用 |
| `docs/GIT_FLOW.md` | 移除 website 分支约定 |

### 4. 后续操作

- 运行 `pnpm install` 更新 lock 文件
- 提交变更：`chore: 移除 website 项目，集中精力于核心业务`

## 不涉及的内容

- `frontend/src/i18n/locales/*/translation.json` 中的 "website" 字段 - 这是业务表单字段（如"客户网站"），与项目无关

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 未来需要恢复 | git 历史保留所有代码，可随时恢复 |
| 文档链接断裂 | 全量搜索并更新所有引用 |

## 成功标准

- [ ] `website/` 目录不存在
- [ ] `pnpm-workspace.yaml` 无 website 引用
- [ ] 所有文档无 website 死链接
- [ ] `pnpm install` 正常执行
- [ ] 前端、后端服务正常启动
