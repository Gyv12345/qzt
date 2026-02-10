import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Setup2faPage } from "@/features/two-factor/setup-2fa-page";

export const Route = createFileRoute("/setup-2fa")({
  component: Setup2faRoute,
});

function Setup2faRoute() {
  // 检查是否有临时 token，没有则跳转到登录页
  const hasTempToken =
    typeof window !== "undefined" &&
    !!sessionStorage.getItem("auth_temp_token");

  if (!hasTempToken) {
    return <Navigate to="/login" replace />;
  }

  return <Setup2faPage />;
}
