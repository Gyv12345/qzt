# 企智通 (QZT)

<div align="center">

<!-- 基础信息 -->
![Version](https://img.shields.io/badge/version-2026.02.08-blue)
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
![AI](https://img.shields.io/badge/AI-Claude_Code_%2B_GLM_4.7-8B5CF6?style=flat-square)

<br/>

> 企业客户关系管理系统 - 第五版

一个使用 **Claude Code** + **智谱 GLM-4.7（国产开源大模型）** 开发的现代化 CRM 系统。从 2025 年 9 月开始，经历了五次重构，最终选择了这套技术栈。

> **🤖 100% AI 生成代码** - 本版本所有代码均由 AI 生成，**没有手敲过一行代码**。6 天完成 78,000+ 行代码，230 个后端文件，635 个前端文件。
>
> **💡 核心**：Claude Code（AI 编程工具）+ 智谱 GLM-4.7（[国产开源大模型](https://github.com/THUDM/GLM-4)）= 高性价比全栈开发方案
>
> **🚀 [智谱 GLM Coding 超值订阅](https://www.bigmodel.cn/glm-coding?ic=ROWCC3GYIC)** - 支持 Claude Code、Cline 等 20+ 编程工具，限时拼团价，高性价比 AI 编程方案！

[在线演示](#) · [快速开始](#快速开始) · [功能介绍](#功能模块) · [Git Flow](./docs/GIT_FLOW.md) · [English](./README.en.md)

**⭐ 如果这个项目对你有帮助，请给一个 Star**

</div>

---

## 项目结构

| 模块 | 说明 | 文档 |
|------|------|------|
| [backend](./backend/) | NestJS 后端 API 服务 | [中文](./backend/README.md) · [English](./backend/README.en.md) |
| [frontend](./frontend/) | React 管理后台 | [中文](./frontend/README.md) · [English](./frontend/README.en.md) |
| [website](./website/) | Next.js 官方网站 | [中文](./website/README.md) · [English](./website/README.en.md) |
| [packages](./packages/) | Monorepo 共享包 | [中文](./packages/README.md) · [English](./packages/README.en.md) |

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
- **AI 大模型**: [GLM-4.7](https://github.com/THUDM/GLM-4)（智谱 AI，国产开源）
- **编程工具**: [Claude Code](https://claude.ai/code)
- **超值订阅**: [🚀 GLM Coding 拼团](https://www.bigmodel.cn/glm-coding?ic=ROWCC3GYIC)（支持 Claude Code、Cline 等 20+ 工具）
---

## 项目历程

| 版本 | 时间                | 技术栈 | 结果 |
|------|-------------------|--------|------|
| 第一版 | 2025.09           | Java 分布式 → 单体 | ❌ AI 幻觉严重，代码混乱 |
| 第二版 | 2025.10           | React + Node.js | ❌ 技术栈不熟悉，调试困难 |
| 第三版 | 2025.11           | Java + 自研前端 | ❌ 前端白屏问题无法解决 |
| 第四版 | 2025.11 - 2025.01 | Java + 外包前端 | ❌ 进度慢，接口定义混乱 |
| **第五版** | **2026.02.02 - 至今**  | **NestJS + React** | ✅ **OpenAPI 约定，前后端同步** |

### 历程详情

**第一版：Vibe Coding 初探（2025.09）**

> "我的信念就是不敲代码"

- 起点：基于开源项目 [yt4j](https://github.com/Gyv12345/yt4j)（分布式 Java 项目）
- 尝试：让 AI 将分布式改造成单体项目，然后从零开发 CRM
- 问题：刚刚开始 Vibe Coding，AI 全是"幻觉"——生成的代码看起来正确但无法运行
- 教训：AI 需要完整的上下文和约束，不能让它自由发挥

**第二版：全栈摸索（2025.10）**

- 放弃 Java，尝试 React + Node.js
- 问题：技术栈不熟悉，遇到 bug 无法判断是 AI 写错还是自己配置问题
- 教训：不熟悉的技术栈 + AI = 调试地狱

**第三版：回头是岸（2025.11）**

- 回到 Java，但这次要让 AI 自己搞前端
- 问题：前端白屏问题无法解决，AI 和我都找不到原因
- 教训：全栈开发需要前后端都能理解，不能完全当甩手掌柜

**第四版：外包协作（2025.11 - 2026.01）**

- 把前端外包，自己专注后端
- 问题：进度慢，接口定义混乱，来回修改
- 教训：外包协作的成本比想象中高，沟通成本巨大

**第五版：OpenAPI 驱动（2026.02.02 - 至今）**

- 顿悟：先约定接口规范，用 OpenAPI 强制前后端同步
- 工具：Claude Code + Skill 机制沉淀项目约定
- 结果：6 天 78,000+ 行代码，没有手敲一行
- 核心：[Claude Code](https://claude.ai/code)（AI 编程工具）+ [智谱 GLM-4.7](https://github.com/THUDM/GLM-4)（国产开源大模型）

---

## 开发理念

### 🤖 零手写开发 (Zero-Touch Development)

> **第五版所有代码均由 AI 生成，开发者未手敲任何代码。**

**技术组合**：[Claude Code](https://claude.ai/code)（AI 编程工具）+ [智谱 GLM-4.7](https://github.com/THUDM/GLM-4)（国产开源大模型）

这是 Vibe Coding 的终极形态：
- **不写代码，只写意图** - 通过自然语言描述功能需求
- **AI 全权负责** - 从架构设计到代码实现，全部交给 Claude Code
- **人工只做决策** - 选择技术栈、确认方案、审查代码
- **效率飞跃** - 6 天完成 78,000+ 行代码，相当于传统开发 2-3 个月的工作量

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
| 📦 后端 TS 文件 | 230 |
| 🎨 前端 TS/TSX 文件 | 635 |
| 📄 总代码行数 | ~78,000 |
| 🔧 NPM 依赖 | ~116 |
| 📅 开发周期 | 6 天 |
| 🔄 主要重构 | 5 次 |

</div>

---

## 后续规划

### 产品路线图

```
┌─────────────────────────────────────────────────────────────────┐
│  第一阶段：基础能力            🚧 进行中                          │
│  ├── CRM 核心功能              🚧 客户、联系人、合同（基础 CRUD）   │
│  ├── CMS 内容管理              🚧 文章、案例（后端完成）            │
│  └── 官网                     ✅ Next.js 营销网站                 │
├─────────────────────────────────────────────────────────────────┤
│  第二阶段：完善功能            📋 待启动                          │
│  ├── CRM 完善                 📝 跟进记录、待办提醒、数据统计        │
│  ├── CMS 完善                 📝 前端管理界面、媒体库              │
│  └── 权限细化                 📝 字段级权限、数据权限             │
├─────────────────────────────────────────────────────────────────┤
│  第三阶段：自媒体管理          📋 规划中                          │
│  ├── 账号管理                 📝 微信公众号、抖音、小红书          │
│  ├── 内容发布                 📝 多平台统一发布、数据统计           │
│  └── 粉丝管理                 📝 粉丝画像、互动记录                 │
├─────────────────────────────────────────────────────────────────┤
│  第四阶段：智能获客            🔮 未来计划                        │
│  ├── 企业查询                 🔍 天眼查/企查查 API 对接            │
│  ├── 智能筛选                 🎯 地区、行业、规模多维度筛选       │
│  └── 批量导入                 📊 一键导入目标客户列表             │
├─────────────────────────────────────────────────────────────────┤
│  第五阶段：自动化运营          🔮 未来计划                        │
│  ├── 营销自动化               🤧 自动化邮件/短信营销             │
│  ├── 数据分析                 📊 客户行为分析、转化漏斗           │
│  └── AI 辅助                 🤖 AI 写作、智能客服               │
└─────────────────────────────────────────────────────────────────┘
```

### 第二阶段：完善功能模块

**目标**：补充 CRM 和 CMS 的核心业务功能，使其真正可用。

**功能规划**：

| 模块 | 功能 | 说明 |
|------|------|------|
| **CRM 完善** | 跟进记录 | 客户沟通记录、待办提醒 |
| **CRM 完善** | 数据统计 | 客户增长、销售漏斗、转化分析 |
| **CRM 完善** | 导入导出 | Excel 批量导入客户数据 |
| **CMS 完善** | 管理界面 | 后端已有 API，需要前端管理页面 |
| **CMS 完善** | 媒体库 | 图片、视频上传和管理 |
| **权限细化** | 字段权限 | 控制用户可见/可编辑的字段 |
| **权限细化** | 数据权限 | 按部门/团队隔离数据 |

### 第三阶段：自媒体管理模块

**背景**：现代 B2B 获客主要靠自媒体运营，需要一个统一管理平台。

**功能规划**：

| 模块 | 功能 | 说明 |
|------|------|------|
| **账号管理** | 多平台账号绑定 | 微信公众号、视频号、抖音、小红书 |
| **内容发布** | 统一发布 | 一次编辑，多平台分发 |
| **内容库** | 素材管理 | 图片、视频、文案统一管理 |
| **数据统计** | 效果分析 | 阅读量、点赞、转发、粉丝增长 |
| **粉丝互动** | 消息管理 | 评论、私信、粉丝画像 |
| **发布计划** | 定时发布 | 预设发布时间，自动推送 |

### 第四阶段：智能获客模块

**背景**：B2B 业务需要对公客户，需要精准查找目标企业。

**功能规划**：

| 模块 | 功能 | 说明 |
|------|------|------|
| **企业查询** | 天眼查/企查查 API | 对接第三方企业数据 API |
| **智能筛选** | 多维度筛选 | 地区、行业、规模、成立时间、经营范围 |
| **批量导入** | 一键导入 | 筛选结果直接导入 CRM 客户池 |
| **企业图谱** | 关系挖掘 | 查看企业关联关系、供应链 |
| **监控提醒** | 企业动态 | 目标企业变更、新闻、风险提醒 |

**筛选示例**：

```
查找：北京市 + 软件/信息技术行业 + 50-200人 + 成立3年以上
      + 近6个月有融资/扩招信息
→ 导出：符合条件的 500 家企业 → 分配给销售团队
```

### 第五阶段：自动化运营模块

**背景**：自动化重复性工作，利用 AI 提升效率。

**功能规划**：

| 模块 | 功能 | 说明 |
|------|------|------|
| **营销自动化** | 邮件/短信 | 自动化滴灌营销、跟进提醒 |
| **数据分析** | 行为分析 | 客户行为追踪、转化漏斗分析 |
| **AI 辅助** | 内容生成 | AI 写作、智能客服 |

---

## 快速开始

### 开发环境

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
# 网站: http://localhost:5180
# API 文档: http://localhost:7890/api-docs
```

### 生产环境部署

企智通使用 **GitHub Actions CI/CD** 实现自动化部署，服务器上只运行编译产物，无需源码。

#### 部署架构

```
GitHub (推送) → Actions (构建) → 服务器 (部署)
```

#### 首次部署步骤

**1. 服务器初始化**

```bash
# 方式1：先下载再执行（推荐，支持交互）
curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/init-server.sh -o init.sh && bash init.sh

# 方式2：进程替换（支持交互）
bash <(curl -fsSL https://raw.githubusercontent.com/Gyv12345/qzt/main/scripts/deploy/init-server.sh)

# ⚠️ 以下方式不支持交互（无法选择部署方式）
# curl ... | bash
```

**2. 配置环境变量**

```bash
vim /opt/qzt/backend/.env
```

必填项：
```bash
# 数据库
DATABASE_URL="mysql://用户名:密码@RDS地址:3306/数据库名"

# Redis（密码在 /root/.redis_password）
REDIS_PASSWORD=

# JWT（用 openssl rand -hex 32 生成）
JWT_SECRET=

# 域名（生产环境）或 IP（开发环境）
DOMAIN_NAME=yourdomain.com
ADMIN_DOMAIN=admin.yourdomain.com
```

**3. 配置 SSL 证书**

```bash
bash /opt/qzt/scripts/deploy/setup-ssl.sh
```

| 选项 | 适用场景 |
|------|---------|
| 1 | 自签名证书（开发测试） |
| 2 | 上传已有证书 |
| 3 | Let's Encrypt（需要域名） |

**4. 配置 GitHub Secrets**

在仓库 `Settings` → `Secrets and variables` → `Actions` 添加：

| Secret | 值 |
|--------|-----|
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | 服务器私钥 (`cat ~/.ssh/id_ed25519`) |
| `SSH_PORT` | `22` |

**5. 触发部署**

```bash
git push origin main
```

#### 部署方式

| 方式 | 说明 | 推荐场景 |
|------|------|----------|
| **Docker 部署** | 使用 Docker Compose 一键部署 | ✅ 推荐：快速部署、环境一致 |
| **裸机部署** | 传统方式，直接在服务器安装依赖 | 生产环境、已有服务器 |

#### Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/Gyv12345/qzt.git
cd qzt

# 一键部署（交互式脚本）
bash scripts/deploy/docker-deploy.sh
```

**Docker 部署优势**：
- 🐳 环境隔离，避免依赖冲突
- 🚀 一键部署，自动检测配置分配资源
- 🔄 支持 RDS 或本地数据库两种模式
- 📦 多阶段构建，镜像体积小

详细文档：[scripts/deploy/docker.md](./scripts/deploy/docker.md)

#### 裸机部署

| 文档 | 说明 |
|------|------|
| [scripts/deploy/README.md](./scripts/deploy/README.md) | 裸机部署完整指南（中文） |
| [scripts/deploy/README.en.md](./scripts/deploy/README.en.md) | Bare-metal deployment guide (English) |

---

## 生产环境指南

### 服务管理

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs qzt-backend      # 后端日志
pm2 logs qzt-website      # 网站日志

# 重启服务
pm2 restart all           # 重启所有
pm2 reload qzt-backend    # 零停机重载

# 监控面板
pm2 monit
```

### 日志位置

| 服务 | 日志路径 |
|------|---------|
| 后端应用 | `/opt/qzt/backend/logs/` |
| 网站应用 | `/opt/qzt/website/logs/` |
| Nginx 主站 | `/var/log/nginx/域名-access.log` |
| Nginx 管理后台 | `/var/log/nginx/admin.域名-access.log` |
| 系统日志 | `journalctl -u nginx -f` |

```bash
# 实时查看后端日志
tail -f /opt/qzt/backend/logs/pm2-combined.log

# 实时查看 Nginx 日志
tail -f /var/log/nginx/*.log
```

### 软件安装位置

| 软件 | 安装位置 | 配置文件 |
|------|---------|----------|
| Node.js | `/usr/local/bin/node` | `~/.npmrc` |
| pnpm | 通过 Corepack 管理 | - |
| PM2 | 全局 npm 包 | `/opt/qzt/backend/ecosystem.config.cjs` |
| Redis | 系统包管理器 | `/etc/redis/redis.conf` |
| Nginx | 系统包管理器 | `/etc/nginx/nginx.conf` |
| 应用代码 | `/opt/qzt/` | `/opt/qzt/backend/.env` |

### 常用命令

```bash
# Nginx
nginx -t                  # 测试配置
systemctl reload nginx    # 重载配置
systemctl status nginx    # 查看状态

# Redis
redis-cli                 # 连接
AUTH "密码"               # 认证
INFO                      # 查看信息
exit                      # 退出

# 防火墙 (UFW)
ufw status                # 查看状态
ufw allow 22/tcp          # 开放端口

# 防火墙 (firewalld)
firewall-cmd --list-all   # 查看状态
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 主站 | `https://domain.com` |
| 管理后台 | `https://admin.domain.com` |
| 后端 API | `https://domain.com/api` 或 `https://admin.domain.com/api` |
| API 文档 | `https://domain.com/api-docs` |

---

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

- [Claude Code Infrastructure Showcase](https://github.com/diet103/claude-code-infrastructure-showcase) - @diet103 大佬的 Vibe Coding 实践分享，几个月、几十万行代码的经验总结
- [shadcn-admin](https://github.com/satnaing/shadcn-admin) - 优秀的 shadcn/ui + React Admin 模板，提供了现成的 CRUD 架构
- [shadcn/ui](https://ui.shadcn.com/) - 优美的 React 组件库
- [智谱 GLM-4](https://github.com/THUDM/GLM-4) - 国产开源大模型，可本地部署
- [🚀 GLM Coding 超值订阅](https://www.bigmodel.cn/glm-coding?ic=ROWCC3GYIC) - 支持 Claude Code、Cline 等 20+ 编程工具，限时拼团价

---

## License

MIT

---

> "从 9 月到现在，我积攒了很多 vibe coding 的经验。虽然我没有顶级模型，只能向着传统的管理项目着手。但那又怎样？慢慢来，比较快。"
