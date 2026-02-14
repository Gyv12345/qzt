import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Shield,
  Database,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getScrmApi } from "@/services/api";
import { roleFormSchema, type RoleFormValues } from "../data/schema";

interface MenuNode {
  id: string;
  path: string;
  name: string;
  icon?: string;
  parentId: string | null;
  type: string; // "menu" | "button"
  permissionCode?: string;
  enabled: boolean;
  sort: number;
  children?: MenuNode[];
}

// 将菜单列表转换为树形结构
function buildMenuTree(
  menus: MenuNode[],
  parentId: string | null = null,
): MenuNode[] {
  return menus
    .filter((menu) => menu.parentId === parentId)
    .map((menu) => ({
      ...menu,
      children: buildMenuTree(menus, menu.id),
    }));
}

// 收集节点下所有菜单 ID（包括子菜单和按钮权限）
function collectNodeMenuIds(node: MenuNode): string[] {
  const ids: string[] = [];

  // 添加当前节点（菜单或按钮权限）
  ids.push(node.id);

  // 递归收集子节点
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      ids.push(...collectNodeMenuIds(child));
    });
  }

  return ids;
}

interface MenuTreeNodeItemProps {
  node: MenuNode;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleNode: (nodeId: string, checked: boolean, childIds: string[]) => void;
  level?: number;
}

function MenuTreeNodeItem({
  node,
  selectedIds,
  onToggle,
  onToggleNode,
  level = 0,
}: MenuTreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(level < 2);

  const childNodeIds = useMemo(() => collectNodeMenuIds(node), [node]);

  // 计算所有子节点是否都被选中
  const allChildrenSelected =
    childNodeIds.length > 0 && childNodeIds.every((id) => selectedIds.has(id));
  const someChildrenSelected = childNodeIds.some((id) => selectedIds.has(id));

  const hasChildren = node.children && node.children.length > 0;

  // 按钮权限显示不同样式
  const isButton = node.type === "button";

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-accent/50 transition-colors ${
          isButton ? "ml-6" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren && !isButton ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <Checkbox
          checked={selectedIds.has(node.id)}
          onCheckedChange={(checked) => onToggle(node.id, !!checked)}
          className={
            allChildrenSelected || someChildrenSelected
              ? "data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/50"
              : ""
          }
        />

        <span
          className={`flex-1 text-sm ${isButton ? "text-muted-foreground" : "font-medium"}`}
        >
          {node.name}
        </span>

        {node.permissionCode && (
          <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-muted rounded">
            {node.permissionCode}
          </span>
        )}

        {node.type === "button" && (
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded">
            按钮
          </span>
        )}
      </div>

      {isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <MenuTreeNodeItem
              key={child.id}
              node={child}
              selectedIds={selectedIds}
              onToggle={onToggle}
              onToggleNode={onToggleNode}
              level={isButton ? level : level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const dataScopeOptions = [
  { value: "all", label: "全部数据", description: "可查看所有数据" },
  {
    value: "department",
    label: "本部门数据",
    description: "仅可查看本部门数据",
  },
  {
    value: "department_and_sub",
    label: "本部门及下级部门",
    description: "可查看本部门及下级部门数据",
  },
  { value: "custom", label: "自定义部门", description: "可选择特定部门" },
  { value: "self", label: "仅本人数据", description: "仅可查看自己的数据" },
];

interface RolePermissionsContentProps {
  roleId: string;
}

export function RolePermissionsContent({
  roleId,
}: RolePermissionsContentProps) {
  const queryClient = useQueryClient();

  // 获取所有菜单
  const { data: allMenus, isLoading: menusLoading } = useQuery({
    queryKey: ["menus-tree"],
    queryFn: async () => {
      const api = getScrmApi();
      return (await api.permissionControllerGetRoleMenus(roleId)) as any;
    },
  });

  // 获取角色详情
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["roles", roleId],
    queryFn: async () => {
      const api = getScrmApi();
      const roles = (await api.permissionControllerFindAllRoles()) as any;
      return roles?.find((r: any) => r.id === roleId);
    },
    enabled: !!roleId,
  });

  // 获取角色的菜单列表
  const { data: roleMenus } = useQuery({
    queryKey: ["roles", roleId, "menus"],
    queryFn: async () => {
      const api = getScrmApi();
      return (await api.permissionControllerGetRoleMenus(roleId)) as any;
    },
    enabled: !!roleId,
  });

  // 表单
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      dataScope: "all",
      dataScopeDeptIds: "",
      menuIds: [],
    },
  });

  // 当角色数据加载完成后填充表单
  useEffect(() => {
    if (roleData) {
      form.reset({
        name: roleData.name || "",
        code: roleData.code || "",
        description: roleData.description || "",
        dataScope: roleData.dataScope || "all",
        dataScopeDeptIds: roleData.dataScopeDeptIds || "",
        menuIds: roleMenus?.map((m: any) => m.id) || [],
      });
    }
  }, [roleData, roleMenus, form]);

  const selectedIds = useMemo(() => {
    const menuIds = form.watch("menuIds");
    return new Set(menuIds || []);
  }, [form]);

  // 更新角色菜单
  const updateMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const api = getScrmApi();
      // API 类型暂时不完整（后端未运行），使用 as any 绕过
      return await (api as any).permissionControllerAssignMenusToRole(roleId, {
        menuIds: values.menuIds || [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", roleId] });
      queryClient.invalidateQueries({ queryKey: ["roles", roleId, "menus"] });
      toast.success("权限配置保存成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "保存失败");
    },
  });

  const onSubmit = async (values: RoleFormValues) => {
    await updateMutation.mutateAsync(values);
  };

  const handleSave = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleToggle = (id: string, checked: boolean) => {
    const currentIds = form.getValues("menuIds") || [];
    const newIds = checked
      ? [...currentIds, id]
      : currentIds.filter((v) => v !== id);
    form.setValue("menuIds", newIds);
  };

  const handleToggleNode = (
    _nodeId: string,
    checked: boolean,
    childIds: string[],
  ) => {
    const currentIds = form.getValues("menuIds") || [];
    const otherIds = currentIds.filter((v) => !childIds.includes(v));
    const newIds = checked ? [...otherIds, ...childIds] : otherIds;
    form.setValue("menuIds", newIds);
  };

  // 构建菜单树
  const menuTree = useMemo(() => {
    if (!allMenus) return [];
    return buildMenuTree(allMenus as MenuNode[]);
  }, [allMenus]);

  if (menusLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载中...</span>
      </div>
    );
  }

  const dataScope = form.watch("dataScope");

  return (
    <div className="space-y-6">
      {/* 角色基本信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">角色信息</CardTitle>
          <CardDescription>
            {form.watch("name")} ({form.watch("code")})
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {form.watch("description") || "暂无描述"}
        </CardContent>
      </Card>

      {/* 菜单权限配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">菜单权限</CardTitle>
          </div>
          <CardDescription>配置角色可访问的菜单和功能权限</CardDescription>
        </CardHeader>
        <CardContent>
          {menuTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无可配置的菜单
            </div>
          ) : (
            <div className="space-y-2">
              {menuTree.map((node) => (
                <div key={node.id}>
                  <MenuTreeNodeItem
                    node={node}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                    onToggleNode={handleToggleNode}
                    level={0}
                  />
                  <Separator className="my-2 ml-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据权限配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">数据权限</CardTitle>
          </div>
          <CardDescription>配置角色可访问的数据范围</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 max-w-2xl">
            {dataScopeOptions.map((option) => (
              <label
                key={option.value}
                className={`
                  flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all
                  ${
                    dataScope === option.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-accent/50"
                  }
                `}
              >
                <Checkbox
                  checked={dataScope === option.value}
                  onCheckedChange={() =>
                    form.setValue("dataScope", option.value as any)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* TODO(human): 添加部门树选择器组件
             当 dataScope 为 "custom" 时，显示部门树选择器
             需要创建 DepartmentTreeSelect 组件
          */}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background py-4 border-t">
        <Button variant="outline" onClick={() => window.history.back()}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
