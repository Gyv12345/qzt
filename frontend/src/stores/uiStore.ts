import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  // 侧边栏状态
  sidebarCollapsed: boolean;
  isMobile: boolean;

  // 当前选中的菜单
  currentPath: string;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setCurrentPath: (path: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      isMobile: false,
      currentPath: '/',

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      setIsMobile: (isMobile: boolean) => {
        set({ isMobile });
      },

      setCurrentPath: (path: string) => {
        set({ currentPath: path });
      },
    }),
    {
      name: 'ui-storage', // localStorage key
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
