import { useRouter } from '@tanstack/react-router'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { ThemeSwitch } from '@/components/theme-switch'
import { SearchButton } from '@/components/search'

export function Header() {
  const router = useRouter()
  const navigate = router.useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    try {
      await logout()
      navigate({ to: '/login' })
    } catch (error) {
      console.error('Logout failed:', error)
      // 即使失败也重定向到登录页
      navigate({ to: '/login' })
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold dark:text-white">企账通 SCRM</h1>
        <SearchButton />
      </div>

      <div className="flex items-center gap-4">
        {/* 主题切换 */}
        <ThemeSwitch />

        {/* 用户信息 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {user?.username || '用户'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.role || '管理员'}
              </p>
            </div>
          </div>

          {/* 登出按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-9 w-9 p-0"
            aria-label="登出"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
