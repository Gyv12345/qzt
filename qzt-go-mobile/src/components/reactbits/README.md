# React Bits 组件集（vendor 目录 · 移动端）

来源：[React Bits](https://reactbits.dev) · [github.com/DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)（MIT 许可）。
与 `qzt-go-cms/src/components/reactbits/` 同源同款（2026-09-18 移植），移动端裁剪如下。

React Bits **不是 npm 包**，官方用法就是把组件源码拷进项目。本目录存放经 TS 化适配后的组件，
每个文件头部注明与上游的差异（已去 `'use client'`，本项目是 Vite 非 Next）。

## 已收入组件

| 组件 | 类别 | 依赖 | 接入位置 |
| --- | --- | --- | --- |
| `Aurora.tsx` | 背景 | `ogl`（WebGL） | 登录页顶部背景、工作台头部（弱化叠加） |
| `GradientText.tsx` | 文字动效 | `motion` | 登录页大标题、工作台问候语 |
| `ShinyText.tsx` | 文字动效 | `motion` | 登录页徽章、工作台日期 |
| `BlurText.tsx` | 文字动效 | `motion` | 登录页副标题（中文按字 stagger） |

未引入 `DotGrid`：需要 `gsap`（约 70KB gz），移动端登录页已有 CSS 网格底纹替代。

## 体积约定

- **`Aurora`（ogl）必须用 `React.lazy(() => import(...))` 引入**：Login/Home/Mine 都在
  主 bundle（见 `router/index.tsx`），直接 import 会把 ogl 拖进首屏；lazy 后落到独立 chunk。
- `motion` 体积小，文字组件可直接静态 import。

## 颜色约定

- `GradientText` / `ShinyText` 的颜色参数支持 CSS 变量字符串（如 `var(--brand)`），天然跟随
  浅色/深色双主题（`body.dm-dark`）。
- `Aurora` 需要真实 hex（内部 WebGL 解析），无法跟主题——首页头部与登录页都是蓝色系渐变，
  取品牌色阶即可两版通用。

## 如何追加更多组件

1. 到 [reactbits.dev](https://reactbits.dev) 找目标组件，从仓库
   `src/content/<Category>/<Name>/` 拷 `*.jsx` + `*.css`，或直接对照 CMS 侧同名文件。
2. 转 TS：props interface、修 `useRef` 泛型与 null 收窄；去掉 `'use client'`。
3. 看文件头 import 确认依赖：`motion`（文字类大多要）、`gsap`、`ogl`、`three`（重，慎用）。缺什么装什么。
4. 文件头注明「本仓适配」差异，保持与上游可对照。
