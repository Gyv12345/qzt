import { create } from 'zustand'
import type { LoginResult, SysMenu, SysUser } from '../types'

const TOKEN_KEY = 'qzt-go-mobile:tokens'

interface TokenCache {
  accessToken: string
  refreshToken: string
  accessExpire: number
}

function loadTokens(): TokenCache {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (raw) return JSON.parse(raw) as TokenCache
  } catch {
    // ignore
  }
  return { accessToken: '', refreshToken: '', accessExpire: 0 }
}

interface AuthState extends TokenCache {
  profile: SysUser | null
  permissions: string[]
  menus: SysMenu[]
  /** 用户信息(资料/权限/菜单)是否已加载 */
  userLoaded: boolean
  setTokens: (t: LoginResult) => void
  setUserInfo: (info: { profile: SysUser; permissions: string[]; menus: SysMenu[] }) => void
  updateProfile: (patch: Partial<SysUser>) => void
  clearAuth: () => void
  hasPerm: (code?: string) => boolean
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...loadTokens(),
  profile: null,
  permissions: [],
  menus: [],
  userLoaded: false,

  setTokens: (t) => {
    const cache: TokenCache = {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      accessExpire: t.access_expire,
    }
    localStorage.setItem(TOKEN_KEY, JSON.stringify(cache))
    set(cache)
  },

  setUserInfo: ({ profile, permissions, menus }) =>
    set({ profile, permissions: permissions ?? [], menus: menus ?? [], userLoaded: true }),

  updateProfile: (patch) =>
    set((state) => (state.profile ? { profile: { ...state.profile, ...patch } } : state)),

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({
      accessToken: '',
      refreshToken: '',
      accessExpire: 0,
      profile: null,
      permissions: [],
      menus: [],
      userLoaded: false,
    })
  },

  hasPerm: (code) => {
    if (!code) return true
    const { permissions } = get()
    return permissions.includes('*') || permissions.includes(code)
  },
}))
