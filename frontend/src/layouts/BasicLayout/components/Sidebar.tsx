import React from 'react';
import { Menu, Layout } from 'antd';
import { Link, useLocation } from '@umijs/max';
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/customer',
      icon: <UserOutlined />,
      label: <Link to="/customer">客户</Link>,
    },
    {
      key: '/contract',
      icon: <FileTextOutlined />,
      label: <Link to="/contract">合同</Link>,
    },
    {
      key: '/product',
      icon: <AppstoreOutlined />,
      label: <Link to="/product">产品</Link>,
    },
    {
      key: '/system',
      icon: <SettingOutlined />,
      label: <Link to="/system">系统</Link>,
    },
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="lg"
      collapsedWidth={80}
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: '#0F172A',
        boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
        borderRight: '1px solid #1E293B',
      }}
      trigger={null}
    >
      {/* Logo 区域 */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 24px',
          borderBottom: '1px solid #1E293B',
          background: 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)',
        }}
      >
        {collapsed ? (
          <span
            style={{
              color: '#fff',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            企
          </span>
        ) : (
          <span
            style={{
              color: '#fff',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.3px',
            }}
          >
            企账通
          </span>
        )}
      </div>

      {/* 菜单 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{
          background: 'transparent',
          borderRight: 'none',
          paddingTop: '8px',
        }}
      />
    </Sider>
  );
};

export default Sidebar;
