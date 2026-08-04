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
      },
      fontFamily: {
        // 通过 CSS 变量引用 next/font 注入的字体 (见 layout.tsx)
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // 柔和卡片阴影, 替代 Tailwind 默认的生硬 shadow
        card: "0 1px 3px 0 rgba(15, 76, 129, 0.04), 0 4px 12px -2px rgba(15, 76, 129, 0.06)",
        "card-hover": "0 4px 6px -1px rgba(15, 76, 129, 0.08), 0 12px 24px -4px rgba(15, 76, 129, 0.12)",
        "hero-glow": "0 0 80px -20px rgba(53, 124, 191, 0.4)",
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
