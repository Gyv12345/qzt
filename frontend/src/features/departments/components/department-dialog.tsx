import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import {
  useCreateDepartment,
  useUpdateDepartment,
  useDepartments,
} from "../hooks/use-departments";

const departmentSchema = z.object({
  name: z.string().min(1, "部门名称不能为空"),
  parentId: z.string().optional(),
  sort: z.number().min(0, "排序必须大于等于0"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDepartment?: any;
}

const ROOT_PARENT_ID = "__root__";

export function DepartmentDialog({
  open,
  onOpenChange,
  editingDepartment,
}: DepartmentDialogProps) {
  const { data: departments } = useDepartments();
  const isEdit = !!editingDepartment;

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
            onOpenChange(false);
            form.reset();
          },
        },
      );
    }
  };

  // 将树形结构平铺为选项列表
  const flattenDepartments = (nodes: any[], level = 0): any[] => {
    const result: any[] = [];
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
      });
      if (node.children) {
        result.push(...flattenDepartments(node.children, level + 1));
      }
    });
    return result;
  };

  const departmentOptions = departments ? flattenDepartments(departments) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑部门" : "添加部门"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改部门信息" : "填写部门信息并选择上级部门（可选）"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              render={({ field }) => {
                // 顶级部门（parentId为null）编辑时禁用上级部门选择
                const isTopLevelDepartment =
                  isEdit && !editingDepartment?.parentId;
                return (
                  <FormItem>
                    <FormLabel>上级部门</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(
                          value === ROOT_PARENT_ID ? undefined : value,
                        )
                      }
                      value={field.value || ROOT_PARENT_ID}
                      disabled={isTopLevelDepartment}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择上级部门（可选）" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ROOT_PARENT_ID}>
                          无上级部门
                        </SelectItem>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {"  ".repeat(dept.level) + dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isTopLevelDepartment && (
                      <div className="text-muted-foreground text-xs">
                        顶级部门不能修改上级部门
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
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

            <div className="flex justify-end gap-2">
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
