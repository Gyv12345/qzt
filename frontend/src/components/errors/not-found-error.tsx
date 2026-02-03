import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export function NotFoundError() {
  const router = useRouter()

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">页面不存在</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          您访问的页面可能已被删除或暂时不可用
        </p>
        <Button
          onClick={() => router.navigate({ to: '/dashboard' })}
        >
          返回首页
        </Button>
      </div>
    </div>
  )
}
