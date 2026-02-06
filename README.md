# 企账通 (QZT)

<div align="center">

<!-- 基础信息 -->
![Version](https://img.shields.io/badge/version-2.2.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E=20.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.9.3-3178C6)

<!-- 后端技术栈 -->
![NestJS](https://img.shields.io/badge/nestjs-10.0.0-E0234E?style=flat-square&logo=nestjs)
![Prisma](https://img.shields.io/badge/prisma-5.7.1-0C344B?style=flat-square&logo=prisma)
![Redis](https://img.shields.io/badge/redis-4.6.11-DC382D?style=flat-square&logo=redis)

<!-- 前端技术栈 -->
![React](https://img.shields.io/badge/react-19.2.3-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/vite-7.3.0-646CFF?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/tailwind-4.1.18-06B6D4?style=flat-square&logo=tailwind-css)
![TanStack](https://img.shields.io/badge/tanstack--query-5.90.12-FF4154?style=flat-square)

<!-- 开发工具 -->
![PNPM](https://img.shields.io/badge/pnpm-monorepo-F69220?style=flat-square&logo=pnpm)
![PM2](https://img.shields.io/badge/pm2-5.4.2-2B037A?style=flat-square&logo=pm2)

<!-- 项目状态 -->
![Development](https://img.shields.io/badge/status-active-success)
![AI](https://img.shields.io/badge/AI-Glm--4.7-8B5CF6?style=flat-square)

<br/>

> 企业客户关系管理系统 - 第五版

一个使用 **Claude Code** + **GLM-4.7** 开发的现代化 CRM 系统。从 2025 年 9 月开始，经历了五次重构，最终选择了这套技术栈。

[在线演示](#) · [快速开始](#快速开始) · [功能介绍](#功能模块) · [开发文档](#开发理念) · [English](./README.en.md)

**⭐ 如果这个项目对你有帮助，请给一个 Star**

</div>

---

## 技术栈

### 后端
![NestJS](https://img.shields.io/badge/NestJS-10.0.0-E0234E?style=flat-square&logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-5.7.1-0C344B?style=flat-square&logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-3178C6?style=flat-square&logo=typescript)

| 技术 | 版本 | 说明 |
|------|------|------|
| NestJS | ^10.0.0 | 渐进式 Node.js 框架 |
| Prisma | ^5.7.1 | 现代化 ORM |
| JWT | ^10.2.0 | JSON Web Token 认证 |
| Passport | ^10.0.3 | 认证中间件 |
| BullMQ | ^5.67.2 | Redis 队列 |
| Redis | ^4.6.11 | 缓存与消息队列 |

### 前端
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7.3.0-646CFF?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1.18-06B6D4?style=flat-square&logo=tailwind-css)

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.2.3 | UI 框架 |
| TanStack Router | ^1.141.2 | 类型安全的路由 |
| TanStack Query | ^5.90.12 | 服务器状态管理 |
| shadcn/ui | - | 可复制粘贴的组件库 |
| Tailwind CSS | ^4.1.18 | 原子化 CSS 框架 |
| react-i18next | ^16.5.4 | 国际化 |
| Recharts | ^3.6.0 | 数据可视化 |

### 开发工具
| 工具 | 用途 |
|------|------|
| pnpm | monorepo 包管理 |
| Orval | OpenAPI 客户端生成 |
| PM2 | 生产环境进程管理 |
| Playwright | E2E 测试 |

### AI 辅助开发
- **主模型**: GLM-4.7
- **工具**: Claude Code 
---

## 项目历程

| 版本 | 时间                | 技术栈 | 结果 |
|------|-------------------|--------|------|
| 第一版 | 2025.09           | Java 分布式 → 单体 | ❌ AI 幻觉严重，代码混乱 |
| 第二版 | 2025.10           | React + Node.js | ❌ 技术栈不熟悉，调试困难 |
| 第三版 | 2025.11           | Java + 自研前端 | ❌ 前端白屏问题无法解决 |
| 第四版 | 2025.11 - 2025.01 | Java + 外包前端 | ❌ 进度慢，接口定义混乱 |
| **第五版** | **2026.02 - 至今**  | **NestJS + React** | ✅ **OpenAPI 约定，前后端同步** |

---

## 开发理念

### Vibe Coding 心得

1. **Skill 是关键**：从 Claude Code 的 Skill 功能发布后，开发效率大幅提升
2. **上下文意识**：AI 需要完整的代码上下文，而非碎片化的指令
3. **约定优于配置**：通过 OpenAPI 强制前后端接口约定
4. **承认局限**：没有顶级模型加持时，选择传统 CRUD 项目，避免过度设计


---

## 项目统计

<div align="center">

| 指标 | 数值 |
|------|------|
| 📦 后端 TS/TSX 文件 | 202 |
| 🎨 前端 TS/TSX 文件 | 526 |
| 📄 总代码行数 | ~30,000+ |
| 🔧 NPM 依赖 | ~80+ |
| 📅 开发周期 | 5 个月 |
| 🔄 主要重构 | 5 次 |

</div>

---

## 快速开始

```bash
# 克隆项目
git clone https://github.com/Gyv12345/qzt.git
cd qzt

# 安装依赖
pnpm install

# 启动开发服务
./start-dev.sh

# 前端: http://localhost:3456
# 后端: http://localhost:7890
# API 文档: http://localhost:7890/api-docs
```

---

## 功能模块

- 👥 **用户管理**: 用户 CRUD、角色分配、部门管理
- 🏢 **客户管理**: 客户信息、跟进记录、统计面板
- 📄 **合同管理**: 合同全生命周期管理
- 💰 **产品管理**: 产品与服务配置
- 🔐 **双因素认证**: TOTP 验证、备份码
- 📊 **日志系统**: 登录日志、操作日志

---

## 开发模式演进

### 早期模式 (2025.09 - 2025.12)
- 使用 Superpower 插件
- 手动管理上下文
- 频繁切换 AI 工具

### 当前模式 (2026.02 起)
- **Plan 模式**: 先规划，再执行
- **Conductor IDE**: 多功能并行推进
- **单一模型流**: 避免高峰期切换，保持一致性

---

## 为什么是第五版？

### 前四版的问题

1. **技术栈不熟悉**: React/Node/TypeScript 学习成本高
2. **前后端分离成本**: 接口定义、联调、版本管理
3. **AI 能力限制**: 模型幻觉、上下文丢失、高峰降速
4. **项目管理**: 外包协作、进度不可控

### 第五版的改进

1. **OpenAPI 驱动**: 后端先行，生成前端 API，类型安全
2. **统一开发**: 单一代码库，使用 pnpm workspace
3. **Skill 复用**: 沉淀最佳实践，减少重复沟通
4. **接受现实**: 顶级模型很贵，GLM 够用就好

---

## 致谢

- [Claude Code Infrastructure Showcase](https://github.com/anthropics/anthropic-quickstarts) - 几个月、几十万行代码的经验分享
- [shadcn/ui](https://ui.shadcn.com/) - 优美的 React 组件库
- 智谱 AI - 大管量、高性价比的 AI 服务

---

## License

MIT

---

> "从 9 月到现在，我积攒了很多 vibe coding 的经验。虽然我没有顶级模型，只能向着传统的管理项目着手。但那又怎样？慢慢来，比较快。"
