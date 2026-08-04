import { Avatar, Button, Dialog, List, NavBar, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../services/auth'
import { useAuthStore } from '../../stores/auth'

export default function Mine() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()

  const onLogout = async () => {
    const confirmed = await Dialog.confirm({ content: '确定要退出登录吗?' })
    if (!confirmed) return
    await logout()
    Toast.show({ icon: 'success', content: '已退出登录' })
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <NavBar back={null}>我的</NavBar>
      <List header="个人信息">
        <List.Item
          prefix={
            <Avatar
              src={profile?.avatar || ''}
              style={{ '--size': '48px' }}
              fallback={profile?.nickname?.[0] || profile?.username?.[0] || 'U'}
            />
          }
          description={profile?.username}
        >
          {profile?.nickname || '-'}
        </List.Item>
        <List.Item extra={profile?.phone || '-'}>手机号</List.Item>
        <List.Item extra={profile?.email || '-'}>邮箱</List.Item>
        <List.Item extra={profile?.roles?.map((r) => r.name).join(' / ') || '-'}>角色</List.Item>
      </List>
      <div style={{ padding: 24 }}>
        <Button block color="danger" fill="outline" onClick={onLogout}>
          退出登录
        </Button>
      </div>
    </div>
  )
}
