import React from 'react';
import { Layout, Dropdown, Avatar, Space, Breadcrumb } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  isMobile: boolean;
}

const Header: React.FC<HeaderProps> = ({ isMobile }) => {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    history.push('/login');
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => history.push('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 获取页面标题
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return '首页';
    if (path === '/customer') return '客户管理';
    if (path.startsWith('/customer/')) return '客户详情';
    if (path === '/contract') return '合同管理';
    if (path === '/product') return '产品管理';
    if (path === '/system') return '系统设置';
    return '企账通';
  };

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        right: isMobile ? 0 : undefined,
        zIndex: 999,
        width: isMobile ? '100vw' : '100%',
        height: 64,
        lineHeight: '64px',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 'bold' }}>
        {isMobile ? '企账通' : getPageTitle()}
      </div>

      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <span>管理员</span>
        </Space>
      </Dropdown>
    </AntHeader>
  );
};

export default Header;
