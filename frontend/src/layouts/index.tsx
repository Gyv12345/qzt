import { Layout, Menu, Button, Dropdown } from 'antd';
import { Outlet, useNavigate, useLocation } from '@umijs/max';
import { LogoutOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

const BasicLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const menuItems = [
    { key: '/dashboard', label: '仪表盘' },
    { key: '/customer', label: '客户管理' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '40px' }}>
            企账通SCRM
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
        <Dropdown
          menu={{
            items: [
              { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: handleLogout },
            ],
          }}
        >
          <Button type="link" style={{ color: 'white' }}>
            用户
          </Button>
        </Dropdown>
      </Header>
      <Content>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default BasicLayout;
