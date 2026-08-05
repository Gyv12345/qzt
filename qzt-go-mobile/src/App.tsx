import { Suspense, useEffect } from 'react'
import { SpinLoading } from 'antd-mobile'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router'
import { fetchPublicConfigs } from './services/auth'
import { useThemeStore, watchSystemTheme } from './stores/theme'

const fallback = (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <SpinLoading style={{ '--size': '48px' }} />
  </div>
)

export default function App() {
  // 初始化主题:从 localStorage 恢复模式并应用 body class
  const applyTheme = useThemeStore((s) => s.applyTheme)
  useEffect(() => {
    applyTheme()
    watchSystemTheme()
  }, [applyTheme])

  useEffect(() => {
    // 启动引导:公共配置可覆盖站点标题
    fetchPublicConfigs().then((configs) => {
      const title = configs.site_name || configs.app_title || configs.title
      if (title) document.title = title
    })
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={fallback}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
