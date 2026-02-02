import React from 'react';
import { Layout, Dropdown, Avatar, Space } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  isMobile: boolean;
}

const Header: React.FC<HeaderProps> = ({ isMobile }) => {
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
        width: isMobile ? '100vw' : 'auto',
        height: 64,
        lineHeight: '64px',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 'bold' }}>
        {isMobile ? '企账通' : ''}
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
