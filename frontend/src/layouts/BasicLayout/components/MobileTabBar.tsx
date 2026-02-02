import React from 'react';
import { TabBar } from 'antd-mobile';
import {
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from '@umijs/max';

const MobileTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    {
      key: '/',
      title: '首页',
      icon: <HomeOutlined />,
    },
    {
      key: '/customer',
      title: '客户',
      icon: <UserOutlined />,
    },
    {
      key: '/contract',
      title: '合同',
      icon: <FileTextOutlined />,
    },
    {
      key: '/product',
      title: '产品',
      icon: <AppstoreOutlined />,
    },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '1px solid #eee' }}>
      <TabBar
        activeKey={location.pathname}
        onChange={(key) => navigate(key)}
      >
        {tabs.map((tab) => (
          <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
        ))}
      </TabBar>
    </div>
  );
};

export default MobileTabBar;
