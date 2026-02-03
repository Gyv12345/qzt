import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Building2,
  Book,
  MessageSquare,
  FileText,
  Receipt,
  Package,
  BarChart3,
  Settings,
} from 'lucide-react'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const sidebarData: NavGroup[] = [
  {
    title: '业务管理',
    items: [
      {
        title: '首页',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: '客户管理',
        url: '/customers',
        icon: Building2,
      },
      {
        title: '联系人',
        url: '/contacts',
        icon: Book,
      },
      {
        title: '跟进记录',
        url: '/follow-records',
        icon: MessageSquare,
      },
    ],
  },
  {
    title: '商务管理',
    items: [
      {
        title: '合同管理',
        url: '/contracts',
        icon: FileText,
      },
      {
        title: '发票管理',
        url: '/invoices',
        icon: Receipt,
      },
      {
        title: '产品管理',
        url: '/products',
        icon: Package,
      },
    ],
  },
  {
    title: '数据分析',
    items: [
      {
        title: '统计分析',
        url: '/statistics',
        icon: BarChart3,
      },
    ],
  },
  {
    title: '系统设置',
    items: [
      {
        title: '系统管理',
        url: '/system',
        icon: Settings,
      },
    ],
  },
]
