import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { TotpVerifyInput } from "./totp-verify-input";
import { BackupCodesDisplay } from "./backup-codes-display";

interface SetupStep {
  secret: string;
  qrCodeUrl: string;
  appName: string;
  accountName: string;
}

interface TotpSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setupData: SetupStep | null;
  onVerify: (
    secret: string,
    token: string,
  ) => Promise<{ backupCodes: string[] }>;
  onComplete: () => void;
  isLoading?: boolean;
  allowClose?: boolean; // 是否允许关闭（首次登录强制设置时不允许）
}

export function TotpSetupDialog({
  open,
  onOpenChange,
  setupData,
  onVerify,
  onComplete,
  isLoading: _isLoading,
  allowClose = true,
}: TotpSetupDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string>();
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      toast.success("密钥已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async (token: string) => {
    if (!setupData) return;

    setVerifyLoading(true);
    setVerifyError(undefined);

    try {
      const result = await onVerify(setupData.secret, token);
      setBackupCodes(result.backupCodes);
      setStep(3);
    } catch (error: any) {
      setVerifyError(error.message || "验证码无效，请重试");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
    setStep(1);
    setBackupCodes([]);
  };

  return (
    <Dialog open={open} onOpenChange={allowClose ? onOpenChange : undefined}>
      <DialogContent
        className="sm:max-w-md"
        {...(!allowClose && {
          // 阻止点击外部关闭
          onPointerDownOutside: (e) => e.preventDefault(),
          // 阻止 ESC 键关闭
          onEscapeKeyDown: (e) => e.preventDefault(),
        })}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {step === 1 && "设置双因素认证"}
            {step === 2 && "验证配置"}
            {step === 3 && "保存备份码"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "请使用身份验证器应用扫描二维码或手动输入密钥"}
            {step === 2 && "输入身份验证器应用中的 6 位验证码以确认配置"}
            {step === 3 && "请妥善保存以下备份码，它们是您恢复账户的唯一方式"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && setupData && (
          <div className="space-y-4">
            <div className="flex justify-center py-4">
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={setupData.qrCodeUrl} size={200} />
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">无法扫描？</CardTitle>
                <CardDescription className="text-xs">
                  您可以手动输入以下密钥到身份验证器应用中
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono tracking-wider">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                    disabled={copied}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => setStep(2)}>
              下一步
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <TotpVerifyInput
              onComplete={handleVerify}
              isLoading={verifyLoading}
              error={verifyError}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep(1)}
            >
              返回上一步
            </Button>
          </div>
        )}

        {step === 3 && (
          <BackupCodesDisplay codes={backupCodes} onConfirm={handleComplete} />
        )}
      </DialogContent>
    </Dialog>
  );
}
