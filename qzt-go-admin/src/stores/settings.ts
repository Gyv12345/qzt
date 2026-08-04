import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 布局/主题设置,持久化到 localStorage */
export interface LayoutSettings {
  /** 主题色 */
  colorPrimary: string
  /** 信息色 */
  colorInfo: string
  /** 页面圆角 */
  borderRadius: number
  /** 深色模式 */
  darkMode: boolean
}

interface SettingsState extends LayoutSettings {
  setSettings: (patch: Partial<LayoutSettings>) => void
  resetSettings: () => void
}

export const DEFAULT_SETTINGS: LayoutSettings = {
  colorPrimary: '#2f54eb',
  colorInfo: '#2f54eb',
  borderRadius: 8,
  darkMode: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setSettings: (patch) => set(patch),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    { name: 'qzt-go-admin:settings' },
  ),
)
