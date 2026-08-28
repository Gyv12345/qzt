# qzt-go-mobile

企智通移动端 H5（员工端）——30+ 业务页面全量接入 qzt-go-server 真实 API，覆盖 CRM / OA / PSI / 财务 / HRM / 项目 / 知识库 / 云盘 / 看板。生产部署在 `m.devlovecode.com`。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 构建 | Vite 7（`tsc -b && vite build`，无测试框架） |
| 框架 | React 19 + TypeScript 5.9 + react-router-dom 7 |
| UI | antd-mobile 5 + antd-mobile-icons |
| 状态 | Zustand（auth 等） |
| 图表/文档 | ECharts 6（按需）、marked + dompurify 渲染 Markdown |
| 包管理 | pnpm，dev 端口 **5174** |

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:5174，依赖后端 qzt-go-server 跑在 :9000
pnpm build      # dist/
```

## 页面结构（src/pages/）

底部 TabBar 三栏：**工作台 / 消息 / 我的**（`layouts/TabBarLayout`），其余页面为 TabBar 子路由或独立页（登录/企微 OAuth 回调等）。

CRM（customer/lead/opportunity/contract/follow-plan/contact/product）、OA（expense/trip/loan/meeting/work-log/schedule/notice/ticket）、审批（approval）、PSI（psi：采购/销售/退货/库存/流水/供应商/仓库）、财务（finance）、HRM（hrm：员工/考勤/工资/绩效）、项目/知识库/云盘（project/kb/cloud）、看板（dashboard）、消息（messages，SSE 实时）、打卡（clock）、工单（ticket）、新闻（news）等 30+ 目录。

## 关键约定（改代码前必读，也见工作区 AGENTS.md「移动端关键约定」）

- **`useInfiniteList`**（`src/hooks/useInfiniteList.ts`）：所有列表页复用的无限滚动分页 hook，挂载时自动加载首页（不依赖 InfiniteScroll 的 IntersectionObserver）。新列表页照抄 `pages/customer/index.tsx`。
- **`FormSheet`**（`src/components/FormSheet.tsx`）：通用底部弹出表单。提交按钮必须 `onClick={() => form.submit()}`，不能用 antd-mobile `Button` 的 `type="submit"`（不可靠）；`Selector` 返回数组，组件内部已展开为单值。
- **FloatingBubble 定位**：依赖 `--initial-position-bottom/right` CSS 变量，已在 `global.css` 全局设默认值（右下角），**不要删除**，否则按钮不可见。
- **请求封装**（`src/utils/request.ts`）：`/prod-api` 前缀 + 拦截器自动解包（`code===0` 返回 `data`）；401 自动 refresh token，失败跳登录。
- **SSE**（`src/hooks/useSSE.ts`）：用 `fetch + ReadableStream`（非 EventSource，因为要带 Authorization header），5 秒自动重连；消息页已接入。
- **路由**（`src/router/index.tsx`）：`Home`/`Messages`/`Mine` 直接 import 进主 bundle，其余页面 `lazy` 懒加载。
- **auth store**（`src/stores/auth.ts`）：token 缓存 `localStorage['qzt-mobile:tokens']`；`updateProfile(patch)` 供资料修改后实时刷新 UI。
- React 19 + antd-mobile 的坑：命令式 `Dialog`/`Toast` 需 `unstableSetRender` 修复（已处理），详见技能/记忆中 antd-mobile gotchas。

## 部署（纯静态）

```bash
pnpm build
rsync -az --delete -e "ssh -i <pem>" dist/ root@<server>:/opt/qzt-mobile/
```

生产由 nginx 直接 serve 静态文件（HTTPS，`/prod-api` 转发到 `127.0.0.1:9000`）。

## 许可与商业服务

版权归 **河南爱编程网络科技有限公司** 所有，基于 [MIT 协议](../LICENSE) 开源——自行部署、使用、修改完全免费。

- **官方部署服务**（由我们代为部署上线）：**500 元 / 次**
- **二次开发 / 定制**：面谈

详见[工作区 README](../README.md)「版权与商业服务」。

