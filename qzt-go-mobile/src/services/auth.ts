import { rawRequest } from '../utils/request'
import request from '../utils/request'
import { useAuthStore } from '../stores/auth'
import type { ApiResponse, LoginResult, SysMenu, SysUser } from '../types'

/** 登录,成功后写入 token */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await rawRequest.post<ApiResponse<LoginResult>>('/system/auth/login', {
    username,
    password,
  })
  const body = res.data
  if (body.code !== 0) {
    throw new Error(body.msg || '登录失败')
  }
  useAuthStore.getState().setTokens(body.data)
  return body.data
}

/** 加载当前用户资料、权限、菜单树 */
export async function fetchUserInfo(): Promise<void> {
  const [profile, permissions, menus] = await Promise.all([
    request.get<unknown, SysUser>('/system/auth/profile'),
    request.get<unknown, string[]>('/system/auth/permissions'),
    request.get<unknown, SysMenu[]>('/system/menus/user'),
  ])
  useAuthStore.getState().setUserInfo({ profile, permissions, menus })
}

/** 登出(忽略后端调用失败) */
export async function logout(): Promise<void> {
  try {
    await request.post('/system/auth/logout')
  } catch {
    // 即使失败也清理本地状态
  }
  useAuthStore.getState().clearAuth()
}

/** 启动引导:拉取公共配置(免鉴权) */
export async function fetchPublicConfigs(): Promise<Record<string, string>> {
  try {
    const res = await rawRequest.get<ApiResponse<Record<string, string>>>('/api/configs/public')
    if (res.data.code === 0) return res.data.data ?? {}
  } catch {
    // 忽略,引导配置非必需
  }
  return {}
}

/** 更新个人资料(昵称/头像/邮箱/手机) */
export function updateProfile(data: {
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
}) {
  return request.put('/system/auth/profile', data)
}

/** 修改密码 */
export function changePassword(data: { old_password: string; new_password: string }) {
  return request.put('/system/auth/password', data)
}

// ---------- 企业微信扫码登录(免鉴权) ----------

/** 查询已启用的第三方登录渠道(免鉴权,登录页判断显隐) */
export async function listEnabledOauth(): Promise<string[]> {
  try {
    const res = await rawRequest.get<
      ApiResponse<Array<{ provider: string; enabled: number; name?: string }>>
    >('/system/oauth-configs/enabled')
    if (res.data.code === 0) {
      return (res.data.data ?? []).map((c) => c.provider)
    }
  } catch {
    // 忽略,登录入口显隐非必需
  }
  return []
}

/** 获取企业微信扫码登录授权 URL(免鉴权)。mode: scan 桌面轮询出码 / app 手机企微内同步登录 */
export async function getWecomLoginQrcode(
  mode: 'scan' | 'app' = 'app',
): Promise<{ url: string; state: string }> {
  const res = await rawRequest.get<ApiResponse<{ url: string; state: string }>>(
    '/system/auth/wecom/qrcode',
    { params: { mode } },
  )
  const body = res.data
  if (body.code !== 0) {
    throw new Error(body.msg || '获取企业微信登录链接失败')
  }
  return body.data
}
