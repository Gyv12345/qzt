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
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
        {collapsed ? '企' : '企账通'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar;
