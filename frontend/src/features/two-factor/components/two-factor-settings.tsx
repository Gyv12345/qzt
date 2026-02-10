import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTwoFactor, type TwoFactorStatus } from "../hooks/use-two-factor";
import { TotpSetupDialog } from "./totp-setup-dialog";
import { TotpVerifyDialog } from "./totp-verify-dialog";
import { toast } from "sonner";

export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    appName: string;
    accountName: string;
  } | null>(null);

  const {
    getStatus,
    generateSetup,
    enableTwoFactor,
    disableTwoFactor,
    isLoading: hookLoading,
  } = useTwoFactor();

  const loadStatus = async () => {
    try {
      const data = await getStatus();
      setStatus(data);
    } catch (error) {
      toast.error("获取 2FA 状态失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleEnable = async () => {
    try {
      const data = await generateSetup();
      setSetupData(data);
      setShowSetupDialog(true);
    } catch (error) {
      toast.error("生成设置信息失败");
    }
  };

  const handleVerifyAndEnable = async (secret: string, token: string) => {
    const result = await enableTwoFactor(secret, token);
    await loadStatus();
    return result;
  };

  const handleDisable = async (token: string) => {
    await disableTwoFactor(token);
    await loadStatus();
    toast.success("2FA 已禁用");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            )}
            双因素认证 (2FA)
          </CardTitle>
          <CardDescription>
            {status?.enabled
              ? "您的账户已启用双因素认证，敏感操作需要验证码"
              : "启用双因素认证以增强账户安全性"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <ShieldCheck className="h-4 w-4" />
                <span>2FA 已启用</span>
              </div>
              {status.setupCompletedAt && (
                <p className="text-xs text-muted-foreground">
                  设置时间: {new Date(status.setupCompletedAt).toLocaleString()}
                </p>
              )}
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
                disabled={hookLoading}
              >
                禁用 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4" />
                <span>2FA 未启用</span>
              </div>
              <Button onClick={handleEnable} disabled={hookLoading}>
                启用 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TotpSetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        setupData={setupData}
        onVerify={handleVerifyAndEnable}
        onComplete={() => {
          setShowSetupDialog(false);
          toast.success("2FA 启用成功");
        }}
        isLoading={hookLoading}
      />

      <TotpVerifyDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
        onVerify={handleDisable}
        title="禁用 2FA"
        description="请输入验证码以确认禁用双因素认证"
      />
    </>
  );
}
