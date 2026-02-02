import { Outlet, useLocation } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { MobileTabBar } from '@/components/MobileTabBar';

export function MainLayout() {
  const location = useLocation();
  const { isMobile, setIsMobile, setCurrentPath, sidebarCollapsed } = useUiStore();

  // 检测设备类型
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // 更新当前路径
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* PC端侧边栏 */}
      {!isMobile && <Sidebar />}

      {/* 主内容区 */}
      <div
        className={`transition-all duration-200 ${
          !isMobile ? (sidebarCollapsed ? 'ml-16' : 'ml-56') : 'ml-0'
        }`}
      >
        <Header />

        <main
          className={`p-6 ${isMobile ? 'pb-20' : ''}`}
          style={{
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* 移动端底部Tab导航 */}
      {isMobile && <MobileTabBar />}
    </div>
  );
}
