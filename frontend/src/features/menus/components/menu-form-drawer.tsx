import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
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
import { getScrmApi } from "@/services/api";
import { useAllMenus } from "../hooks/use-all-menus";
import type { MenuNode } from "../hooks/use-all-menus";
import type { CreateMenuDto, UpdateMenuDto } from "@/models";

const menuFormSchema = z.object({
  name: z.string().min(1, "菜单名称不能为空"),
  path: z.string().min(1, "路径不能为空"),
  groupTitle: z.string().min(1, "分组标题不能为空"),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  sort: z.number().min(0, "排序必须大于等于0"),
  type: z.enum(["menu", "button", "group"]),
  permissionCode: z.string().optional(),
  enabled: z.boolean(),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

interface MenuFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu?: MenuNode;
  onSuccess: () => void;
}

const typeOptions = [
  { value: "menu", label: "菜单" },
  { value: "button", label: "按钮" },
  { value: "group", label: "分组" },
];

const ROOT_PARENT_VALUE = "__ROOT__";

function collectDescendantIds(node: MenuNode, ids: Set<string>) {
  ids.add(node.id);
  node.children?.forEach((child) => collectDescendantIds(child, ids));
}

function flattenMenuOptions(nodes: MenuNode[], level = 0): MenuNode[] {
  return nodes.flatMap((node) => [
    { ...node, name: `${"  ".repeat(level)}${node.name}` },
    ...(node.children ? flattenMenuOptions(node.children, level + 1) : []),
  ]);
}

export function MenuFormDrawer({
  open,
  onOpenChange,
  menu,
  onSuccess,
}: MenuFormDrawerProps) {
  const isEdit = !!menu;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";
  const queryClient = useQueryClient();

  const { data: menuTree } = useAllMenus();

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: menu
      ? {
          name: menu.name,
          path: menu.path,
          groupTitle: menu.groupTitle || "",
          icon: menu.icon,
          parentId: menu.parentId || undefined,
          sort: menu.sort,
          type: (menu.type as "menu" | "button" | "group" | undefined) || "menu",
          permissionCode: menu.permissionCode,
          enabled: menu.enabled,
        }
      : {
          name: "",
          path: "",
          groupTitle: "",
          icon: undefined,
          parentId: undefined,
          sort: 0,
          type: "menu",
          permissionCode: undefined,
          enabled: true,
        },
  });
  const selectedType = form.watch("type");

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  useEffect(() => {
    if (menu) {
      form.reset({
        name: menu.name,
        path: menu.path,
        groupTitle: menu.groupTitle || "",
        icon: menu.icon,
        parentId: menu.parentId || undefined,
        sort: menu.sort,
        type: (menu.type as "menu" | "button" | "group" | undefined) || "menu",
        permissionCode: menu.permissionCode,
        enabled: menu.enabled,
      });
    } else if (open) {
      form.reset({
        name: "",
        path: "",
        groupTitle: "",
        icon: undefined,
        parentId: undefined,
        sort: 0,
        type: "menu",
        permissionCode: undefined,
        enabled: true,
      });
    }
  }, [menu, open, form]);

  const excludedParentIds = useMemo(() => {
    if (!menu || !menuTree?.length) {
      return new Set<string>();
    }

    const excludedIds = new Set<string>();
    const stack = [...menuTree];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.id === menu.id) {
        collectDescendantIds(current, excludedIds);
        break;
      }
      if (current.children?.length) {
        stack.push(...current.children);
      }
    }
    return excludedIds;
  }, [menu, menuTree]);

  const parentOptions = useMemo(() => {
    const flattened = flattenMenuOptions(menuTree || []);
    return flattened.filter(
      (item) => item.type !== "button" && !excludedParentIds.has(item.id),
    );
  }, [menuTree, excludedParentIds]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateMenuDto) =>
      (getScrmApi() as any).menuControllerCreateMenu(payload),
    onSuccess: async () => {
      toast.success("菜单创建成功");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["menus-all"] }),
        queryClient.invalidateQueries({ queryKey: ["menu-tree"] }),
        queryClient.invalidateQueries({ queryKey: ["user-menus"] }),
      ]);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "菜单创建失败");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateMenuDto }) =>
      (getScrmApi() as any).menuControllerUpdateMenu(id, payload),
    onSuccess: async () => {
      toast.success("菜单更新成功");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["menus-all"] }),
        queryClient.invalidateQueries({ queryKey: ["menu-tree"] }),
        queryClient.invalidateQueries({ queryKey: ["user-menus"] }),
      ]);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "菜单更新失败");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: MenuFormValues) => {
    const payload = {
      name: values.name.trim(),
      path: values.path.trim(),
      groupTitle: values.groupTitle.trim(),
      icon: values.icon?.trim() || undefined,
      parentId: values.parentId || undefined,
      sort: values.sort,
      type: values.type,
      permissionCode: values.permissionCode?.trim() || undefined,
      enabled: values.enabled,
    };

    if (isEdit && menu) {
      await updateMutation.mutateAsync({
        id: menu.id,
        payload,
      });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[500px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑菜单" : "新建菜单"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改菜单信息" : "填写菜单基本信息"}
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
                  <FormLabel>菜单名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入菜单名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>路由路径 *</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入路由路径" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分组标题 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：系统设置" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图标</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入图标名称（lucide-react）"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>父菜单</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(
                          value === ROOT_PARENT_VALUE ? undefined : value,
                        );
                      }}
                      value={field.value || ROOT_PARENT_VALUE}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择父菜单" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ROOT_PARENT_VALUE}>无上级菜单</SelectItem>
                        {parentOptions.map((parentOption: MenuNode) => (
                          <SelectItem
                            key={parentOption.id}
                            value={parentOption.id}
                          >
                            {parentOption.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
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
                    <FormLabel>类型</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "menu"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {typeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="permissionCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>权限代码</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedType === "button"
                          ? "例如：users:view"
                          : "按钮类型可填写权限代码"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>启用状态</FormLabel>
                    <div className="text-muted-foreground text-sm">
                      是否在系统中显示此菜单
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {isSubmitting ? "提交中..." : isEdit ? "保存" : "创建"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
