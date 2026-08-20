import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { unstableSetRender } from 'antd-mobile'
import './global.css'
import App from './App'

// React 19 移除了 react-dom 主入口的 render/createRoot,antd-mobile v5 官方兼容方案
// (https://mobile.ant.design/guide/v5-for-19):注入 createRoot 渲染器,否则
// Dialog/Toast 等命令式组件静默渲染失败
unstableSetRender((node, container) => {
  const containerEl = container as Element & { _reactRoot?: Root }
  containerEl._reactRoot ||= createRoot(container)
  const root = containerEl._reactRoot
  root.render(node)
  return async () => {
    // 官方建议延迟一拍再卸载,避免打断 React 渲染中的工作
    await new Promise((resolve) => setTimeout(resolve, 0))
    root.unmount()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
