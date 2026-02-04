import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getScrmApi } from '@/services/api'
import type { LoginDto } from '@/models'
import * as authStorage from '@/lib/auth-storage'
import type { StoredUser } from '@/lib/auth-storage'

interface AuthContextType {
  user: StoredUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化：从 localStorage 恢复用户信息
  useEffect(() => {
    const storedUser = authStorage.getUserInfo()
    const token = authStorage.getToken()

    if (storedUser && token) {
      setUser(storedUser)
    }
    setIsLoading(false)

    // 监听未授权事件
    const handleUnauthorized = () => {
      toast.error('登录已过期，请重新登录')
      authStorage.clearAuth()
      setUser(null)
      // 使用 window.location 跳转
      window.location.href = '/login'
    }

    window.addEventListener('unauthorized', handleUnauthorized)
    return () => window.removeEventListener('unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    console.log('[login] 开始登录请求', { username, password: '***' })
    try {
      const { authControllerLogin } = getScrmApi()
      console.log('[login] authControllerLogin 函数已获取')

      // customInstance 已自动提取 response.data，返回的就是 { access_token, user }
      const data = await authControllerLogin({ username, password }) as any
      console.log('[login] 收到响应:', data)

      if (data?.access_token && data?.user) {
        authStorage.setAuth(data)
        setUser(data.user)
        toast.success('登录成功')
      } else {
        console.error('[login] 登录响应格式错误. 完整响应:', data)
        throw new Error('登录响应格式错误')
      }
    } catch (error: any) {
      console.error('[login] 登录失败:', error)
      const message = error.response?.data?.message || error.message || '登录失败'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authStorage.clearAuth()
    setUser(null)
    window.location.href = '/login'
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { authControllerGetUserInfo } = getScrmApi()
      const userData = await authControllerGetUserInfo() as any
      authStorage.setUserInfo(userData)
      setUser(userData)
    } catch (error) {
      console.error('刷新用户信息失败:', error)
    }
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
