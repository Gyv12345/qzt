/**
 * 社交媒体账号管理抽屉（添加/编辑）
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { SocialMediaAccount } from "../types/social-media";
import { PLATFORM_CONFIG } from "../types/social-media";

const formSchema = z.object({
  platform: z.enum(["douyin", "xiaohongshu", "wechat"], {
    error: "请选择平台",
  }),
  accountName: z.string().min(1, "请输入账号名称"),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  openId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SocialAccountFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void | Promise<void>;
  editingAccount?: SocialMediaAccount | null;
  loading?: boolean;
}

export function SocialAccountFormDrawer({
  open,
  onClose,
  onSubmit,
  editingAccount,
  loading = false,
}: SocialAccountFormDrawerProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: "douyin",
      accountName: "",
      appId: "",
      appSecret: "",
      accessToken: "",
      refreshToken: "",
      openId: "",
    },
  });

  useEffect(() => {
    if (editingAccount) {
      form.reset({
        platform: editingAccount.platform as any,
        accountName: editingAccount.accountName,
        appId: editingAccount.appId || "",
        appSecret: "",
        accessToken: "",
        refreshToken: "",
        openId: editingAccount.openId || "",
      });
    } else {
      form.reset();
    }
  }, [editingAccount, form, open]);

  const platform = form.watch("platform");
  const platformConfig = PLATFORM_CONFIG[platform];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editingAccount ? "编辑账号" : "添加账号"}</SheetTitle>
          <SheetDescription>
            {editingAccount
              ? "修改社交媒体账号配置信息"
              : "添加新的社交媒体账号，支持抖音、小红书、微信视频号"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          <Alert variant="default" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              敏感信息（App Secret、Access Token）将加密存储。
              {platform === "douyin" && " 抖音开放平台需申请开发者权限。"}
              {platform === "xiaohongshu" && " 小红书开放平台需企业认证。"}
              {platform === "wechat" && " 微信视频号需已认证的服务号。"}
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form
              id="account-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              {/* 平台选择 */}
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>平台</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!editingAccount}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择平台" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PLATFORM_CONFIG).map(
                          ([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: config.color }}
                                />
                                {config.label}
                              </div>
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 账号名称 */}
              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>账号名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入账号昵称/名称" {...field} />
                    </FormControl>
                    <FormDescription>用于识别的账号显示名称</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* App ID */}
              <FormField
                control={form.control}
                name="appId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App ID / 应用ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          platform === "wechat" ? "AppID" : "App ID / Client ID"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* App Secret（仅新建时显示） */}
              {!editingAccount && (
                <FormField
                  control={form.control}
                  name="appSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Secret / 应用密钥</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="应用密钥（将加密存储）"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        从{platformConfig.label}开放平台获取
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Access Token（可选） */}
              {!editingAccount && (
                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token（可选）</FormLabel>
                      <FormControl>
                        <Input placeholder="已有令牌可直接填入" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Open ID（微信专用） */}
              {platform === "wechat" && (
                <FormField
                  control={form.control}
                  name="openId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OpenID</FormLabel>
                      <FormControl>
                        <Input placeholder="微信 OpenID" {...field} />
                      </FormControl>
                      <FormDescription>
                        微信视频号的 OpenID（可选）
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </div>

        <SheetFooter className="px-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button
              form="account-form"
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAccount ? "保存" : "添加"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
