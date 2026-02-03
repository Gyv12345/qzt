import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { useAuthStore } from '@/stores/authStore'

export function Header() {
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* 左侧：标题和搜索 */}
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold">企账通 SCRM</h1>
        {/* TODO: 添加 CommandMenu 触发器 */}
      </div>

      {/* 右侧：操作 */}
      <div className="flex items-center space-x-2">
        <ThemeSwitch />
        <LanguageSwitch />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2 pl-2">
          <div className="h-8 w-8 rounded-full bg-primary" />
          <span className="text-sm font-medium">{user?.username || '用户'}</span>
        </div>
      </div>
    </header>
  )
}
