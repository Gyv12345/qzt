import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
  Search as SearchIcon,
} from 'lucide-react'

interface MenuItem {
  icon: any
  label: string
  to: string
  keywords?: string[]
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: '首页', to: '/dashboard', keywords: ['dashboard', '主页'] },
  { icon: Building2, label: '公司', to: '/customers', keywords: ['customer', '客户'] },
  { icon: Book, label: '联系人', to: '/contacts', keywords: ['contact'] },
  { icon: MessageSquare, label: '跟进', to: '/follow-records', keywords: ['follow', '跟进记录'] },
  { icon: BarChart3, label: '统计', to: '/statistics', keywords: ['statistics', '数据分析'] },
  { icon: FileText, label: '合同', to: '/contracts', keywords: ['contract'] },
  { icon: Receipt, label: '开票', to: '/invoices', keywords: ['invoice', '发票'] },
  { icon: Package, label: '产品', to: '/products', keywords: ['product'] },
  { icon: Settings, label: '系统', to: '/system', keywords: ['settings', '设置'] },
]

export function SearchCommand() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = (to: string) => {
    setOpen(false)
    router.navigate({ to })
  }

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <SearchIcon className="w-4 h-4" />
        <span>搜索...</span>
        <kbd className="ml-auto hidden sm:inline-flex gap-1 items-center rounded border bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-normal text-gray-600 dark:text-gray-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="输入搜索关键词..." />
        <CommandList>
          <CommandEmpty>没有找到相关结果</CommandEmpty>
          <CommandGroup heading="导航">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.to}
                  onSelect={() => handleSelect(item.to)}
                  keywords={item.keywords}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{item.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

// 全局搜索按钮（用于 Header）
export function SearchButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <SearchIcon className="w-4 h-4" />
        <span className="hidden sm:inline">搜索</span>
        <kbd className="ml-auto hidden sm:inline-flex gap-1 items-center rounded border bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-normal text-gray-600 dark:text-gray-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="搜索页面、功能..." />
        <CommandList>
          <CommandEmpty>没有找到相关结果</CommandEmpty>
          <CommandGroup heading="快速导航">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.to}
                  onSelect={() => {
                    setOpen(false)
                    // 使用 navigate 跳转
                  }}
                  keywords={item.keywords}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{item.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
