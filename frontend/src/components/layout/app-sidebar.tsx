import { Link, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  Book,
  MessageSquare,
  BarChart3,
  FileText,
  Receipt,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface MenuItem {
  path: string
  icon: any
  label: string
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', icon: LayoutDashboard, label: '首页' },
  { path: '/customers', icon: Building2, label: '公司' },
  { path: '/contacts', icon: Book, label: '联系人' },
  { path: '/follow-records', icon: MessageSquare, label: '跟进' },
  { path: '/statistics', icon: BarChart3, label: '统计' },
  { path: '/contracts', icon: FileText, label: '合同' },
  { path: '/invoices', icon: Receipt, label: '开票' },
  { path: '/products', icon: Package, label: '产品' },
  { path: '/system', icon: Settings, label: '系统' },
]

export function AppSidebar() {
  const router = useRouter()
  const currentPath = router.state.location.pathname
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Building2 className="h-8 w-8 text-blue-400" />
        {!collapsed && (
          <span className="ml-2 text-xl font-bold">企账通</span>
        )}
      </div>

      {/* 菜单 */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="ml-3">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* 折叠按钮 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center border-t border-gray-800 p-3 text-gray-400 hover:text-white transition-colors"
        aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>
    </aside>
  )
}
