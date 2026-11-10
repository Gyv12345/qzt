# React Bits 组件集（vendor 目录 · admin 端）

来源：[React Bits](https://reactbits.dev) · [github.com/DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)（MIT 许可）。
4 个基础组件（Aurora/BlurText/GradientText/ShinyText）与 `qzt-go-mobile/qzt-go-cms` 同款（2026-11-02 移植）；
`CountUp` / `FadeContent` 为 2026-11-02 新移植，同款同步于 mobile / cms；admin 侧已接入登录页与工作台。

React Bits **不是 npm 包**，官方用法就是把组件源码拷进项目。本目录存放经 TS 化适配后的组件，
每个文件头部注明与上游的差异（已去 `'use client'`，本项目是 Vite 非 Next）。

## 已收入组件

| 组件 | 类别 | 依赖 | 接入位置 |
| --- | --- | --- | --- |
| `Aurora.tsx` | 背景 | `ogl`（WebGL） | 已接入：登录页品牌区弱化叠加（`React.lazy` 独立 chunk） |
| `GradientText.tsx` | 文字动效 | `motion` | 已接入：登录卡「欢迎登录」标题（品牌蓝流动渐变） |
| `ShinyText.tsx` | 文字动效 | `motion` | 已接入：登录页 slogan 流光扫过 |
| `BlurText.tsx` | 文字动效 | `motion` | 已接入：登录页大标题两行按字 stagger 入场 |
| `CountUp.tsx` | 数字滚动 | `motion` | 已接入：工作台核心/次要 KPI + 财务概览（经 antd `Statistic` formatter；本仓适配新增 `decimals` 小数位 prop，金额类传 2） |
| `FadeContent.tsx` | 滚动显现 | 无 | 已接入：工作台 KPI 行 + 财务卡入场显现（纯 IntersectionObserver + CSS transition） |

admin 端特性：

- **无 Tailwind**：组件全部使用普通 class / 自带前缀类名，样式即拷即用，不依赖任何原子 CSS。
- **暗色模式**：主题类挂在 `body.qzt-theme-dark`，`GradientText` / `ShinyText` 的颜色参数
  支持 CSS 变量字符串（如 `var(--brand)`），天然跟随浅色/深色双主题。
- admin 依赖 `motion` 13.5.1 已装好，无需新增安装。

未引入 `DotGrid`：需要 `gsap`（约 70KB gz），admin 侧暂无对应场景。

## 体积约定

- **`Aurora`（ogl）必须用 `React.lazy(() => import(...))` 引入**：让 ogl 落到独立 chunk，
  不占首屏体积（同 mobile / cms 约定）。
- `motion` 体积小，文字/数字组件可直接静态 import；`FadeContent` 无依赖，随意引。

## 颜色约定

- `GradientText` / `ShinyText` 的颜色参数支持 CSS 变量字符串（如 `var(--brand)`），跟随
  浅色/深色双主题（`body.qzt-theme-dark`）。
- `Aurora` 需要真实 hex（内部 WebGL 解析），无法跟主题——取品牌色阶即可两版通用。

## 如何追加更多组件

1. 到 [reactbits.dev](https://reactbits.dev) 找目标组件，从仓库
   `src/content/<Category>/<Name>/` 拷 `*.jsx` + `*.css`，或直接对照 mobile / cms 侧同名文件。
2. 转 TS：props interface、修 `useRef` 泛型与 null 收窄；去掉 `'use client'`。
3. 看文件头 import 确认依赖：`motion`（文字/数字类大多要）、`gsap`、`ogl`、`three`（重，慎用）。缺什么装什么。
4. 文件头注明「本仓适配」差异，保持与上游可对照。
