import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import { useUsers } from "@/features/users/hooks/use-users";
import {
  useCreateServiceTeam,
  useUpdateServiceTeam,
} from "../hooks/use-service-teams";

// 角色枚举
const ROLE_CODES = [
  { value: "SALE", label: "销售" },
  { value: "FINANCE", label: "财务" },
  { value: "OUTWORK", label: "外勤" },
] as const;

// 表单验证 schema
const serviceTeamFormSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  userId: z.string().min(1, "请选择用户"),
  roleCode: z.enum(["SALE", "FINANCE", "OUTWORK"], {
    error: "请选择角色",
  }),
});

type ServiceTeamFormValues = z.infer<typeof serviceTeamFormSchema>;

interface ServiceTeamFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord?: {
    id: string;
    customerId: string;
    userId: string;
    roleCode: string;
  } | null;
  customerId?: string; // 预选客户ID（从客户详情传入）
  onSuccess: () => void;
}

export function ServiceTeamFormDrawer({
  open,
  onOpenChange,
  editingRecord,
  customerId: propCustomerId,
  onSuccess,
}: ServiceTeamFormDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm<ServiceTeamFormValues>({
    resolver: zodResolver(serviceTeamFormSchema),
    defaultValues: {
      customerId: propCustomerId || "",
      userId: "",
      roleCode: "SALE",
    },
  });

  const createMutation = useCreateServiceTeam();
  const updateMutation = useUpdateServiceTeam();

  // 获取客户列表（用于选择）
  const { data: customersData } = useCustomers({
    page: 1,
    pageSize: 100,
  });

  // 获取用户列表（用于选择）
  const { data: usersData } = useUsers({
    page: 1,
    pageSize: 100,
  });

  // 当编辑记录变化时，更新表单
  useEffect(() => {
    if (editingRecord) {
      form.reset({
        customerId: editingRecord.customerId,
        userId: editingRecord.userId,
        roleCode: editingRecord.roleCode as "SALE" | "FINANCE" | "OUTWORK",
      });
    } else {
      form.reset({
        customerId: propCustomerId || "",
        userId: "",
        roleCode: "SALE",
      });
    }
  }, [editingRecord, propCustomerId, form]);

  const customers = customersData?.data || [];
  const users = usersData?.data || [];

  const onSubmit = async (values: ServiceTeamFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await updateMutation.mutateAsync({
          id: editingRecord.id,
          data: values,
        });
      } else {
        await createMutation.mutateAsync(values);
      }
      onSuccess();
      onOpenChange(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[500px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>
            {editingRecord ? "编辑服务团队成员" : "添加服务团队成员"}
          </SheetTitle>
          <SheetDescription>
            {editingRecord
              ? "修改服务团队成员的角色或关联关系"
              : "为客户分配服务团队成员"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6"
          >
            {/* 客户选择 */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>客户</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!propCustomerId || !!editingRecord}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择客户" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 用户选择 */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>服务人员</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择服务人员" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username}{" "}
                          {user.realName ? `(${user.realName})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 角色选择 */}
            <FormField
              control={form.control}
              name="roleCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择角色" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_CODES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingRecord ? "保存" : "添加"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
