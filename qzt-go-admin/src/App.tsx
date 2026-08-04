import { Suspense, useEffect } from 'react'
import { App as AntdApp, ConfigProvider, Spin, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router'
import { fetchPublicConfigs } from './services/auth'
import { useSettingsStore } from './stores/settings'

const fallback = (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin size="large" />
  </div>
)

export default function App() {
  const { colorPrimary, colorInfo, borderRadius, darkMode } = useSettingsStore()

  useEffect(() => {
    // 启动引导:公共配置可覆盖站点标题
    fetchPublicConfigs().then((configs) => {
      const title = configs.site_name || configs.app_title || configs.title
      if (title) document.title = title
    })
  }, [])

  // 深色模式:给 body 挂 class,配合 basic-layout.css 适配自定义布局
  useEffect(() => {
    document.body.classList.toggle('qzt-theme-dark', darkMode)
  }, [darkMode])

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary,
          colorInfo,
          borderRadius,
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Suspense fallback={fallback}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}
