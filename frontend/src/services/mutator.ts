import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios'

// 创建 axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'http://localhost:7890',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：添加 token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理错误
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token 过期，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 自定义 fetcher 函数
export const customInstance = async <T>({
  url,
  method,
  data,
  params,
  headers,
}: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await axiosInstance.request<T>({
      url,
      method,
      data,
      params,
      headers,
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export default customInstance
