import type { SysMenu } from '../types'

/** 递归查找菜单树中是否存在指定 path(用于判断是否展示跳转链接,避免无权限用户看到死链) */
export function menuHasPath(menus: SysMenu[], path: string): boolean {
  for (const menu of menus) {
    if (menu.path === path) return true
    if (menu.children?.length && menuHasPath(menu.children, path)) return true
  }
  return false
}
