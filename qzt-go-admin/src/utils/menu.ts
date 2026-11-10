import type { SysMenu } from '../types'

/** 递归查找菜单树中是否存在指定 path(用于判断是否展示跳转链接,避免无权限用户看到死链) */
export function menuHasPath(menus: SysMenu[], path: string): boolean {
  for (const menu of menus) {
    if (menu.path === path) return true
    if (menu.children?.length && menuHasPath(menu.children, path)) return true
  }
  return false
}

/** 过滤出可见菜单(排除按钮),并按 sort 排序 */
export function visibleMenus(list: SysMenu[] = []): SysMenu[] {
  return list
    .filter((m) => m.type !== 2 && m.visible === 1 && m.status === 1)
    .sort((a, b) => a.sort - b.sort)
}

export interface MenuChain {
  module: SysMenu
  /** 叶子所属的分组(二级目录),无分组时为 null */
  group: SysMenu | null
  leaf: SysMenu
}

/** 根据当前路径定位 模块/分组/叶子 三级菜单链 */
export function findChain(modules: SysMenu[], pathname: string): MenuChain | null {
  const match = (path?: string) =>
    !!path && (pathname === path || pathname.startsWith(`${path}/`))
  for (const module of modules) {
    if (module.type === 1) {
      if (match(module.path)) return { module, group: null, leaf: module }
      continue
    }
    for (const child of visibleMenus(module.children)) {
      if (child.type === 1) {
        if (match(child.path)) return { module, group: null, leaf: child }
        continue
      }
      for (const leaf of visibleMenus(child.children)) {
        if (leaf.type === 1 && match(leaf.path)) return { module, group: child, leaf }
      }
    }
  }
  return null
}

/** 非菜单页(不显示在侧栏但可路由)的固定 Tab 标题 */
const EXTRA_PAGE_TITLES: Record<string, string> = {
  '/kb/document/editor': '文档编辑',
}

/** 在完整菜单树(含 visible=0 的隐藏页)中按 path 精确定位叶子菜单 */
function findMenuByPath(list: SysMenu[], pathname: string): SysMenu | null {
  for (const m of list) {
    if (m.type === 1 && m.path && (pathname === m.path || pathname.startsWith(`${m.path}/`))) {
      return m
    }
    if (m.children?.length) {
      const found = findMenuByPath(m.children, pathname)
      if (found) return found
    }
  }
  return null
}

/** 多 Tab 标题:优先菜单叶子名(含隐藏页),工作台/非菜单页用固定文案,兜底路径本身 */
export function resolveTabTitle(menus: SysMenu[], pathname: string): string {
  if (pathname === '/dashboard') return '工作台'
  const leaf = findMenuByPath(menus, pathname)
  if (leaf) return leaf.name
  return EXTRA_PAGE_TITLES[pathname] ?? pathname
}
