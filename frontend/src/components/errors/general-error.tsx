import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface GeneralErrorProps {
  error?: Error
  resetError?: () => void
}

export function GeneralError({ error, resetError }: GeneralErrorProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md px-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">发生错误</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          抱歉，应用程序遇到了错误
        </p>
        {error?.message && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200 font-mono">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex justify-center gap-4">
          {resetError && (
            <Button onClick={resetError} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          )}
          <Button onClick={() => window.location.href = '/dashboard'}>
            返回首页
          </Button>
        </div>
      </div>
    </div>
  )
}
