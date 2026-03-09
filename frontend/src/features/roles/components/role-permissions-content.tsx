import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { ChevronDown, ChevronRight, Database, Loader2, Save, Shield } from "lucide-react";
import { zodResolver } from "@/lib/zod-resolver";
import { toast } from "sonner";
import { useDepartments } from "@/features/departments/hooks/use-departments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { getScrmApi } from "@/services/api";
import { roleFormSchema, type RoleFormValues } from "../data/schema";

interface MenuNode {
  id: string;
  path: string;
  name: string;
  icon?: string;
  parentId: string | null;
  type: string;
  permissionCode?: string;
  enabled: boolean;
  sort: number;
  children?: MenuNode[];
}

interface DepartmentNode {
  id: string;
  name: string;
  children?: DepartmentNode[];
}

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

function normalizeMenuTree(menus: MenuNode[]): MenuNode[] {
  if (menus.length === 0) {
    return [];
  }
  const hasNestedChildren = menus.some(
    (menu) => Array.isArray(menu.children) && menu.children.length > 0,
  );
  return hasNestedChildren ? menus : buildMenuTree(menus);
}

function collectNodeMenuIds(node: MenuNode): string[] {
  const ids: string[] = [node.id];
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      ids.push(...collectNodeMenuIds(child));
    });
  }
  return ids;
}

function collectNodeDepartmentIds(node: DepartmentNode): string[] {
  const ids: string[] = [node.id];
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      ids.push(...collectNodeDepartmentIds(child));
    });
  }
  return ids;
}

function parseDepartmentIds(rawValue?: string | null): string[] {
  if (!rawValue) {
    return [];
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  } catch {
    return trimmed
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [];
}

function stringifyDepartmentIds(ids: string[]): string {
  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds.length > 0 ? JSON.stringify(uniqueIds) : "";
}

interface MenuTreeNodeItemProps {
  node: MenuNode;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleNode: (childIds: string[], checked: boolean) => void;
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

  const hasChildren = !!node.children && node.children.length > 0;
  const isButton = node.type === "button";
  const allChildrenSelected =
    childNodeIds.length > 0 && childNodeIds.every((id) => selectedIds.has(id));
  const someChildrenSelected =
    !allChildrenSelected && childNodeIds.some((id) => selectedIds.has(id));
  const checkedState = allChildrenSelected
    ? true
    : someChildrenSelected
      ? "indeterminate"
      : false;

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    const nextChecked = checked === true;
    if (hasChildren && !isButton) {
      onToggleNode(childNodeIds, nextChecked);
      return;
    }
    onToggle(node.id, nextChecked);
  };

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-accent/50 ${
          isButton ? "ml-6" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren && !isButton ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-muted"
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

        <Checkbox checked={checkedState} onCheckedChange={handleCheckboxChange} />

        <span
          className={`flex-1 text-sm ${isButton ? "text-muted-foreground" : "font-medium"}`}
        >
          {node.name}
        </span>

        {node.permissionCode && (
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {node.permissionCode}
          </span>
        )}

        {isButton && (
          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
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

interface DepartmentTreeNodeItemProps {
  node: DepartmentNode;
  selectedIds: Set<string>;
  onToggleNode: (childIds: string[], checked: boolean) => void;
  level?: number;
}

function DepartmentTreeNodeItem({
  node,
  selectedIds,
  onToggleNode,
  level = 0,
}: DepartmentTreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(level < 1);
  const nodeIds = useMemo(() => collectNodeDepartmentIds(node), [node]);
  const hasChildren = !!node.children && node.children.length > 0;
  const allSelected =
    nodeIds.length > 0 && nodeIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && nodeIds.some((id) => selectedIds.has(id));
  const checkedState = allSelected ? true : someSelected ? "indeterminate" : false;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-muted"
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
          checked={checkedState}
          onCheckedChange={(checked) => onToggleNode(nodeIds, checked === true)}
        />
        <span className="flex-1 text-sm">{node.name}</span>
      </div>

      {isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <DepartmentTreeNodeItem
              key={child.id}
              node={child}
              selectedIds={selectedIds}
              onToggleNode={onToggleNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type DataScopeValue = NonNullable<RoleFormValues["dataScope"]>;

const dataScopeOptions: Array<{
  value: DataScopeValue;
  label: string;
  description: string;
}> = [
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

interface RoleDetail {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  dataScope?: DataScopeValue;
  dataScopeDeptIds?: string | null;
}

interface RoleMenuItem {
  id: string;
}

function toMenuNode(raw: unknown): MenuNode | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : "";
  if (!id) {
    return null;
  }

  const children = Array.isArray(value.children)
    ? value.children
        .map((child) => toMenuNode(child))
        .filter((child): child is MenuNode => child !== null)
    : undefined;

  return {
    id,
    path: typeof value.path === "string" ? value.path : "",
    name: typeof value.name === "string" ? value.name : "",
    icon: typeof value.icon === "string" ? value.icon : undefined,
    parentId: typeof value.parentId === "string" ? value.parentId : null,
    type: typeof value.type === "string" ? value.type : "menu",
    permissionCode:
      typeof value.permissionCode === "string" ? value.permissionCode : undefined,
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    sort: typeof value.sort === "number" ? value.sort : 0,
    children,
  };
}

function toMenuNodes(raw: unknown): MenuNode[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => toMenuNode(item))
    .filter((item): item is MenuNode => item !== null);
}

function toRoleDetail(raw: unknown): RoleDetail | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;

  return {
    id: typeof value.id === "string" ? value.id : "",
    name: typeof value.name === "string" ? value.name : "",
    code: typeof value.code === "string" ? value.code : "",
    description:
      typeof value.description === "string" ? value.description : undefined,
    dataScope:
      typeof value.dataScope === "string"
        ? (value.dataScope as DataScopeValue)
        : undefined,
    dataScopeDeptIds:
      typeof value.dataScopeDeptIds === "string"
        ? value.dataScopeDeptIds
        : value.dataScopeDeptIds === null
          ? null
          : undefined,
  };
}

function toRoleMenuItems(raw: unknown): RoleMenuItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const value = item as Record<string, unknown>;
      if (typeof value.id !== "string") {
        return null;
      }
      return { id: value.id };
    })
    .filter((item): item is RoleMenuItem => item !== null);
}

export function RolePermissionsContent({
  roleId,
}: RolePermissionsContentProps) {
  const queryClient = useQueryClient();
  const api = getScrmApi();

  const { data: allMenus = [], isLoading: menusLoading } = useQuery<MenuNode[]>({
    queryKey: ["menus-tree"],
    queryFn: async () => {
      const result = (await api.menuControllerGetAllMenus()) as unknown;
      return toMenuNodes(result);
    },
  });

  const { data: roleData, isLoading: roleLoading } = useQuery<RoleDetail | null>({
    queryKey: ["roles", roleId],
    queryFn: async () => {
      const result = (await api.rolesControllerFindOneRole(roleId)) as unknown;
      return toRoleDetail(result);
    },
    enabled: !!roleId,
  });

  const { data: roleMenus = [] } = useQuery<RoleMenuItem[]>({
    queryKey: ["roles", roleId, "menus"],
    queryFn: async () => {
      const result = (await api.rolesControllerGetRoleMenus(roleId)) as unknown;
      return toRoleMenuItems(result);
    },
    enabled: !!roleId,
  });

  const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();

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

  useEffect(() => {
    if (!roleData) {
      return;
    }

    const menuIds = roleMenus.map((menu) => menu.id);
    const deptIds = parseDepartmentIds(roleData.dataScopeDeptIds || "");

    form.reset({
      name: roleData.name || "",
      code: roleData.code || "",
      description: roleData.description || "",
      dataScope: roleData.dataScope || "all",
      dataScopeDeptIds: stringifyDepartmentIds(deptIds),
      menuIds,
    });
  }, [roleData, roleMenus, form]);

  const menuIds = useWatch({
    control: form.control,
    name: "menuIds",
  });
  const dataScope = useWatch({
    control: form.control,
    name: "dataScope",
  });
  const dataScopeDeptIds = useWatch({
    control: form.control,
    name: "dataScopeDeptIds",
  });
  const roleName = useWatch({
    control: form.control,
    name: "name",
  });
  const roleCode = useWatch({
    control: form.control,
    name: "code",
  });
  const roleDescription = useWatch({
    control: form.control,
    name: "description",
  });

  useEffect(() => {
    if (dataScope !== "custom" && form.getValues("dataScopeDeptIds")) {
      form.setValue("dataScopeDeptIds", "", { shouldDirty: true });
    }
  }, [dataScope, form]);

  const selectedMenuIds = useMemo(() => new Set(menuIds || []), [menuIds]);
  const selectedDepartmentIds = useMemo(
    () => new Set(parseDepartmentIds(dataScopeDeptIds)),
    [dataScopeDeptIds],
  );

  const updateMutation = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const customDepartmentIds = parseDepartmentIds(values.dataScopeDeptIds);

      if (values.dataScope === "custom" && customDepartmentIds.length === 0) {
        throw new Error("请选择至少一个部门");
      }

      return await api.rolesControllerUpdateRole(roleId, {
        dataScope: values.dataScope || "all",
        dataScopeDeptIds:
          values.dataScope === "custom"
            ? stringifyDepartmentIds(customDepartmentIds)
            : undefined,
        menuIds: values.menuIds || [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", roleId] });
      queryClient.invalidateQueries({ queryKey: ["roles", roleId, "menus"] });
      toast.success("权限配置保存成功");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "保存失败");
    },
  });

  const onSubmit = async (values: RoleFormValues) => {
    await updateMutation.mutateAsync(values);
  };

  const handleSave = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleToggleMenu = (id: string, checked: boolean) => {
    const currentIds = form.getValues("menuIds") || [];
    const nextIds = checked
      ? Array.from(new Set([...currentIds, id]))
      : currentIds.filter((value) => value !== id);
    form.setValue("menuIds", nextIds, { shouldDirty: true });
  };

  const handleToggleMenuNode = (childIds: string[], checked: boolean) => {
    const currentIds = form.getValues("menuIds") || [];
    const nextIds = new Set(currentIds);

    if (checked) {
      childIds.forEach((id) => nextIds.add(id));
    } else {
      childIds.forEach((id) => nextIds.delete(id));
    }

    form.setValue("menuIds", Array.from(nextIds), { shouldDirty: true });
  };

  const handleToggleDepartmentNode = (childIds: string[], checked: boolean) => {
    const currentIds = new Set(parseDepartmentIds(form.getValues("dataScopeDeptIds")));

    if (checked) {
      childIds.forEach((id) => currentIds.add(id));
    } else {
      childIds.forEach((id) => currentIds.delete(id));
    }

    form.setValue("dataScopeDeptIds", stringifyDepartmentIds(Array.from(currentIds)), {
      shouldDirty: true,
    });
  };

  const menuTree = useMemo(() => {
    return normalizeMenuTree(allMenus);
  }, [allMenus]);

  const departmentsTree = useMemo(() => {
    return ((departmentsData || []) as DepartmentNode[]).map((department) => ({
      id: department.id,
      name: department.name,
      children: (department.children || []) as DepartmentNode[],
    }));
  }, [departmentsData]);

  if (menusLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">角色信息</CardTitle>
          <CardDescription>
            {roleName} ({roleCode})
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {roleDescription || "暂无描述"}
        </CardContent>
      </Card>

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
            <div className="py-8 text-center text-muted-foreground">
              暂无可配置的菜单
            </div>
          ) : (
            <div className="space-y-2">
              {menuTree.map((node) => (
                <div key={node.id}>
                  <MenuTreeNodeItem
                    node={node}
                    selectedIds={selectedMenuIds}
                    onToggle={handleToggleMenu}
                    onToggleNode={handleToggleMenuNode}
                    level={0}
                  />
                  <Separator className="my-2 ml-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">数据权限</CardTitle>
          </div>
          <CardDescription>配置角色可访问的数据范围</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid max-w-2xl gap-4">
            {dataScopeOptions.map((option) => (
              <label
                key={option.value}
                className={`
                  flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all
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
                    form.setValue("dataScope", option.value, {
                      shouldDirty: true,
                    })
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {dataScope === "custom" && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">可访问部门</div>
                <div className="text-xs text-muted-foreground">
                  已选 {selectedDepartmentIds.size} 个
                </div>
              </div>

              {departmentsLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加载部门中...
                </div>
              ) : departmentsTree.length === 0 ? (
                <div className="py-2 text-sm text-muted-foreground">
                  暂无可选择的部门
                </div>
              ) : (
                <div className="space-y-2">
                  {departmentsTree.map((department) => (
                    <div key={department.id}>
                      <DepartmentTreeNodeItem
                        node={department}
                        selectedIds={selectedDepartmentIds}
                        onToggleNode={handleToggleDepartmentNode}
                      />
                      <Separator className="my-2 ml-4" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-background py-4">
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
