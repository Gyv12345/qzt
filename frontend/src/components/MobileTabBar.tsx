import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Receipt,
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
    icon: Users,
    label: '客户',
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
];

export function MobileTabBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 w-full h-full',
                  isActive ? 'text-blue-600' : 'text-gray-500'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
