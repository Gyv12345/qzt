import { NavLink } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Receipt,
  MessageSquare,
  BarChart3,
  Book,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: '首页',
  },
  {
    path: '/customers',
    icon: Building2,
    label: '公司',
  },
  {
    path: '/contacts',
    icon: Book,
    label: '联系人',
  },
  {
    path: '/follow-records',
    icon: MessageSquare,
    label: '跟进',
  },
  {
    path: '/statistics',
    icon: BarChart3,
    label: '统计',
  },
  {
    path: '/contracts',
    icon: FileText,
    label: '合同',
  },
  {
    path: '/invoices',
    icon: Receipt,
    label: '开票',
  },
  {
    path: '/products',
    icon: Package,
    label: '产品',
  },
  {
    path: '/system',
    icon: Settings,
    label: '系统',
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-200 z-50',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-blue-400" />
          {!sidebarCollapsed && (
            <span className="text-xl font-bold">企账通</span>
          )}
        </div>
      </div>

      {/* 菜单 */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 折叠按钮 */}
      <button
        onClick={toggleSidebar}
        className="absolute bottom-4 right-4 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
