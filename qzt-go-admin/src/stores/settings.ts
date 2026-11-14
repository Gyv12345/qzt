import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 外观模式:浅色 / 深色 / 跟随系统(prefers-color-scheme) */
export type ThemeMode = 'light' | 'dark' | 'auto'

/** 布局/主题设置,持久化到 localStorage */
export interface LayoutSettings {
  /** 主题色 */
  colorPrimary: string
  /** 信息色 */
  colorInfo: string
  /** 页面圆角 */
  borderRadius: number
  /** 外观模式 */
  themeMode: ThemeMode
  /** 紧凑模式(叠加 antd compactAlgorithm,收紧间距提高信息密度) */
  compactMode: boolean
  /** 色弱模式(invert 滤镜,增强对比辅助色觉障碍用户) */
  colorWeak: boolean
  /** 多页签模式(内容区顶部 Tab 栏,切换保留页面状态) */
  multiTab: boolean
  /** 页面水印(内容区平铺显示当前登录用户,防截屏外传溯源) */
  watermark: boolean
}

interface SettingsState extends LayoutSettings {
  /** 系统当前是否深色(prefers-color-scheme 实时值,不持久化;themeMode='auto' 时由 isDark 消费) */
  systemDark: boolean
  /** 内容全屏(隐藏顶栏/侧栏/Tab 栏,Esc 退出;会话态不持久化) */
  contentFullscreen: boolean
  toggleContentFullscreen: () => void
  setSettings: (patch: Partial<LayoutSettings>) => void
  resetSettings: () => void
}

export const DEFAULT_SETTINGS: LayoutSettings = {
  colorPrimary: '#1677ff',
  colorInfo: '#1677ff',
  // 数据密集型后台更适合小圆角(6),更显紧凑专业;8 偏消费级 App
  borderRadius: 6,
  themeMode: 'light',
  compactMode: false,
  colorWeak: false,
  multiTab: true,
  watermark: false,
}

/** 计算当前设置与出厂默认的差异(仅遍历 LayoutSettings 键,空对象=与默认一致) */
export function diffSettings(current: LayoutSettings): Partial<LayoutSettings> {
  const out: Partial<LayoutSettings> = {}
  const sink = out as Record<keyof LayoutSettings, unknown>
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof LayoutSettings)[]) {
    if (current[k] !== DEFAULT_SETTINGS[k]) sink[k] = current[k]
  }
  return out
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      systemDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      contentFullscreen: false,
      toggleContentFullscreen: () => set((s) => ({ contentFullscreen: !s.contentFullscreen })),
      setSettings: (patch) => set(patch),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'qzt-go-admin:settings',
      version: 7,
      // 只持久化用户设置本身;systemDark 是系统实时值,不入 localStorage
      partialize: (s) => ({
        colorPrimary: s.colorPrimary,
        colorInfo: s.colorInfo,
        borderRadius: s.borderRadius,
        themeMode: s.themeMode,
        compactMode: s.compactMode,
        colorWeak: s.colorWeak,
        multiTab: s.multiTab,
        watermark: s.watermark,
      }),
      // v1 默认圆角 8 → v2 调整为 6(旧用户若仍是旧默认值则归正,自定义值保留);
      // v3 新增 compactMode / colorWeak,旧数据缺失字段补默认值;
      // v4 默认主色亮蓝化 #2f54eb → #1677ff(仅归正仍为旧默认值的情况,自定义主色保留);
      // v5 新增 multiTab(多页签模式),旧数据缺失字段补默认值;
      // v6 darkMode:boolean → themeMode:'light'|'dark'|'auto'(true→'dark',false→'light');
      // v7 新增 watermark(页面水印),旧数据缺失字段补默认值
      migrate: (persisted: unknown) => {
        const s = { ...(persisted ?? {}) } as Partial<LayoutSettings> & { darkMode?: boolean }
        if (s.borderRadius === 8) s.borderRadius = DEFAULT_SETTINGS.borderRadius
        if (s.compactMode === undefined) s.compactMode = DEFAULT_SETTINGS.compactMode
        if (s.colorWeak === undefined) s.colorWeak = DEFAULT_SETTINGS.colorWeak
        if (s.multiTab === undefined) s.multiTab = DEFAULT_SETTINGS.multiTab
        if (s.colorPrimary?.toLowerCase() === '#2f54eb') s.colorPrimary = DEFAULT_SETTINGS.colorPrimary
        if (s.colorInfo?.toLowerCase() === '#2f54eb') s.colorInfo = DEFAULT_SETTINGS.colorInfo
        if (s.themeMode === undefined) {
          s.themeMode = s.darkMode ? 'dark' : DEFAULT_SETTINGS.themeMode
          delete s.darkMode
        }
        if (s.watermark === undefined) s.watermark = DEFAULT_SETTINGS.watermark
        return s as LayoutSettings
      },
    },
  ),
)

// 跟随系统:prefers-color-scheme 变化实时写回 systemDark(store 内唯一监听点,
// 消费方(App.tsx)用单字段 selector 派生有效暗色即可)
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => useSettingsStore.setState({ systemDark: e.matches }))
