import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordChangeDialog } from "./password-change-dialog";
import { useTwoFactor } from "@/features/two-factor";
import type { TwoFactorStatus } from "@/features/two-factor";

export function PasswordChangeForm() {
  const [showDialog, setShowDialog] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] =
    useState<TwoFactorStatus | null>(null);
  const { getStatus } = useTwoFactor();

  // 加载 2FA 状态
  useEffect(() => {
    getStatus()
      .then(setTwoFactorStatus)
      .catch(() => {
        // 忽略错误，默认为未启用
      });
  }, [getStatus]);

  const handleSuccess = () => {
    setShowDialog(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            修改密码
          </CardTitle>
          <CardDescription>定期修改密码以保护账户安全</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {twoFactorStatus?.enabled
                ? "您已启用双因素认证，修改密码时需要输入验证码"
                : "建议启用双因素认证以增强账户安全性"}
            </p>
            <Button onClick={() => setShowDialog(true)}>修改密码</Button>
          </div>
        </CardContent>
      </Card>

      <PasswordChangeDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={handleSuccess}
        allowClose={true}
        twoFactorEnabled={twoFactorStatus?.enabled}
      />
    </>
  );
}
