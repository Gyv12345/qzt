import { create } from 'zustand'

interface NotificationState {
  /** 未读消息数(全局,铃铛用) */
  unreadCount: number
  setUnreadCount: (n: number) => void
  increment: () => void
  decrement: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}))
