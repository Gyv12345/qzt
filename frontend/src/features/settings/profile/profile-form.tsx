import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { useAuth } from "@/contexts/auth-context";
import { getScrmApi } from "@/services/api";
import { getUserId } from "@/lib/auth-storage";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const profileFormSchema = z.object({
  username: z.string().min(1, "用户名不能为空").max(50, "用户名最多50个字符"),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名最多50个字符"),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  phone: z.string().max(20, "手机号最多20个字符").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  console.log("ProfileForm render, user:", user);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      phone: "",
    },
    mode: "onChange",
  });

  // 当用户信息加载后填充表单
  useEffect(() => {
    console.log("ProfileForm useEffect, user:", user);
    if (user) {
      form.reset({
        username: user.username || "",
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    console.log("ProfileForm onSubmit called:", data);
    const userId = getUserId(user);
    if (!userId) {
      console.log("No user id");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Calling API...");
      const { usersControllerUpdate } = getScrmApi();
      await usersControllerUpdate(userId, {
        username: data.username,
        name: data.name,
        // 空字符串传递 null 以清空字段
        email: data.email === "" ? null : data.email || undefined,
        phone: data.phone === "" ? null : data.phone || undefined,
      });
      console.log("API call success");

      // 刷新用户信息
      await refreshUser();
      toast.success("个人资料更新成功");
    } catch (error: any) {
      console.error("更新个人资料失败:", error);
      const message =
        error.response?.data?.message || error.message || "更新失败";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (errors: any) => {
    console.log("Form validation errors:", errors);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, handleError)}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>姓名</FormLabel>
              <FormControl>
                <Input placeholder="请输入姓名" {...field} />
              </FormControl>
              <FormDescription>
                这是将显示在您的个人资料和邮件中的姓名
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="请输入用户名" {...field} />
              </FormControl>
              <FormDescription>用户名用于登录系统</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input type="email" placeholder="请输入邮箱" {...field} />
              </FormControl>
              <FormDescription>用于接收通知和重要信息</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>手机号</FormLabel>
              <FormControl>
                <Input placeholder="请输入手机号" {...field} />
              </FormControl>
              <FormDescription>用于接收短信通知</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存更改
        </Button>
      </form>
    </Form>
  );
}
