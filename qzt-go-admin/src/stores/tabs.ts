import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 工作台 Tab:常驻首位,不可关闭(关闭全部/其他时的落点) */
export const HOME_TAB = '/dashboard'

/** Tab 数量上限:keep-alive 常驻挂载有内存成本,超限淘汰最前面的非工作台 Tab */
const MAX_TABS = 15

interface TabsState {
  /** 已打开 Tab 的有序 path 列表(持久化,刷新后可恢复) */
  tabs: string[]
  /** 本会话内已挂载过面板的 Tab(不持久化):持久化恢复的 Tab 首次激活时才挂载,
   *  避免刷新页面时所有恢复的 Tab 同时发起数据请求 */
  mounted: string[]
  /** 每 Tab 刷新计数:面板 key 拼上该值即可触发对应面板重挂载 */
  refreshSeq: Record<string, number>
  /** 打开 Tab(已存在则幂等);超过上限时淘汰最前面的非工作台、非本页 Tab */
  open: (path: string) => void
  /** 关闭 Tab(工作台不可关);是否需要跳转由调用方根据当前激活 Tab 判断 */
  close: (path: string) => void
  /** 关闭其他(仅保留工作台与指定 Tab) */
  closeOthers: (path: string) => void
  /** 关闭全部(仅保留工作台) */
  closeAll: () => void
  /** 刷新指定 Tab:计数 +1 触发面板重挂载 */
  refresh: (path: string) => void
  /** 登出/清理凭据时清空(避免换账号后残留无权限页面的 Tab) */
  reset: () => void
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      mounted: [],
      refreshSeq: {},

      open: (path) => {
        if (!path || path === '/') return
        const { tabs, mounted } = get()
        const nextMounted = mounted.includes(path) ? mounted : [...mounted, path]
        if (tabs.includes(path)) {
          if (nextMounted !== mounted) set({ mounted: nextMounted })
          return
        }
        const next = [...tabs, path]
        while (next.length > MAX_TABS) {
          const victimIdx = next.findIndex((p) => p !== HOME_TAB && p !== path)
          if (victimIdx === -1) break
          next.splice(victimIdx, 1)
        }
        set({ tabs: next, mounted: nextMounted })
      },

      close: (path) => {
        if (path === HOME_TAB) return
        const { tabs } = get()
        if (!tabs.includes(path)) return
        set({
          tabs: tabs.filter((p) => p !== path),
          mounted: get().mounted.filter((p) => p !== path),
        })
      },

      closeOthers: (path) => set({ tabs: [HOME_TAB, path].filter((p, i, a) => a.indexOf(p) === i) }),

      closeAll: () => set({ tabs: [HOME_TAB] }),

      refresh: (path) => {
        const { refreshSeq } = get()
        set({ refreshSeq: { ...refreshSeq, [path]: (refreshSeq[path] ?? 0) + 1 } })
      },

      reset: () => set({ tabs: [], mounted: [], refreshSeq: {} }),
    }),
    {
      name: 'qzt-go-admin:tabs',
      version: 1,
      // 仅持久化 Tab 列表;mounted/refreshSeq 是会话内状态
      partialize: (state) => ({ tabs: state.tabs }),
    },
  ),
)
