import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'auto' | 'light' | 'dark'

interface ThemeState {
  /** 用户选择的模式:auto 跟随系统 / light 浅色 / dark 深色 */
  mode: ThemeMode
  /** 当前实际渲染是否深色(auto 模式根据系统偏好计算) */
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  /** 应用主题到 body class,供初始化和系统偏好变化时调用 */
  applyTheme: () => void
}

/** 判断系统当前是否深色 */
function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** 根据模式 + 系统偏好,计算实际是否深色并写 body class */
function resolve(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return systemPrefersDark()
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      isDark: resolve('auto'),

      setMode: (mode) => {
        const isDark = resolve(mode)
        document.body.classList.toggle('dm-dark', isDark)
        document.body.classList.toggle('dm-light', !isDark)
        // 同步 theme-color meta
        const meta = document.querySelector('meta[name="theme-color"]')
        if (meta) meta.setAttribute('content', isDark ? '#0d0d0f' : '#0c1428')
        set({ mode, isDark })
      },

      applyTheme: () => {
        const { mode } = get()
        const isDark = resolve(mode)
        document.body.classList.toggle('dm-dark', isDark)
        document.body.classList.toggle('dm-light', !isDark)
        const meta = document.querySelector('meta[name="theme-color"]')
        if (meta) meta.setAttribute('content', isDark ? '#0d0d0f' : '#0c1428')
        set({ isDark })
      },
    }),
    { name: 'qzt-mobile:theme' },
  ),
)

/** 监听系统深浅色变化(auto 模式下实时切换)。在 App 启动时调用一次。 */
export function watchSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    const { mode, applyTheme } = useThemeStore.getState()
    if (mode === 'auto') applyTheme()
  }
  // Safari < 14 用 addListener
  if (mq.addEventListener) {
    mq.addEventListener('change', handler)
  } else if (mq.addListener) {
    mq.addListener(handler)
  }
}
