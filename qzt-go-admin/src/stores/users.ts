import { create } from 'zustand'
import type { UserOption } from '../types'
import { listUserOptions } from '../services/system'

interface UserCacheState {
  users: UserOption[]
  loaded: boolean
  load: () => Promise<void>
  /** id -> 显示名 */
  nickname: (id: number | null | undefined) => string
  options: () => { label: string; value: number }[]
}

/** 用户缓存(CRM 负责人/成员选择等场景),一次拉取简表(仅登录无 RBAC) */
export const useUserStore = create<UserCacheState>()((set, get) => ({
  users: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const res = await listUserOptions()
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
