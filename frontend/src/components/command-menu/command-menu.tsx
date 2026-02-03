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
  FileText,
  Receipt,
  Search,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  keywords?: string[]
}

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // 页面导航项
  const pageItems: CommandItem[] = [
    {
      id: 'dashboard',
      label: '首页',
      icon: LayoutDashboard,
      action: () => router.navigate({ to: '/dashboard' }),
      keywords: ['home', '首页', '仪表盘'],
    },
    {
      id: 'customers',
      label: '客户管理',
      icon: Building2,
      action: () => router.navigate({ to: '/customers' }),
      keywords: ['customer', '客户', '公司'],
    },
    {
      id: 'contacts',
      label: '联系人',
      icon: Book,
      action: () => router.navigate({ to: '/contacts' }),
      keywords: ['contact', '联系人'],
    },
    {
      id: 'contracts',
      label: '合同管理',
      icon: FileText,
      action: () => router.navigate({ to: '/contracts' }),
      keywords: ['contract', '合同'],
    },
    {
      id: 'invoices',
      label: '发票管理',
      icon: Receipt,
      action: () => router.navigate({ to: '/invoices' }),
      keywords: ['invoice', '发票', '开票'],
    },
  ]

  // Cmd+K 快捷键
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索页面、操作或数据..." />
      <CommandList>
        <CommandEmpty>没有找到结果</CommandEmpty>

        <CommandGroup heading="页面">
          {pageItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  item.action()
                  setOpen(false)
                }}
                keywords={item.keywords}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandGroup heading="数据搜索">
          <CommandItem
            onSelect={() => {
              // TODO: 实现客户搜索
              setOpen(false)
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>搜索客户...</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
