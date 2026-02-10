import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { Login } from "@/features/auth/login";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const { isAuthenticated, isLoading, requires2FA } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 如果已经认证且需要设置 2FA，跳转到设置页
  if (isAuthenticated && requires2FA) {
    return <Navigate to="/setup-2fa" replace />;
  }

  // 如果已经认证且不需要设置 2FA，跳转到首页
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 显示登录页面
  return <Login />;
}
