import React from 'react';
import { Layout, Dropdown, Avatar, Space, Breadcrumb, Input } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SearchOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons';
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
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
      onClick: () => history.push('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ];

  // 获取面包屑配置
  const getBreadCrumbItems = () => {
    const path = location.pathname;

    if (path === '/customer') {
      return [
        { title: '首页', path: '/' },
        { title: '客户管理' },
      ];
    }

    if (path.startsWith('/customer/') && path !== '/customer') {
      return [
        { title: '首页', path: '/' },
        { title: '客户管理', path: '/customer' },
        { title: '客户详情' },
      ];
    }

    return [{ title: '首页' }];
  };

  const breadcrumbItems = getBreadCrumbItems();

  return (
    <AntHeader
      style={{
        background: '#FFFFFF',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #E2E8F0',
        position: isMobile ? 'fixed' : 'sticky',
        top: isMobile ? 0 : 0,
        left: isMobile ? 0 : undefined,
        right: isMobile ? 0 : undefined,
        zIndex: 1000,
        width: isMobile ? '100vw' : '100%',
        height: 64,
        lineHeight: '64px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* 左侧：面包屑或标题 */}
      {!isMobile ? (
        <Breadcrumb
          items={breadcrumbItems.map((item) => ({
            title: item.path ? (
              <a
                onClick={() => history.push(item.path!)}
                style={{ color: '#64748B', fontSize: 14 }}
              >
                {item.title}
              </a>
            ) : (
              <span style={{ color: '#020617', fontSize: 14, fontWeight: 500 }}>
                {item.title}
              </span>
            ),
          }))}
          style={{ marginLeft: 0 }}
        />
      ) : (
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#020617',
          }}
        >
          企账通
        </div>
      )}

      {/* 右侧：操作区 */}
      <Space size="middle">
        {/* 搜索框（仅PC端） */}
        {!isMobile && (
          <Input
            placeholder="搜索客户、合同..."
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            style={{
              width: 280,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
            }}
          />
        )}

        {/* 通知图标 */}
        {!isMobile && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: '#F8FAFC',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
          >
            <BellOutlined style={{ fontSize: 16, color: '#64748B' }} />
          </div>
        )}

        {/* 用户菜单 */}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
          <Space
            style={{
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: 8,
              transition: 'all 0.2s',
              backgroundColor: '#F8FAFC',
            }}
          >
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{
                backgroundColor: '#0369A1',
              }}
            />
            {!isMobile && (
              <span style={{ fontSize: 14, color: '#020617', fontWeight: 500 }}>
                管理员
              </span>
            )}
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;
