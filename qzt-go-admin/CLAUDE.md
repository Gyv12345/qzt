# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # 启动 Vite 开发服务器(端口 5173)
pnpm build      # tsc -b && vite build(含 TypeScript 类型检查)
pnpm preview    # 预览构建产物
```

无测试框架、无 lint 配置。类型检查随 `pnpm build` 一起跑。

## 技术栈与后端约定

- Vite 7 + React 19 + TypeScript;antd 5 + @ant-design/pro-components(ProTable / DrawerForm / ModalForm);React Router 7;Zustand 状态管理;axios。
- 后端是独立的 Go 服务 `qzt-go-server`,监听 `http://localhost:9000`(本仓库不含后端代码)。前端 API 统一走**单一前缀 `/prod-api`** 隔离:请求层 `src/utils/request.ts` 的 axios `baseURL` 带 `/prod-api`,`vite.config.ts` 只配一个 proxy 把 `/prod-api/*` 转发到 `localhost:9000` 并 rewrite 掉前缀(dev 与 preview 均如此)。
- 页面路由(`/system/user` 等)与后端 API(`/prod-api/system/users`)靠该前缀天然隔离,不会冲突。**新增业务模块时无需改 `vite.config.ts`**,service 层直接用 `request` 发 `/xxx` 路径即可。
- API 契约类型集中在 `src/types/`(index.ts 为系统管理,cms.ts / crm.ts 为业务模块),与后端 swagger 保持一致。

## 核心架构

### 请求封装(`src/utils/request.ts`)

后端统一响应信封 `ApiResponse { code, msg, data, timestamp }`,`code === 0` 为成功。axios 拦截器已自动解包:
- 成功:直接返回 `body.data` → **service 层函数直接返回 data,无需判断 code**
- 业务失败:`message.error(msg)` 并 reject
- 401:单飞(single-flight)的刷新令牌流程,刷新成功后自动重放原请求;刷新失败清空凭据跳 `/login`(auth/refresh 接口除外)

登录/刷新接口用 `rawRequest`(无拦截器裸实例)避免递归。`src/services/*.ts` 是唯一直接发请求的地方,页面不直接 import axios。

### 动态路由(`src/router/index.tsx`)

路由由**后端菜单树驱动**,不是前端手写的:
- 后端 `/system/menus/user` 返回菜单树 → `buildMenuRoutes()` 拍平为路由
- 页面组件通过 `import.meta.glob('../pages/**/*.tsx')` + 菜单项的 `component` 字段懒加载
- **因此新增页面的文件路径必须与后端菜单 `component` 字段对应**(如 `system/user/index` → `src/pages/system/user/index.tsx`)
- 无 token 走 `/login`;有 token 但用户信息未加载时先 `fetchUserInfo()`(并行加载字典/用户缓存),加载失败给重试入口

### RBAC 权限(`src/components/Auth.tsx` + `src/stores/auth.ts`)

- 菜单类型 `SysMenu.type`:0=目录 1=菜单 2=按钮
- `useAuthStore` 持有 token(持久化到 localStorage key `qzt-go-admin:tokens`)、profile、permissions、menus
- `Auth` 组件按权限码控制按钮/功能渲染:`<Auth perm="cms:article:add">...</Auth>`;函数内用 `usePerm()` / `hasPerm()`
- 令牌信息加载状态用 `userLoaded` 标记,布局与路由都依赖它决定渲染分支

### 布局(`src/layouts/BasicLayout.tsx` + `basic-layout.css`)

自定义三级菜单布局(非 antd ProLayout):顶栏模块页签(业务模块 + 「后台设置」) → 左侧第一列(分组/页面) → 第二列(分组下的叶子页面) → 内容区。布局样式在 `basic-layout.css`(全局防横向溢出规则也在该文件)。注意 `.qzt-layout` 用 `overflow-x: auto` 而非 `hidden`,避免内容被撑破时右侧截断不可达。

### 页面 CRUD 模式

所有管理页面遵循统一模式(参考 `src/pages/system/user/index.tsx`、`src/pages/cms/article/index.tsx`):
- `ProTable` 负责列表 + 搜索栏 + 分页,`request` 回调调用 service 层分页接口,返回 `{ data, total, success }`
- 新增/编辑用 `ModalForm` 或 `DrawerForm`,`actionRef.current?.reload()` 刷新表格
- 表格列 `search: false` 表示不出现在搜索栏;搜索条件写在 ProTable 的 column 上(`hideInTable: true`)
- 操作列按钮用 `Auth` 包裹做权限控制
- 保存前 `payload` 显式拼装(不直接透传 form values),布尔值如 `is_top` 转 0/1
- **列表第一列固定为"编号"序号列**:用 `pageIndexColumn(actionRef)`(`src/components/IndexTag.tsx`),跨分页连续编号(第 2 页接续上一页),胶囊样式同 `indexBorder`;需要不同宽度/标题时传 overrides,如 `pageIndexColumn(actionRef, { width: 60 })`。**树状表格不要用**(子行编号无意义,如 cms/category 仍用 `valueType: 'indexBorder'`)
- **新增/编辑表单默认两列布局**:`ModalForm`/`DrawerForm` 开启 `grid`,各表单项加 `colProps={{ span: 12 }}`,信息更集中。注意 `colProps` 只有 ProForm 系组件支持:ProFormText 等直接加;普通表单控件须用 `ProForm.Item` 包裹(antd 原生 `Form.Item` 类型不支持 `colProps`)
- **所有列设置固定 `width`**:每个 column 都给出合适的宽度,并在 `ProTable` 上配 `scroll={{ x: 'max-content' }}`。浏览器窗口缩小时表格整体横向滚动、列宽不被压缩,表头/内容不会"一个字一行"竖排
- **操作栏固定右侧**:操作列(`valueType: 'option'`)设置 `fixed: 'right'`,配合 `scroll.x` 横向滚动时操作按钮始终可见、不随滚动移走

### 缓存 store(`src/stores/dict.ts`、`users.ts`)

字典与用户列表做一次性加载缓存。字典用 `useDictStore.options(code)` / `useDictLabel(code, value)` 取选项与显示名;需要在页面加载后异步出现时确保 store 已 `load()`(路由加载用户信息时已并行预载,失败不阻塞)。

## 已知注意事项

- React 19 需要 `@ant-design/v5-patch-for-react-19`,在 `src/main.tsx` 顶部 import,不可移除。
- 控制台的 `[Ant Design CSS-in-JS] ... registering a cleanup function after unmount` 警告是 antd 5 的已知问题,不影响功能。
- 后端菜单下发的 `component` 字段决定路由,前端不能自由新增页面入口。
