import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Users, Shield, Database, Bell, Palette } from 'lucide-react'

interface SystemMenuItem {
  icon: any
  title: string
  description: string
  action: string
  color: string
}

const systemMenuItems: SystemMenuItem[] = [
  {
    icon: Users,
    title: '用户管理',
    description: '管理系统用户、角色和权限',
    action: 'users',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: Shield,
    title: '权限设置',
    description: '配置系统权限和访问控制',
    action: 'permissions',
    color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  },
  {
    icon: Database,
    title: '数据备份',
    description: '备份和恢复系统数据',
    action: 'backup',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: Bell,
    title: '通知设置',
    description: '配置系统通知和提醒',
    action: 'notifications',
    color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  },
  {
    icon: Palette,
    title: '界面设置',
    description: '自定义系统界面和主题',
    action: 'appearance',
    color: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30',
  },
]

export const Route = createFileRoute('/_authenticated/system')({
  component: SystemPage,
})

function SystemPage() {
  const handleAction = (action: string) => {
    console.log('System action:', action)
    // TODO: 实现具体的系统设置功能
  }

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
            <Card
              key={item.action}
              className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {item.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(item.action)}
                      className="w-full"
                    >
                      进入设置
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
              <div className="font-medium text-gray-900 dark:text-white">生产环境</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
