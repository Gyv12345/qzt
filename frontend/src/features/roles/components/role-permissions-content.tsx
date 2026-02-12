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
import {
  useMenuTree,
  type MenuNode,
} from "@/features/menus/hooks/use-menu-tree";
import { roleFormSchema, type RoleFormValues } from "../data/schema";

interface PermissionGroup {
  id: string;
  name: string;
  permissions: PermissionTreeNode[];
}

interface PermissionTreeNode {
  id: string;
  name: string;
  type: "menu" | "permission";
  code?: string;
  permissionType?: string;
  parentId?: string | null;
  permissions?: PermissionTreeNode[];
  children?: PermissionTreeNode[];
  level?: number;
}

// 将菜单树转换为权限树
function convertToPermissionTree(menus: MenuNode[]): PermissionTreeNode[] {
  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    type: "menu" as const,
    permissions: menu.permissions?.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: "permission" as const,
      permissionType: p.type,
      parentId: menu.id,
    })),
    children: menu.children ? convertToPermissionTree(menu.children) : [],
  }));
}

// 收集节点下所有权限 ID
function collectNodePermissionIds(node: PermissionTreeNode): string[] {
  const ids: string[] = [];

  if (node.permissions) {
    node.permissions.forEach((p) => ids.push(p.id));
  }

  if (node.children) {
    node.children.forEach((child) => {
      ids.push(...collectNodePermissionIds(child));
    });
  }

  return ids;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// 按分组归类权限树节点（备用函数，暂未使用）
function _groupPermissionsByCategory(
  nodes: PermissionTreeNode[],
): PermissionGroup[] {
  // 这里可以根据业务需求进行分组，例如：业务、内容、系统等
  // 暂时使用顶层菜单作为分组
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    permissions: node.children?.length ? [node, ...node.children] : [node],
  }));
}

interface PermissionTreeNodeItemProps {
  node: PermissionTreeNode;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleMenu: (menuId: string, checked: boolean, childIds: string[]) => void;
  level?: number;
}

function PermissionTreeNodeItem({
  node,
  selectedIds,
  onToggle,
  onToggleMenu,
  level = 0,
}: PermissionTreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(level < 2);

  const childNodeIds = useMemo(() => collectNodePermissionIds(node), [node]);

  const allChildrenSelected =
    childNodeIds.length > 0 && childNodeIds.every((id) => selectedIds.has(id));
  const someChildrenSelected = childNodeIds.some((id) => selectedIds.has(id));

  const handleToggle = (checked: boolean) => {
    onToggleMenu(node.id, checked, childNodeIds);
  };

  const hasChildren =
    (node.children?.length || 0) > 0 || (node.permissions?.length || 0) > 0;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-accent/50 transition-colors"
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren ? (
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
          checked={allChildrenSelected}
          onCheckedChange={handleToggle}
          className={
            allChildrenSelected || someChildrenSelected
              ? "data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary/50"
              : ""
          }
        />

        <span className="flex-1 font-medium text-sm">{node.name}</span>

        {node.permissionType && (
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {node.permissionType}
          </span>
        )}
      </div>

      {isOpen && (
        <>
          {/* 直接权限 */}
          {node.permissions && node.permissions.length > 0 && (
            <div className="space-y-0.5">
              {node.permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center gap-2 py-1.5 px-3 hover:bg-accent/30 rounded-md transition-colors"
                  style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
                >
                  <span className="w-4" />
                  <Checkbox
                    checked={selectedIds.has(permission.id)}
                    onCheckedChange={(checked) =>
                      onToggle(permission.id, !!checked)
                    }
                  />
                  <span className="flex-1 text-sm">{permission.name}</span>
                  {permission.code && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {permission.code}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 子菜单 */}
          {node.children &&
            node.children.map((child) => (
              <PermissionTreeNodeItem
                key={child.id}
                node={child}
                selectedIds={selectedIds}
                onToggle={onToggle}
                onToggleMenu={onToggleMenu}
                level={level + 1}
              />
            ))}
        </>
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

  // 获取菜单树
  const { data: menuTree, isLoading: menuTreeLoading } = useMenuTree();

  // 获取角色详情
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ["roles", roleId],
    queryFn: async () => {
      const api = getScrmApi();
      // TODO: 待后端提供单个角色查询 API
      const roles = (await api.permissionControllerFindAllRoles()) as any;
      return roles?.find((r: any) => r.id === roleId);
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
      permissionIds: [],
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
        permissionIds: roleData.permissionIds || [],
      });
    }
  }, [roleData, form]);

  const selectedIds = useMemo(() => {
    const permissionIds = form.watch("permissionIds");
    return new Set(permissionIds || []);
  }, [form]);

  // 更新角色权限
  const updateMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const api = getScrmApi();
      return await api.permissionControllerUpdateRole(roleId, values as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", roleId] });
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
    const currentIds = form.getValues("permissionIds") || [];
    const newIds = checked
      ? [...currentIds, id]
      : currentIds.filter((v) => v !== id);
    form.setValue("permissionIds", newIds);
  };

  const handleToggleMenu = (
    _menuId: string,
    checked: boolean,
    childIds: string[],
  ) => {
    const currentIds = form.getValues("permissionIds") || [];
    const otherIds = currentIds.filter((v) => !childIds.includes(v));
    const newIds = checked ? [...otherIds, ...childIds] : otherIds;
    form.setValue("permissionIds", newIds);
  };

  const permissionTree = useMemo(() => {
    if (!menuTree) return [];
    return convertToPermissionTree(menuTree);
  }, [menuTree]);

  if (menuTreeLoading || roleLoading) {
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
          {permissionTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无可配置的权限
            </div>
          ) : (
            <div className="space-y-4">
              {permissionTree.map((node) => (
                <div key={node.id}>
                  <PermissionTreeNodeItem
                    node={node}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                    onToggleMenu={handleToggleMenu}
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
