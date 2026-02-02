import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function ProtectedRoute() {
  const { isAuthenticated, token } = useAuthStore();

  // 检查是否已登录
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  // 已登录,渲染子路由
  return <Outlet />;
}
