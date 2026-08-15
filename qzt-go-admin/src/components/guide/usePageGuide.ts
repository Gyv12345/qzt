import { useEffect } from 'react'
import { GuideContext } from './GuideProvider'
import { useContext } from 'react'

/**
 * 页面级向导接入 hook:在页面组件顶部调用,向 GuideProvider 注册当前页,
 * Provider 会在首次进入且未看过时自动弹本页 Tour。
 *
 * 接入约定:
 * 1. usePageGuide('模块.实体') —— key 需在 src/guides/index.ts 注册
 * 2. 关键元素加 data-guide 属性(如 data-guide="add")供 Tour 步骤 selector 定位
 * 3. toolBarRender 末尾追加 <GuideHelpButton />
 */
export function usePageGuide(key: string) {
  const ctx = useContext(GuideContext)
  // 取出后无条件调用 useEffect,避免 hooks 条件调用(rules-of-hooks);
  // ctx 为空(Provider 外使用)时 effect 内直接跳过,行为与原先提前 return 一致
  const setPageKey = ctx?.setPageKey
  useEffect(() => {
    if (!setPageKey) return
    setPageKey(key)
    // 页面卸载不清空 pageKey:切到未接入页面时旧的 key 保留但 tour 已看过/已关闭,无副作用
  }, [key, setPageKey])
  return ctx
}
