import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedRoute,
});

function AuthenticatedRoute() {
  const { isAuthenticated, isLoading, requires2FA } = useAuth();
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 如果需要设置 2FA，强制跳转到设置页
  if (isAuthenticated && requires2FA && pathname !== "/setup-2fa") {
    return <Navigate to="/setup-2fa" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AuthenticatedLayout />;
}
