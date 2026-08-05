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
  // 数据密集型后台更适合小圆角(6),更显紧凑专业;8 偏消费级 App
  borderRadius: 6,
  darkMode: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setSettings: (patch) => set(patch),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'qzt-go-admin:settings',
      version: 2,
      // v1 默认圆角是 8,v2 调整为 6;旧用户若仍是旧默认值则归正,自定义值保留
      migrate: (persisted: unknown) => {
        const s = (persisted ?? {}) as Partial<LayoutSettings>
        if (s.borderRadius === 8) s.borderRadius = DEFAULT_SETTINGS.borderRadius
        return s as LayoutSettings
      },
    },
  ),
)
