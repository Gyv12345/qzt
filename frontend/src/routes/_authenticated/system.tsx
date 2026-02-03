import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import { Settings, Users, Building2, Shield, FileText, Webhook, HardDrive } from 'lucide-react'

interface SystemMenuItem {
  icon: any
  title: string
  description: string
  href: string
  color: string
}

const systemMenuItems: SystemMenuItem[] = [
  {
    icon: Users,
    title: '用户管理',
    description: '管理系统用户和权限',
    href: '/system/users',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: Building2,
    title: '部门管理',
    description: '管理部门组织结构',
    href: '/system/departments',
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  },
  {
    icon: Shield,
    title: '角色权限',
    description: '配置角色和权限',
    href: '/system/roles',
    color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  },
  {
    icon: FileText,
    title: '操作日志',
    description: '查看系统操作日志',
    href: '/system/logs',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: Webhook,
    title: 'Webhook 配置',
    description: '配置消息推送 Webhook',
    href: '/system/webhooks',
    color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  },
  {
    icon: HardDrive,
    title: '文件管理',
    description: '管理 OSS 文件存储',
    href: '/system/files',
    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
  },
]

export const Route = createFileRoute('/_authenticated/system')({
  component: SystemPage,
})

function SystemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">系统设置</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理系统配置和偏好设置</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemMenuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} to={item.href}>
              <Card className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* 系统信息 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">系统信息</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">系统版本</div>
              <div className="font-medium text-gray-900 dark:text-white">v1.0.0</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">最后更新</div>
              <div className="font-medium text-gray-900 dark:text-white">2026-02-03</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">环境</div>
              <div className="font-medium text-gray-900 dark:text-white">开发环境</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
