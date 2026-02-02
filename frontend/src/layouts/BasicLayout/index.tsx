import React, { useState, useEffect } from 'react';
import { Outlet } from '@umijs/max';
import Sidebar from './components/Sidebar';
import MobileTabBar from './components/MobileTabBar';
import Header from './components/Header';
import styles from './index.less';

const BasicLayout: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // 检测是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={styles.layout}>
      {/* PC端侧边栏 */}
      {!isMobile && <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />}

      <div className={styles.main} style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 200) }}>
        <Header isMobile={isMobile} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>

      {/* 移动端底部Tab导航 */}
      {isMobile && <MobileTabBar />}
    </div>
  );
};

export default BasicLayout;
