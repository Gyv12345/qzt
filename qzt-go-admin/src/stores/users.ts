import { create } from 'zustand'
import type { SysUser } from '../types'
import { listUsers } from '../services/system'

interface UserCacheState {
  users: SysUser[]
  loaded: boolean
  load: () => Promise<void>
  /** id -> 显示名 */
  nickname: (id: number | null | undefined) => string
  options: () => { label: string; value: number }[]
}

/** 用户缓存(CRM 负责人/成员选择等场景),一次拉取前 100 个用户 */
export const useUserStore = create<UserCacheState>()((set, get) => ({
  users: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const res = await listUsers({ page: 1, page_size: 100 })
    set({ users: res.list ?? [], loaded: true })
  },

  nickname: (id) => {
    if (id === null || id === undefined) return '-'
    const user = get().users.find((u) => u.id === id)
    return user ? user.nickname || user.username : `#${id}`
  },

  options: () =>
    get().users.map((u) => ({
      label: `${u.nickname || u.username}(${u.username})`,
      value: u.id,
    })),
}))
