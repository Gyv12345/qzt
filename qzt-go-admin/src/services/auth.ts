import { rawRequest } from '../utils/request'
import request from '../utils/request'
import { useAuthStore } from '../stores/auth'
import type {
  ApiResponse,
  ChangePasswordRequest,
  CreateApiKeyResult,
  LoginResult,
  SysApiKey,
  SysMenu,
  SysUser,
  UpdateProfileRequest,
} from '../types'

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

// ---------- 个人中心(仅 JWT 鉴权,无 RBAC) ----------

/** 修改个人信息,返回更新后的用户对象 */
export const updateProfile = (data: UpdateProfileRequest) =>
  request.put<unknown, SysUser>('/system/auth/profile', data)

/** 修改密码(成功后后端使全部会话失效,前端需重新登录) */
export const changePassword = (data: ChangePasswordRequest) =>
  request.put('/system/auth/password', data)

/** 获取企业微信绑定二维码 URL(企业微信未启用时业务报错) */
export const getWecomBindQrcode = () =>
  request.get<unknown, { url: string; state: string }>('/system/auth/wecom/bind-qrcode')

/** 企业微信绑定回调(公开接口,跨设备扫码用,无需JWT) */
export const bindWecomCallback = (data: { code: string; state: string }) =>
  request.post('/system/auth/wecom/bind-callback', data)

/** 查询企业微信绑定状态(桌面端轮询用) */
export const checkWecomBindStatus = () =>
  request.get<unknown, { bound: boolean; wecom_user_id: string }>('/system/auth/wecom/bind-status')

/** 解绑企业微信 */
export const unbindWecom = () => request.delete('/system/auth/wecom/bind')

// ---------- API Key ----------

export const listApiKeys = () => request.get<unknown, SysApiKey[]>('/system/api-keys')

/** 创建 API Key,明文密钥仅在响应中返回一次 */
export const createApiKey = (name: string) =>
  request.post<unknown, CreateApiKeyResult>('/system/api-keys', { name })

export const deleteApiKey = (id: number) => request.delete(`/system/api-keys/${id}`)

export const disableApiKey = (id: number) => request.put(`/system/api-keys/${id}/disable`)
