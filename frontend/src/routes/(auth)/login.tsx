import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

// Zod 验证 schema
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const Route = createFileRoute('/(auth)/login')({
  beforeLoad: () => {
    // ✅ 直接从 authStore 读取认证状态
    const authState = useAuthStore.getState()

    // 如果已认证，重定向到 dashboard
    if (authState.isAuthenticated) {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const search = Route.useSearch()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.username, data.password)

      // 登录成功后，重定向到原始目标页面或 dashboard
      const redirectTo = (search as any).redirect || '/dashboard'
      navigate({ to: redirectTo })
    } catch (err: any) {
      setError('root', {
        type: 'manual',
        message: err.response?.data?.message || '登录失败，请检查用户名和密码',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">企账通</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">客户管理系统</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              {...register('username')}
              placeholder="请输入用户名"
              disabled={isLoading}
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="请输入密码"
              disabled={isLoading}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {errors.root && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {errors.root.message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>默认账号: admin / admin123</p>
        </div>
      </Card>
    </div>
  )
}
