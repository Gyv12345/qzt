# React Bits 组件集（vendor 目录）

来源：[React Bits](https://reactbits.dev) · [github.com/DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)（MIT 许可）。

React Bits **不是 npm 包**，官方用法就是把组件源码拷进项目（或用 jsrepo CLI）。
本目录存放经 TS 化适配后的组件，每个文件头部注明与上游的差异。

## 已收入组件

| 组件 | 类别 | 依赖 | 接入位置 |
| --- | --- | --- | --- |
| `Aurora.tsx` | 背景 | `ogl`（WebGL） | 首页 CTA 区背景 |
| `DotGrid.tsx` | 背景 | `gsap`（InertiaPlugin，3.13+ 免费） | 首页 Hero 背景 |
| `GradientText.tsx` | 文字动效 | `motion` | 首页 Hero 大标题 |
| `BlurText.tsx` | 文字动效 | `motion` | 首页 Hero 副标题 |
| `ShinyText.tsx` | 文字动效 | `motion` | 首页 Hero 徽章文字 |

颜色约定：

- `GradientText` / `ShinyText` 的颜色参数支持 CSS 变量字符串（如 `var(--c-grad-from)`），
  优先传站点 token，天然跟随 `data-theme` 双主题。
- `DotGrid` / `Aurora` 需要真实 hex（内部逐点/WebGL 解析），用品牌色阶取值
  （`--c-brand-*` 海军蓝系），无法跟随主题切换——这两处仅在深色科技主题下最佳。

## 如何追加更多组件

1. 到 [reactbits.dev](https://reactbits.dev) 找目标组件，从仓库
   `src/content/<Category>/<Name>/` 拷 `*.jsx` + `*.css`
   （可用 `https://cdn.jsdelivr.net/gh/DavidHDev/react-bits@main/...` 镜像）。
2. 转 TS：加 `'use client'`、props interface、修 `useRef` 泛型与可能的 null 收窄。
3. 看文件头 import 确认依赖：`motion`（文字类大多要）、`gsap`、`ogl`、`three`（重，
   慎用）。缺什么装什么。
4. 文件头注明「本仓适配」差异，保持与上游可对照。
