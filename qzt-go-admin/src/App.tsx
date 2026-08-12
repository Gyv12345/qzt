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
  // 单字段订阅:任一设置变化只重渲染 App 本身(此处必要,ConfigProvider 需这些 token),
  // 避免无 selector 整体订阅导致 store 任意字段变更都触发重渲染
  const colorPrimary = useSettingsStore((s) => s.colorPrimary)
  const colorInfo = useSettingsStore((s) => s.colorInfo)
  const borderRadius = useSettingsStore((s) => s.borderRadius)
  const darkMode = useSettingsStore((s) => s.darkMode)
  const compactMode = useSettingsStore((s) => s.compactMode)
  const colorWeak = useSettingsStore((s) => s.colorWeak)

  useEffect(() => {
    // 启动引导:公共配置可覆盖站点标题
    fetchPublicConfigs().then((configs) => {
      const title = configs.site_name || configs.app_title || configs.title
      if (title) document.title = title
    })
  }, [])

  // 深色模式 / 色弱模式:给 body 挂 class,配合 basic-layout.css 适配自定义布局
  useEffect(() => {
    document.body.classList.toggle('qzt-theme-dark', darkMode)
    document.body.classList.toggle('qzt-theme-weak', colorWeak)
  }, [darkMode, colorWeak])

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        // algorithm 支持数组:基础(明/暗) + 可选叠加紧凑算法
        algorithm: [
          darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          ...(compactMode ? [antdTheme.compactAlgorithm] : []),
        ],
        token: {
          colorPrimary,
          colorInfo,
          borderRadius,
          // 数据后台推荐:Fira Sans(西文) + 系统中文回退栈;金额/数字用等宽见全局 .num 类
          fontFamily:
            "'Fira Sans','Inter',system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
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
