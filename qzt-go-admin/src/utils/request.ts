import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { message } from 'antd'
import type { ApiResponse, LoginResult } from '../types'
import { useAuthStore } from '../stores/auth'

/** 静默模式:失败不弹全局提示,由调用方自行降级(如首页无权限图表区块整体隐藏) */
declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean
  }
}

/** 不经过拦截器的裸实例,用于登录/刷新令牌 */
export const rawRequest = axios.create({ baseURL: '/prod-api', timeout: 15000 })

const request = axios.create({ baseURL: '/prod-api', timeout: 15000 })

request.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

/** 单飞的刷新令牌流程 */
let refreshing: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    const doRefresh = async (): Promise<boolean> => {
      const { refreshToken, setTokens } = useAuthStore.getState()
      if (!refreshToken) return false
      try {
        const res = await rawRequest.post<ApiResponse<LoginResult>>('/system/auth/refresh', {
          refresh_token: refreshToken,
        })
        if (res.data.code === 0) {
          setTokens(res.data.data)
          return true
        }
      } catch {
        // fallthrough
      }
      return false
    }
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

function toLogin() {
  useAuthStore.getState().clearAuth()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

interface RetriedConfig extends InternalAxiosRequestConfig {
  __retried?: boolean
  /** 静默模式:失败不弹全局提示(由页面自行降级,如首页无权限的图表区块整体隐藏) */
  silent?: boolean
}

request.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return body.data
      const silent = (response.config as RetriedConfig).silent
      if (!silent) message.error(body.msg || '请求失败')
      return Promise.reject(new Error(body.msg || '请求失败'))
    }
    return response.data
  },
  async (error: AxiosError<ApiResponse>) => {
    const { response, config } = error
    const retried = config as RetriedConfig | undefined
    const url = config?.url ?? ''
    const silent = retried?.silent === true

    // 登录/刷新接口的 401 直接走登录页逻辑
    const isAuthApi = url.includes('/system/auth/login') || url.includes('/system/auth/refresh')

    if (response?.status === 401 && retried && !retried.__retried && !isAuthApi) {
      retried.__retried = true
      const ok = await tryRefresh()
      if (ok) {
        const { accessToken } = useAuthStore.getState()
        retried.headers.Authorization = `Bearer ${accessToken}`
        return request(retried)
      }
      message.warning('登录已过期,请重新登录')
      toLogin()
      return Promise.reject(error)
    }

    if (response?.status === 401) {
      message.warning('登录已过期,请重新登录')
      toLogin()
    } else if (silent) {
      // 静默模式:不弹全局提示
    } else if (response?.status === 403) {
      message.error(response.data?.msg || '没有操作权限')
    } else {
      message.error(response?.data?.msg || `请求失败(${response?.status ?? '网络错误'})`)
    }
    return Promise.reject(error)
  },
)

export default request
