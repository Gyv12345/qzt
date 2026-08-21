import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── 语义角色色: 全部引用 CSS 变量, 由 <html data-theme> 决定取值 ──
        // 页面背景阶
        base: "var(--c-base)", // 页面主背景
        alt: "var(--c-alt)", // 交替 section 背景
        deep: "var(--c-deep)", // 页脚/收束块背景
        surface: "var(--c-surface)", // 卡片面
        raised: "var(--c-raised)", // 输入框/hover 亮面
        line: "var(--c-line)", // 边框/分隔线
        headerbg: "var(--c-header-bg)", // 吸顶头部(毛玻璃底)
        drawerbg: "var(--c-drawer-bg)", // 移动端抽屉底
        // 文字阶
        strong: "var(--c-strong)", // 主标题
        normal: "var(--c-normal)", // 正文
        muted: "var(--c-muted)", // 次要说明
        faint: "var(--c-faint)", // 弱提示
        brandtext: "var(--c-brand-text)", // 品牌色文字(深主题亮蓝/浅主题深蓝)
        // 品牌主色: 深海军蓝, 600 为基准, 全站两套主题共用同一色阶
        brand: {
          200: "var(--c-brand-200)",
          300: "var(--c-brand-300)",
          400: "var(--c-brand-400)",
          500: "var(--c-brand-500)",
          600: "var(--c-brand-600)",
          700: "var(--c-brand-700)",
          800: "var(--c-brand-800)",
          DEFAULT: "var(--c-brand-600)",
        },
        // 强调色: 暖琥珀 (仅用于价格/徽章高亮, 克制)
        accent: {
          DEFAULT: "var(--c-accent)",
          light: "var(--c-accent-light)",
          dark: "var(--c-accent-dark)",
        },
      },
      fontFamily: {
        // 通过 CSS 变量引用 next/font 注入的字体 (见 layout.tsx)
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // 阴影同样变量化: 深主题黑影塑形, 浅主题柔和蓝灰影
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        "glow-sm": "var(--shadow-glow-sm)",
        glow: "var(--shadow-glow)",
      },
      maxWidth: {
        container: "1200px",
      },
      keyframes: {
        // staggered 入场动效 (SSR 友好, 纯 CSS)
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
