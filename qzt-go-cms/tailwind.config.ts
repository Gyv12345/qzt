import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 品牌主色: 深海军蓝, 600 为基准
        brand: {
          50: "#eff6fc",
          100: "#d9ebf7",
          200: "#bcd9f0",
          300: "#8ec0e6",
          400: "#599dd6",
          500: "#357cbf",
          600: "#0f4c81", // 主色 (DEFAULT 原值保留)
          700: "#0a3a63", // 原 dark
          800: "#0b2f4f",
          900: "#0a2740",
          DEFAULT: "#0f4c81",
          dark: "#0a3a63",
          light: "#eff6fc",
        },
        // 暖灰中性色 (比冷 gray 更柔和, 适合企业感)
        ink: {
          50: "#f8f8f7",
          100: "#eeece9",
          200: "#d8d4ce",
          300: "#b8b1a8",
          400: "#928a7e",
          500: "#6f685c",
          600: "#4f4a42",
          700: "#3a3630",
          800: "#26231f",
          900: "#16140f",
        },
        // 强调色: 暖琥珀 (仅用于价格/徽章高亮, 克制)
        accent: {
          DEFAULT: "#d97706",
          light: "#fcd34d",
          dark: "#b45309",
        },
        // 深夜蓝黑 (整站深色背景阶, 950 为页面底色)
        night: {
          950: "#04070e",
          900: "#080d18",
          850: "#0b1220",
          800: "#101a2e",
          700: "#1b2942",
          600: "#2a3d63",
        },
      },
      fontFamily: {
        // 通过 CSS 变量引用 next/font 注入的字体 (见 layout.tsx)
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // 深色底上的卡片阴影: 黑影塑形, 蓝光做 hover 光晕
        card: "0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 8px 24px -8px rgba(0, 0, 0, 0.5)",
        "card-hover": "0 2px 4px 0 rgba(0, 0, 0, 0.4), 0 12px 32px -8px rgba(0, 0, 0, 0.6), 0 0 24px -6px rgba(89, 157, 214, 0.25)",
        "hero-glow": "0 0 80px -20px rgba(53, 124, 191, 0.4)",
        "glow-sm": "0 0 20px -4px rgba(89, 157, 214, 0.45)",
        glow: "0 0 48px -8px rgba(89, 157, 214, 0.5)",
        "accent-glow": "0 0 32px -8px rgba(217, 119, 6, 0.5)",
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
