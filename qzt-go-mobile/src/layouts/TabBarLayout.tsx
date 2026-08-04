import { TabBar } from 'antd-mobile'
import { AppOutline, MessageOutline, UserOutline } from 'antd-mobile-icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { key: '/home', title: '工作台', icon: <AppOutline /> },
  { key: '/messages', title: '消息', icon: <MessageOutline /> },
  { key: '/mine', title: '我的', icon: <UserOutline /> },
]

export default function TabBarLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // 当前路径可能不是某个 tab(如详情页),此时不高亮任何 tab
  const activeKey = tabs.some((t) => t.key === location.pathname) ? location.pathname : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </div>
      <TabBar activeKey={activeKey} onChange={(key) => navigate(key)}>
        {tabs.map((item) => (
          <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
        ))}
      </TabBar>
    </div>
  )
}
