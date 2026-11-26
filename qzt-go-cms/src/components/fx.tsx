"use client";

import dynamic from "next/dynamic";

/**
 * 首页背景动效懒加载包装: gsap(点阵)与 ogl(极光)体量大,
 * 从首屏 chunk 移到 hydration 后按需加载的独立 chunk。
 * ssr:false —— 两组件均为纯装饰层(原实现自带 window 守卫), 不参与 SSR。
 */
const DotGrid = dynamic(() => import("@/components/reactbits/DotGrid"), {
  ssr: false,
  loading: () => null,
});

const Aurora = dynamic(() => import("@/components/reactbits/Aurora"), {
  ssr: false,
  loading: () => null,
});

export { DotGrid, Aurora };
