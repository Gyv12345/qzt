import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 引导向导状态:记录用户已看过哪些引导(global = 全局布局引导,其余为页面级)。
 * 持久化到 localStorage,跨会话生效;「重新显示所有引导」清空后恢复自动弹。
 */
interface TourState {
  /** { [guideKey]: true },如 { global: true, 'crm.customer': true } */
  seen: Record<string, boolean>
  markSeen: (key: string) => void
  resetAll: () => void
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (key) => set((s) => ({ seen: { ...s.seen, [key]: true } })),
      resetAll: () => set({ seen: {} }),
    }),
    {
      name: 'qzt-go-admin:tour',
      version: 1,
      // 向导步骤/文案大改后升 version 并在 migrate 里清空 seen,让所有用户重新看一遍
    },
  ),
)
