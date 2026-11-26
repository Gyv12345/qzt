import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MallUser } from '../types/mall'

export type { MallUser }

interface UserState {
  token: string
  user: MallUser | null
  setAuth: (token: string, user: MallUser) => void
  /** bootstrap 校验成功后刷新用户资料 */
  setUser: (user: MallUser) => void
  logout: () => void
}

/** 商城买家账号(localStorage 持久化)。token 只用于 /mall/auth/* 请求头,匿名购物流程不受影响 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: '',
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: '', user: null }),
    }),
    {
      name: 'qzt-mall:user',
      version: 1,
    },
  ),
)
