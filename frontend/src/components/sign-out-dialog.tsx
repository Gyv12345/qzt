import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleSignOut = () => {
    logout();
    // Preserve current location for redirect after sign-in
    const currentPath = location.href;
    navigate({
      to: "/login",
      search: { redirect: currentPath },
      replace: true,
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("nav.user.signOutDialog.title")}
      desc={t("nav.user.signOutDialog.description")}
      confirmText={t("nav.user.signOutDialog.confirm")}
      destructive
      handleConfirm={handleSignOut}
      className="sm:max-w-sm"
    />
  );
}
