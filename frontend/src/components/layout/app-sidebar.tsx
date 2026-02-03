import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { sidebarData } from './data/sidebar-data'
import { Building2, ArrowLeft, Menu } from 'lucide-react'

export function AppSidebar() {
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [collapsed, setCollapsed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const currentPath = router.state.location.pathname

  const SidebarContent = () => (
    <div className="flex h-full w-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="text-lg font-bold">企账通</span>
          )}
        </div>
      </div>

      {/* 菜单 */}
      <ScrollArea className="flex-1 px-3 py-4">
        {sidebarData.map((group) => (
          <div key={group.title} className="mb-6">
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                {group.title}
              </h3>
            )}
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.url

                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2 transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    onClick={() => isMobile && setIsOpen(false)}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="ml-3">{item.title}</span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </ScrollArea>

      {/* 折叠按钮 */}
      {!isMobile && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ArrowLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && (
              <span className="ml-3">{collapsed ? '展开' : '折叠'}</span>
            )}
          </Button>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent />
    </aside>
  )
}
