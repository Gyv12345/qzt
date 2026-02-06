import { useState } from "react";
import { Shield, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TotpVerifyInput } from "./totp-verify-input";

interface TotpVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (token: string) => Promise<void>;
  title?: string;
  description?: string;
}

export function TotpVerifyDialog({
  open,
  onOpenChange,
  onVerify,
  title = "敏感操作验证",
  description = "此操作需要双因素认证验证",
}: TotpVerifyDialogProps) {
  const [activeTab, setActiveTab] = useState<"totp" | "backup">("totp");
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleTotpVerify = async (token: string) => {
    setIsLoading(true);
    setError(undefined);

    try {
      await onVerify(token);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "验证码无效，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupVerify = async () => {
    if (!backupCode.trim()) return;

    setIsLoading(true);
    setError(undefined);

    try {
      await onVerify(backupCode.trim().toUpperCase());
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "备份码无效，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "totp" | "backup")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp">验证码</TabsTrigger>
            <TabsTrigger value="backup">备份码</TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4">
            <TotpVerifyInput
              onComplete={handleTotpVerify}
              isLoading={isLoading}
              error={error}
            />
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                输入备份码
              </label>
              <Input
                placeholder="XXXXXXXXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                maxLength={10}
                className="font-mono tracking-wider uppercase"
                disabled={isLoading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                输入您保存的 10 位备份码，每个备份码只能使用一次
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleBackupVerify}
              disabled={backupCode.length !== 10 || isLoading}
            >
              {isLoading ? "验证中..." : "验证"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
