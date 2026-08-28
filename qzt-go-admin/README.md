# qzt-go-admin

企智通后台管理 SPA——全平台唯一管理端，覆盖 CRM / 进销存 / 财务 / HRM / OA / 审批 / 知识库 / 云盘 / 内容管理 / 系统管理等全部后台功能。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 构建 | Vite 7（`tsc -b && vite build`，类型检查随 build 跑） |
| 框架 | React 19 + TypeScript 5.9 |
| UI | antd 5 + ProComponents（ProTable/ProForm 全家桶） |
| 状态 | Zustand |
| 路由 | react-router-dom 7（**由后端菜单树驱动**） |
| 图表/编辑 | ECharts 6、Tiptap 富文本、`@xyflow/react` 流程图、md-editor |

包管理 **pnpm**，本地 dev 端口 **5173**，无独立测试框架（质量关口 = build 里的 tsc）。

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:5173，依赖后端 qzt-go-server 跑在 :9000
pnpm build      # tsc -b && vite build → dist/
pnpm lint       # eslint
```

请求层（`src/utils/request.ts`）axios `baseURL` 统一带 `/prod-api`，`vite.config.ts` 只配一个 proxy 把 `/prod-api/*` 转发到 `localhost:9000` 并 rewrite 掉前缀。**新增业务模块无需改 vite 配置。**

## 目录结构

```
src/
├── components/     # 通用组件（RBAC 权限组件/导入选择弹窗等）
├── guides/         # 新手引导
├── hooks/          # 通用 hooks（SSE/无限滚动等）
├── layouts/        # 布局（顶栏/侧边菜单/TabBar）
├── pages/          # 业务页面（路径必须与后端 sys_menu.component 对应）
│   ├── system/     #   用户/角色/菜单/字典/日志/站点设置…
│   ├── crm/        #   客户/线索/商机/合同/公海/产品/SKU…
│   ├── psi/        #   采购/销售/退货/库存/供应商/仓库…
│   ├── finance/    #   应收应付/凭证/发票/科目/现金流…
│   ├── hrm/        #   员工/部门/岗位/考勤/工资/绩效/招聘
│   ├── oa/         #   报销/出差/借款/会议/日志/日程/公告
│   ├── approval/   #   审批中心（待办/已办/流程设计器）
│   ├── analysis/   #   BI 数据看板
│   ├── cms/        #   官网内容管理（首页模块/主题/营销文案）
│   ├── mall/       #   商城管理（商品/订单）
│   └── …           #   cloud/kb/project/enterprise/marketing/dashboard…
├── router/         # 动态路由装配（后端菜单驱动）
├── services/       # API 请求（唯一直接发请求的层，页面不碰 axios）
├── stores/         # Zustand（auth/用户/全局缓存）
├── types/          # API 契约类型（与后端 swagger 对齐）
└── utils/          # request.ts 封装等
```

## 核心约定（详见 CLAUDE.md）

- **路由由后端菜单树驱动**：登录后拉 `/system/menus/user` 动态注册路由，页面文件路径必须与菜单 `component` 字段对应（如 `system/user/index` → `src/pages/system/user/index.tsx`）。新页面要在 `sys_menu` 建菜单并授权角色才可见。
- **响应信封自动解包**：axios 拦截器对 `{code, msg, data}` 解包，service 层直接返回 `data`；401 自动 refresh token。
- **RBAC**：按钮级权限用权限组件包裹，后端 Casbin 校验；超管角色（`super_admin`）跳过 RBAC。
- **CRUD 页面统一模式**：ProTable 列表 + ModalForm 编辑，改前先抄一个现有页面。
- 表单禁止手输 ID：关联字段一律用数据选择器；表格不展示 ID 列。

## 部署

```bash
pnpm build
rsync -az --delete -e "ssh -i <pem>" dist/ root@<server>:/opt/qzt-admin/
```

生产由 nginx 直接 serve 静态文件（HTTPS，`/prod-api` 转发到 `127.0.0.1:9000`）。完整流程见工作区 `AGENTS.md`「生产部署」。

## 许可与商业服务

版权归 **河南爱编程网络科技有限公司** 所有，基于 [MIT 协议](../LICENSE) 开源——自行部署、使用、修改完全免费。

- **官方部署服务**（由我们代为部署上线）：**500 元 / 次**
- **二次开发 / 定制**：面谈

详见[工作区 README](../README.md)「版权与商业服务」。

