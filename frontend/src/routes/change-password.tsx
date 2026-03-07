import { createFileRoute, Navigate } from "@tanstack/react-router";
import { FirstLoginPasswordChange } from "@/features/settings/password/components/first-login-password-change";

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordRoute,
});

function ChangePasswordRoute() {
  // 检查是否有临时 token，没有则跳转到登录页
  const hasTempToken =
    typeof window !== "undefined" &&
    !!sessionStorage.getItem("auth_temp_password_change");

  if (!hasTempToken) {
    return <Navigate to="/login" replace />;
  }

  return <FirstLoginPasswordChange />;
}
