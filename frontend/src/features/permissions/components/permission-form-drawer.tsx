"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useCreatePermission, useUpdatePermission } from "../hooks/use-permissions";
import { permissionFormSchema, type PermissionFormValues, type Permission } from "../data/schema";

interface PermissionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission?: Permission;
  onSuccess: () => void;
}

const typeOptions = [
  { value: "menu", label: "菜单权限" },
  { value: "button", label: "操作按钮" },
  { value: "data", label: "数据权限" },
];

export function PermissionFormDrawer({
  open,
  onOpenChange,
  permission,
  onSuccess,
}: PermissionFormDrawerProps) {
  const isEdit = !!permission;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: permission
      ? {
          name: permission.name,
          code: permission.code,
          type: permission.type,
          description: permission.description || "",
          status: permission.status,
        }
      : {
          name: "",
          code: "",
          type: "button",
          description: "",
          status: 1,
        },
  });

  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();

  const onSubmit = async (values: PermissionFormValues) => {
    try {
      const cleanedValues = {
        ...values,
        description: values.description || undefined,
      };

      if (isEdit && permission) {
        await updateMutation.mutateAsync({
          id: permission.id,
          data: cleanedValues,
        });
      } else {
        await createMutation.mutateAsync(cleanedValues as any);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("提交失败:", error);
    }
  };

  useEffect(() => {
    if (!open) {
      form.reset();
    } else if (permission) {
      form.reset({
        name: permission.name,
        code: permission.code,
        type: permission.type,
        description: permission.description || "",
        status: permission.status,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        type: "button",
        description: "",
        status: 1,
      });
    }
  }, [open, permission, form]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[500px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑权限" : "新建权限"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改权限信息" : "填写权限基本信息"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="permission-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6 overflow-y-auto max-h-[calc(100vh-180px)]"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>权限名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入权限名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>权限编码 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: user.create" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>权限类型</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入权限描述"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>启用状态</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 1}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? 1 : 0)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <SheetFooter className="px-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="submit"
            form="permission-form"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "提交中..."
              : isEdit
                ? "保存"
                : "创建"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
