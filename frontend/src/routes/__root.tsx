import { createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme-provider'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from 'sonner'
import i18n from '@/lib/i18n'
import { queryClient } from '@/lib/api-client'
import LoadingBar from 'react-top-loading-bar'
import { useRef, useState } from 'react'

interface RouterContext {
  isAuthenticated: boolean
  user: User | null
}

interface User {
  id: string
  username: string
  email: string
  role: string
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context, location }) => {
    // 根路径重定向到 dashboard
    if (location.pathname === '/') {
      if (context.isAuthenticated) {
        throw redirect({
          to: '/dashboard',
        })
      } else {
        throw redirect({
          to: '/login',
        })
      }
    }
  },
  component: RootComponent,
  errorComponent: ({ error }) => {
    console.error('路由错误:', error)

    if (error.status === 401) {
      return <div>401 - 未授权</div>
    }
    if (error.status === 403) {
      return <div>403 - 禁止访问</div>
    }
    if (error.status === 404) {
      return <div>404 - 页面不存在</div>
    }

    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">发生错误</h1>
          <p className="mt-2 text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  },
})

function RootComponent() {
  const loadingBarRef = useRef<any>(null)
  const [progress, setProgress] = useState(0)

  // 监听路由变化，显示加载条
  useState(() => {
    // TODO: 集成路由导航事件
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="qzt-theme">
        <I18nextProvider i18n={i18n}>
          <>
            <LoadingBar
              color="#3b82f6"
              progress={progress}
              onLoaderFinished={() => setProgress(0)}
              className="loading-bar"
            />

            <Outlet />

            <Toaster position="top-right" richColors />

            {/* 开发模式下显示路由调试工具 */}
            {import.meta.env.DEV && <TanStackRouterDevtools />}
          </>
        </I18nextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
