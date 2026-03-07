import { useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";
import { DepartmentTreeSelect } from "@/components/ui/department-tree-select";
import {
  useCreateDepartment,
  useUpdateDepartment,
  useDepartments,
} from "../hooks/use-departments";
import type { DepartmentNode } from "../hooks/use-departments";

const departmentSchema = z.object({
  name: z.string().min(1, "部门名称不能为空"),
  parentId: z.string().optional(),
  sort: z.number().min(0, "排序必须大于等于0"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDepartment?: DepartmentNode;
  onSuccess: () => void;
}

const ROOT_PARENT_ID = "__root__";

export function DepartmentFormDrawer({
  open,
  onOpenChange,
  editingDepartment,
  onSuccess,
}: DepartmentFormDrawerProps) {
  const isEdit = !!editingDepartment;
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  const { data: departments } = useDepartments();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      parentId: undefined,
      sort: 0,
      status: "ACTIVE",
    },
  });

  const { mutate: createDepartment, isPending: isCreating } =
    useCreateDepartment();
  const { mutate: updateDepartment, isPending: isUpdating } =
    useUpdateDepartment();

  const isPending = isCreating || isUpdating;

  // 当编辑的部门改变时，更新表单值
  useEffect(() => {
    if (editingDepartment) {
      form.reset({
        name: editingDepartment.name,
        parentId: editingDepartment.parentId || undefined,
        sort: editingDepartment.sort,
        status: editingDepartment.status || "ACTIVE",
      });
    } else {
      form.reset({
        name: "",
        parentId: undefined,
        sort: 0,
        status: "ACTIVE",
      });
    }
  }, [editingDepartment, form]);

  const onSubmit = (data: DepartmentFormValues) => {
    // 如果选择的是根节点，将 parentId 设为 undefined
    const parentId =
      data.parentId === ROOT_PARENT_ID ? undefined : data.parentId;

    if (isEdit && editingDepartment) {
      updateDepartment(
        { id: editingDepartment.id, data: { ...data, parentId } },
        {
          onSuccess: () => {
            onSuccess();
            onOpenChange(false);
            form.reset();
          },
        },
      );
    } else {
      createDepartment(
        { ...data, parentId },
        {
          onSuccess: () => {
            onSuccess();
            onOpenChange(false);
            form.reset();
          },
        },
      );
    }
  };

  // 将树形结构平铺为选项列表
  const flattenDepartments = (
    nodes: DepartmentNode[],
    level = 0,
  ): DepartmentNode[] => {
    const result: DepartmentNode[] = [];
    nodes.forEach((node) => {
      // 编辑时排除自己和自己的子部门作为上级部门
      if (isEdit && node.id === editingDepartment?.id) {
        // 跳过自己
        if (node.children) {
          result.push(...flattenDepartments(node.children, level));
        }
        return;
      }
      result.push({
        ...node,
        level,
      } as DepartmentNode);
      if (node.children) {
        result.push(...flattenDepartments(node.children, level + 1));
      }
    });
    return result;
  };

  // 顶级部门（parentId为null）编辑时禁用上级部门选择
  const isTopLevelDepartment = isEdit && !editingDepartment?.parentId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[500px]"}
      >
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>{isEdit ? "编辑部门" : "添加部门"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "修改部门信息" : "填写部门信息并选择上级部门（可选）"}
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
                  <FormLabel>部门名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入部门名称" {...field} />
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
                  <FormLabel>上级部门</FormLabel>
                  <FormControl>
                    <DepartmentTreeSelect
                      value={field.value}
                      onChange={field.onChange}
                      departments={departments || []}
                      placeholder="请选择上级部门（可选）"
                      disabled={isTopLevelDepartment}
                      excludeId={editingDepartment?.id}
                    />
                  </FormControl>
                  {isTopLevelDepartment && (
                    <div className="text-muted-foreground text-xs">
                      顶级部门不能修改上级部门
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>排序</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="请输入排序号"
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
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>启用状态</FormLabel>
                    <div className="text-muted-foreground text-sm">
                      是否启用该部门
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === "ACTIVE"}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? "ACTIVE" : "INACTIVE")
                      }
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
                disabled={isPending}
              >
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "提交中..." : "确定"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
