import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { Lock, Loader2, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/password-input";
import { useChangePassword } from "../hooks/use-change-password";
import { TotpVerifyInput } from "@/features/two-factor/components/totp-verify-input";
import { cn } from "@/lib/utils";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z
      .string()
      .min(6, "新密码至少 6 个字符")
      .regex(/[A-Z]/, "新密码必须包含至少一个大写字母")
      .regex(/[a-z]/, "新密码必须包含至少一个小写字母")
      .regex(/[0-9]/, "新密码必须包含至少一个数字"),
    confirmPassword: z.string().min(1, "请确认新密码"),
    twoFactorToken: z.string().optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  allowClose?: boolean;
  twoFactorEnabled?: boolean;
}

export function PasswordChangeDialog({
  open,
  onOpenChange,
  onSuccess,
  allowClose = true,
  twoFactorEnabled = false,
}: PasswordChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string>();
  const { changePassword } = useChangePassword();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      twoFactorToken: "",
    },
  });

  // 重置表单当对话框打开时
  useEffect(() => {
    if (open) {
      form.reset();
      setVerifyError(undefined);
    }
  }, [open, form]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setVerifyError(undefined);

    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        twoFactorToken: twoFactorEnabled ? data.twoFactorToken : undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      // 检查是否是 2FA 验证失败
      if (
        error.response?.data?.message?.includes("验证码") ||
        error.response?.data?.message?.includes("2FA")
      ) {
        setVerifyError(error.response.data.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={allowClose ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            修改密码
          </DialogTitle>
          <DialogDescription>
            {twoFactorEnabled
              ? "请输入当前密码、新密码和双因素认证验证码"
              : "请输入当前密码和新密码"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FieldGroup>
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel>当前密码</FieldLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="输入当前密码"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel>新密码</FieldLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="输入新密码（至少6个字符）"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel>确认新密码</FieldLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="再次输入新密码"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {twoFactorEnabled && (
                <div className="space-y-2">
                  <FieldLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    双因素认证验证码
                  </FieldLabel>
                  <FormField
                    control={form.control}
                    name="twoFactorToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <TotpVerifyInput
                            onComplete={(token) => {
                              field.onChange(token);
                            }}
                            isLoading={isLoading}
                            error={verifyError}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </FieldGroup>

            <div className="flex gap-3">
              {allowClose && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  取消
                </Button>
              )}
              <Button
                type="submit"
                className={cn("flex-1", !allowClose && "w-full")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    修改中...
                  </>
                ) : (
                  "确认修改"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
