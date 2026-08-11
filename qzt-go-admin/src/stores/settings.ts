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
  /** 紧凑模式(叠加 antd compactAlgorithm,收紧间距提高信息密度) */
  compactMode: boolean
  /** 色弱模式(invert 滤镜,增强对比辅助色觉障碍用户) */
  colorWeak: boolean
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
  compactMode: false,
  colorWeak: false,
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
      version: 3,
      // v1 默认圆角 8 → v2 调整为 6(旧用户若仍是旧默认值则归正,自定义值保留);
      // v3 新增 compactMode / colorWeak,旧数据缺失字段补默认值
      migrate: (persisted: unknown) => {
        const s = (persisted ?? {}) as Partial<LayoutSettings>
        if (s.borderRadius === 8) s.borderRadius = DEFAULT_SETTINGS.borderRadius
        if (s.compactMode === undefined) s.compactMode = DEFAULT_SETTINGS.compactMode
        if (s.colorWeak === undefined) s.colorWeak = DEFAULT_SETTINGS.colorWeak
        return s as LayoutSettings
      },
    },
  ),
)
