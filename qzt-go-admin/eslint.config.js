import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // 全局忽略:构建产物与依赖
  { ignores: ['dist', 'node_modules'] },

  {
    // TS/TSX 源码:@eslint/js recommended + typescript-eslint recommended(非 type-checked,轻量)
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // react-hooks recommended(重点:rules-of-hooks 抓违规 hooks 用法,exhaustive-deps 抓 stale-closure)
      ...reactHooks.configs['recommended-latest'].rules,
      // 存量代码大量使用「effect 内同步 setState」模式(打开抽屉/弹窗时重置表单再拉数据,约 45 处),
      // 属既有约定写法而非 bug,批量重构风险大,先降为 warn 保持可见
      'react-hooks/set-state-in-effect': 'warn',
      // react-refresh 只警告(vite 轻量档:允许常量导出)
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 存量代码在动态数据场景(后端驱动的表单值、通用导出组件等)大量使用 any,
      // 属类型严谨度问题而非 bug,先降为 warn,新代码逐步收敛
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Node 环境文件(vite.config.ts 等)
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
)
