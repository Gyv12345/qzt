# Phase 01: 基础设施验证与环境设置

确保开发环境正确配置，后端和前端服务能够正常运行，为后续优化工作奠定坚实基础。这是最关键的一步，必须在没有任何用户干预的情况下完全自主完成。

## Tasks

- [x] 验证项目依赖和配置：
  - 检查 `frontend/package.json` 中的依赖是否完整
  - 确认 `backend` 目录存在且包含必要的 NestJS 配置
  - 验证 `orval.config.ts` 配置正确性
  - 确认 TypeScript 配置文件（`tsconfig.json`）的有效性
  - 检查环境变量文件（`.env`）是否已配置
  - ✅ **完成**: 所有依赖和配置验证通过。详细报告: `/Auto Run Docs/Working/dependency-verification.md`

- [ ] 启动后端服务并验证 API 可用性：
  - 检查后端服务是否已在端口 7890 运行
  - 如果未运行，则启动后端服务（使用 `pnpm dev` 或 `./start-dev.sh`）
  - 验证健康检查端点（`/health` 或类似端点）是否返回 200 状态
  - 确认 SCRM 相关的 API 端点可访问（`/api/customers`, `/api/contacts` 等）
  - 记录后端服务状态到 `/Users/shichenyang/WebstormProjects/qzt/Auto Run Docs/Initiation/Working/backend-status.md`

- [ ] 生成最新的 TypeScript API 客户端：
  - 在 `frontend` 目录下运行 `pnpm run generate:api`
  - 验证生成的 `src/models/` 目录中的类型定义文件
  - 确认 `src/services/api.ts` 包含所有 SCRM 相关的 API 方法
  - 检查是否有任何生成错误或警告
  - 记录生成结果到工作目录

- [ ] 启动前端服务并验证基本功能：
  - 检查前端服务是否已在端口 3456 运行
  - 如果未运行，则启动前端服务
  - 访问 `http://localhost:3456` 确认应用加载成功
  - 验证路由系统正常工作（检查 TanStack Router Devtools）
  - 确认样式加载正常（Tailwind CSS、shadcn/ui 组件）
  - 记录前端服务状态到工作目录

- [ ] 验证 SCRM 核心页面的可访问性：
  - 测试访问 `/dashboard` 路由
  - 测试访问 `/customers` 路由（公司管理页面）
  - 测试访问 `/contacts` 路由（联系人管理页面）
  - 测试访问 `/contracts` 路由（合同管理页面）
  - 验证页面能够正确渲染，没有控制台错误
  - 截图保存关键页面的当前状态到工作目录

- [ ] 创建基础设施验证报告：
  - 创建 `docs/research/infrastructure/` 目录（如果不存在）
  - 生成 `infrastructure-verification-report.md` 文件，包含：
    - YAML front matter: `type: report`, `title: 基础设施验证报告`, `tags: [infrastructure, setup, verification]`
    - 后端服务状态（运行状态、端口、健康检查结果）
    - 前端服务状态（运行状态、端口、构建状态）
    - API 客户端生成状态（生成的文件数量、发现的任何问题）
    - 已验证的 SCRM 页面列表
    - 发现的问题和待解决的阻碍
    - 使用 wiki-links 连接相关文档（如 `[[API-Client-Setup]]`）
