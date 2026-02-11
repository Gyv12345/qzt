import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCreateWebhookConfig,
  PLATFORM_OPTIONS,
} from "../hooks/use-webhooks";
import type { CreateWebhookConfigDto } from "@/models";

const webhookConfigSchema = z.object({
  name: z.string().min(1, "配置名称不能为空").max(100, "配置名称最多100个字符"),
  platform: z.enum(["wecom", "feishu", "dingtalk"], {
    error: "请选择平台",
  }),
  webhookUrl: z.string().url("请输入有效的 Webhook URL"),
  enabled: z.boolean().default(true),
});

type WebhookConfigFormValues = z.infer<typeof webhookConfigSchema>;

export function WebhookCreateDrawer() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateWebhookConfig();

  const form = useForm<WebhookConfigFormValues>({
    resolver: zodResolver(webhookConfigSchema),
    defaultValues: {
      name: "",
      platform: "wecom",
      webhookUrl: "",
      enabled: true,
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data as unknown as CreateWebhookConfigDto, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          新建配置
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新建 Webhook 配置</DialogTitle>
          <DialogDescription>
            添加新的飞书、企业微信或钉钉 Webhook 配置
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* 配置名称 */}
          <div className="space-y-2">
            <Label htmlFor="create-name">
              配置名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-name"
              placeholder="例如：销售通知群"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* 平台选择 */}
          <div className="space-y-2">
            <Label htmlFor="create-platform">
              平台 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("platform")}
              onValueChange={(value) =>
                form.setValue(
                  "platform",
                  value as "wecom" | "feishu" | "dingtalk",
                )
              }
            >
              <SelectTrigger id="create-platform">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="mr-2">
                      {getPlatformEmoji(option.value)}
                    </span>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.platform && (
              <p className="text-sm text-destructive">
                {form.formState.errors.platform.message}
              </p>
            )}
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="create-webhookUrl">
              Webhook URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-webhookUrl"
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              {...form.register("webhookUrl")}
            />
            {form.formState.errors.webhookUrl && (
              <p className="text-sm text-destructive">
                {form.formState.errors.webhookUrl.message}
              </p>
            )}
          </div>

          {/* 启用开关 */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="create-enabled">启用配置</Label>
              <p className="text-sm text-muted-foreground">
                关闭后将不会发送消息到此 Webhook
              </p>
            </div>
            <Switch
              id="create-enabled"
              checked={form.watch("enabled")}
              onCheckedChange={(checked) => form.setValue("enabled", checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getPlatformEmoji(platform: string): string {
  switch (platform) {
    case "wecom":
      return "💼";
    case "feishu":
      return "🚀";
    case "dingtalk":
      return "🔔";
    default:
      return "📡";
  }
}
