import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { Login } from "@/features/auth/login";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const { isAuthenticated, isLoading, isPendingTwoFactorSetup } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 如果已经认证且不是待处理 2FA 设置状态，跳转到首页
  if (isAuthenticated && !isPendingTwoFactorSetup) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
}
