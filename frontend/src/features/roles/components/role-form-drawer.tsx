import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { useCreateRole, useUpdateRole } from "../hooks/use-roles";
import { roleFormSchema, type RoleFormValues } from "../data/schema";
import type { Role } from "../data/schema";

interface RoleFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
  onSuccess: () => void;
}

const typeOptions = [
  { value: "system", label: "系统角色" },
  { value: "team", label: "团队角色" },
];

const dataScopeOptions = [
  { value: "all", label: "全部数据" },
  { value: "department", label: "本部门数据" },
  { value: "department_and_sub", label: "本部门及下级部门数据" },
  { value: "custom", label: "自定义部门" },
  { value: "self", label: "仅本人数据" },
];

export function RoleFormDrawer({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormDrawerProps) {
  const isEdit = !!role;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const form = useForm<RoleFormValues>({
    // @ts-ignore - Zod version compatibility issue (project-wide, not specific to this file)
    resolver: zodResolver(roleFormSchema),
    defaultValues: role
      ? {
          name: role.name,
          code: role.code,
          description: role.description || "",
          type: role.type as "system" | "team" | undefined,
          dataScope: role.dataScope as
            | "all"
            | "department"
            | "department_and_sub"
            | "custom"
            | "self"
            | undefined,
          dataScopeDeptIds: role.dataScopeDeptIds || "",
          permissionIds: [],
        }
      : {
          name: "",
          code: "",
          description: "",
          type: "system",
          dataScope: "all",
          dataScopeDeptIds: "",
          permissionIds: [],
        },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const onSubmit = async (values: RoleFormValues) => {
    try {
      const cleanedValues = {
        ...values,
        description: values.description || undefined,
        type: values.type || "system",
        dataScope: values.dataScope || "all",
      };

      if (isEdit && role) {
        await updateMutation.mutateAsync({
          id: role.id,
          data: cleanedValues as any,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[500px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑角色" : "新建角色"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改角色信息" : "填写角色基本信息"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入角色名称" {...field} />
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
                  <FormLabel>角色编码 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入角色编码（英文）" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色类型</FormLabel>
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
                name="dataScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数据范围</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择范围" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dataScopeOptions.map((option) => (
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
            </div>

            {/* TODO(human): 权限选择功能 */}
            {/* 当实现权限选择时，添加权限多选组件 */}
            {/* 参考：需要调用权限列表API，实现树形选择或复选框 */}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入角色描述"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "提交中..."
                  : isEdit
                    ? "保存"
                    : "创建"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
