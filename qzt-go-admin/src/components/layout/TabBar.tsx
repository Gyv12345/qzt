import { useEffect, useMemo, useRef } from 'react'
import { Dropdown } from 'antd'
import { CloseOutlined, RedoOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { HOME_TAB, useTabsStore } from '../../stores/tabs'
import { useAuthStore } from '../../stores/auth'
import { resolveTabTitle } from '../../utils/menu'

/** 内容区顶部的多 Tab 栏:单击切换、hover 出现关闭按钮、右键菜单(刷新/关闭/关闭其他/关闭全部) */
export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const menus = useAuthStore((s) => s.menus)
  const tabs = useTabsStore((s) => s.tabs)
  const closeTab = useTabsStore((s) => s.close)
  const closeOthers = useTabsStore((s) => s.closeOthers)
  const closeAllTabs = useTabsStore((s) => s.closeAll)
  const refreshTab = useTabsStore((s) => s.refresh)
  /** 激活 Tab 自动滚入视野(Tab 多时横向溢出场景) */
  const activeRef = useRef<HTMLDivElement | null>(null)

  const titles = useMemo(() => {
    const map: Record<string, string> = {}
    for (const path of tabs) map[path] = resolveTabTitle(menus, path)
    return map
  }, [menus, tabs])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname])

  /** 关闭 Tab;关闭的是当前激活 Tab 时跳到相邻 Tab(优先左侧) */
  const onClose = (path: string) => {
    if (path === HOME_TAB) return
    const idx = tabs.indexOf(path)
    closeTab(path)
    if (path === pathname) {
      navigate(tabs[idx - 1] ?? tabs[idx + 1] ?? HOME_TAB)
    }
  }

  return (
    <div className="qzt-tabbar" role="tablist">
      {tabs.map((path) => {
        const active = path === pathname
        const closable = path !== HOME_TAB
        return (
          <Dropdown
            key={path}
            trigger={['contextMenu']}
            menu={{
              items: [
                { key: 'refresh', icon: <RedoOutlined />, label: '刷新' },
                ...(closable ? [{ key: 'close', icon: <CloseOutlined />, label: '关闭' }] : []),
                { type: 'divider' },
                { key: 'closeOthers', label: '关闭其他' },
                { key: 'closeAll', label: '关闭全部' },
              ],
              onClick: ({ key }) => {
                if (key === 'refresh') {
                  refreshTab(path)
                } else if (key === 'close') {
                  onClose(path)
                } else if (key === 'closeOthers') {
                  closeOthers(path)
                  if (pathname !== HOME_TAB && pathname !== path) navigate(path)
                } else if (key === 'closeAll') {
                  closeAllTabs()
                  if (pathname !== HOME_TAB) navigate(HOME_TAB)
                }
              },
            }}
          >
            <div
              ref={active ? activeRef : undefined}
              className={`qzt-tab${active ? ' active' : ''}`}
              role="tab"
              aria-selected={active}
              title={titles[path]}
              onClick={() => {
                if (path !== pathname) navigate(path)
              }}
            >
              <span className="qzt-tab-title">{titles[path]}</span>
              {closable && (
                <span
                  className="qzt-tab-close"
                  aria-label="关闭"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(path)
                  }}
                >
                  <CloseOutlined />
                </span>
              )}
            </div>
          </Dropdown>
        )
      })}
    </div>
  )
}
