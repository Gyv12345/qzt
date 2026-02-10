import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface BackupCodesDisplayProps {
  codes: string[];
  onConfirm: () => void;
}

export function BackupCodesDisplay({
  codes,
  onConfirm,
}: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyAllCodes = async () => {
    const text = codes.join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("备份码已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-base">
            <AlertTriangle className="h-5 w-5" />
            重要提示
          </CardTitle>
          <CardDescription className="text-amber-700 dark:text-amber-300">
            这些备份码只会显示一次，请立即保存到安全的地方。如果您丢失了身份验证器应用，可以使用备份码登录。
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {codes.map((code, index) => (
          <div
            key={index}
            className="flex items-center justify-center p-3 bg-muted rounded-md font-mono text-sm tracking-wider"
          >
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={copyAllCodes}
          disabled={copied}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              复制所有备份码
            </>
          )}
        </Button>
        <Button className="flex-1" onClick={onConfirm}>
          我已保存备份码
        </Button>
      </div>
    </div>
  );
}
