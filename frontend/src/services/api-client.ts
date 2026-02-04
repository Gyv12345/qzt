import axios, { AxiosError, InternalAxiosRequestConfig, AxiosInstance } from 'axios'

// 从 localStorage 获取 token
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

// 创建 axios 实例
const axiosInstance: AxiosInstance = axios.create({
  // 使用 /api 前缀，通过 Vite 代理转发到后端
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动注入 token 和语言设置
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加 Accept-Language 请求头
    if (config.headers) {
      const language = localStorage.getItem('i18nextLng') || 'zh'
      config.headers['Accept-Language'] = language
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器：统一提取 data 字段和错误处理
axiosInstance.interceptors.response.use(
  (response) => {
    // 后端统一响应格式: { success, statusCode, message, data }
    // 自动提取 data 字段
    const responseData = response.data as any
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      response.data = responseData.data
    }
    return response
  },
  (error: AxiosError) => {
    // 401 未授权：清除 token 并跳转登录
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_info')
        // 不直接跳转，由 AuthContext 处理
        window.dispatchEvent(new CustomEvent('unauthorized'))
      }
    }

    // 统一错误提示
    const message = (error.response?.data as any)?.message || error.message || '请求失败'
    error.message = message

    return Promise.reject(error)
  },
)

// Orval 要求导出一个函数，接收请求配置并返回 Promise
export const customInstance = async <T>(config: {
  url: string
  method: string
  data?: any
  params?: any
  headers?: any
  baseURL?: string
}): Promise<T> => {
  console.log('[api-client] 发起请求:', { url: config.url, method: config.method })
  const response = await axiosInstance.request({
    url: config.url,
    method: config.method as any,
    data: config.data,
    params: config.params,
    headers: config.headers,
  })
  console.log('[api-client] 收到响应:', { status: response.status, data: response.data })
  return response.data as T
}

export default axiosInstance
