import { lazy, type ComponentType } from 'react'
import type { SysMenu } from '../types'
import NotFound from '../pages/error/404'

/** pages 目录下所有页面,按后端菜单的 component 字段(如 system/user/index)解析 */
const pageModules = import.meta.glob('../pages/**/*.tsx')

/** 页面组件懒加载缓存:同一页面全局只创建一个 lazy 组件,路由与多 Tab 面板共用同一实例,
 *  避免渲染来源切换时组件类型变化导致意外重挂(丢失 keep-alive 状态) */
const lazyPageCache = new Map<string, ComponentType>()

export function getPage(component: string): ComponentType {
  let Page = lazyPageCache.get(component)
  if (!Page) {
    const loader = pageModules[`../pages/${component}.tsx`]
    Page = loader ? lazy(loader as () => Promise<{ default: ComponentType }>) : NotFound
    lazyPageCache.set(component, Page)
  }
  return Page
}

// Dashboard 单独 lazy:它间接引入 echarts,懒加载可将 echarts 移出首屏 bundle
export const Dashboard = lazy(() => import('../pages/dashboard'))

/** 非菜单页面(不显示在侧栏,但需要路由,如编辑器/详情页) */
export const extraRoutes: { path: string; component: string }[] = [
  { path: '/kb/document/editor', component: 'kb/document/editor' },
]

/** path → 页面组件映射(工作台 + 菜单路由 + 非菜单页),供布局的多 Tab 面板按 Tab 渲染 */
export function buildPageMap(menus: SysMenu[]): Map<string, ComponentType> {
  const map = new Map<string, ComponentType>()
  map.set('/dashboard', Dashboard)
  const walk = (list: SysMenu[]) => {
    for (const m of list) {
      if (m.type === 1 && m.component && m.status === 1) map.set(m.path, getPage(m.component))
      if (m.children?.length) walk(m.children)
    }
  }
  walk(menus)
  for (const r of extraRoutes) map.set(r.path, getPage(r.component))
  return map
}
