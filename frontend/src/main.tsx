import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import './index.css'

// Import the Generated Route Tree
import { routeTree } from './routes/routeTree.gen'

// 创建 router（不需要 context）
const router = createRouter({
  routeTree,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// 创建 QueryClient 实例
import { QueryClient } from '@tanstack/react-query'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      retry: 1,
    },
  },
})

// 认证初始化组件
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <RouterProvider router={router} />
      </AuthInitializer>
    </QueryClientProvider>
  </React.StrictMode>,
)
