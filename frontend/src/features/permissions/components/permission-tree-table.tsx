import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useMenuTree,
  convertToPermissionTree,
} from "@/features/menus/hooks/use-menu-tree";
import { PermissionFormDrawer } from "./permission-form-drawer";
import { useDeletePermission } from "../hooks/use-permissions";
import type { Permission, PermissionTreeNode } from "../data/schema";
import { cn } from "@/lib/utils";

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case "menu":
      return "default";
    case "button":
      return "secondary";
    case "data":
      return "outline";
    default:
      return "outline";
  }
};

const typeLabel = (type: string) => {
  switch (type) {
    case "menu":
      return "菜单";
    case "button":
      return "按钮";
    case "data":
      return "数据";
    default:
      return type;
  }
};

interface PermissionTreeNodeItemProps {
  node: PermissionTreeNode;
  level: number;
  onEdit: (permission: Permission) => void;
  onDelete: (permission: Permission) => void;
}

function PermissionTreeNodeItem({
  node,
  level,
  onEdit,
  onDelete,
}: PermissionTreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren =
    (node.children?.length || 0) > 0 || (node.permissions?.length || 0) > 0;

  const handleEdit = (permission: Permission) => {
    onEdit(permission);
  };

  const handleDelete = (permission: Permission) => {
    onDelete(permission);
  };

  return (
    <div>
      {/* 菜单节点 */}
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 hover:bg-accent/50 border-b",
          node.type === "menu" && "bg-muted/30 font-medium",
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="flex-shrink-0 p-0.5 hover:bg-muted rounded"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <span className="flex-1">{node.name}</span>

        {node.permissions && node.permissions.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {node.permissions.length} 个权限
          </Badge>
        )}
      </div>

      {/* 展开的权限和子菜单 */}
      {isOpen && (
        <>
          {/* 直接权限 */}
          {node.permissions && node.permissions.length > 0 && (
            <div className="bg-background">
              {node.permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center gap-2 py-2 px-3 hover:bg-accent/30 border-b"
                  style={{ marginLeft: `${(level + 1) * 16 + 24}px` }}
                >
                  <span className="w-5" />
                  <span className="flex-1">{permission.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {permission.code}
                  </span>
                  <Badge variant={typeBadgeVariant(permission.type)}>
                    {typeLabel(permission.type)}
                  </Badge>
                  <Badge
                    variant={permission.status === 1 ? "default" : "secondary"}
                  >
                    {permission.status === 1 ? "启用" : "禁用"}
                  </Badge>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleEdit(permission)}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8"
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(permission)}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-destructive h-8 w-8"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 子菜单 */}
          {node.children && node.children.length > 0 && (
            <>
              {node.children.map((child) => (
                <PermissionTreeNodeItem
                  key={child.id}
                  node={child}
                  level={level + 1}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

interface PermissionTreeTableProps {
  onRefresh?: () => void;
}

export function PermissionTreeTable({ onRefresh }: PermissionTreeTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<
    Permission | undefined
  >();

  const { data: menuTree, isLoading, error, refetch } = useMenuTree();
  const deleteMutation = useDeletePermission();

  // 转换为权限树
  const permissionTree = useMemo(() => {
    if (!menuTree) return [];
    return convertToPermissionTree(menuTree);
  }, [menuTree]);

  // 过滤树
  const filteredTree = useMemo(() => {
    if (!searchQuery) return permissionTree;

    function filterTree(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
      return nodes.reduce((acc: PermissionTreeNode[], node) => {
        const matchesSearch = (text: string) =>
          text.toLowerCase().includes(searchQuery.toLowerCase());

        const nameMatches = matchesSearch(node.name);
        const matchedPermissions = node.permissions?.filter(
          (p) => matchesSearch(p.name) || matchesSearch(p.code),
        );

        const filteredChildren = node.children ? filterTree(node.children) : [];

        if (
          nameMatches ||
          (matchedPermissions && matchedPermissions.length > 0) ||
          filteredChildren.length > 0
        ) {
          acc.push({
            ...node,
            permissions: matchedPermissions || node.permissions,
            children: filteredChildren,
          });
        }

        return acc;
      }, []);
    }

    return filterTree(permissionTree);
  }, [permissionTree, searchQuery]);

  const handleCreate = () => {
    setEditingPermission(undefined);
    setDrawerOpen(true);
  };

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    setDrawerOpen(true);
  };

  const handleDelete = async (permission: Permission) => {
    if (window.confirm(`确定要删除权限 "${permission.name}" 吗？`)) {
      try {
        await deleteMutation.mutateAsync(permission.id);
        refetch();
        onRefresh?.();
      } catch (error) {
        console.error("删除失败:", error);
      }
    }
  };

  const handleSuccess = () => {
    refetch();
    onRefresh?.();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">加载中...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive p-8">
        加载失败: {(error as Error).message}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Input
            placeholder="搜索权限名称或编码..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新增权限
          </Button>
        </div>

        <div className="rounded-md border">
          {/* 表头 */}
          <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 font-medium text-sm border-b">
            <span className="w-8" />
            <span className="flex-1">名称</span>
            <span className="w-32">编码</span>
            <span className="w-20">类型</span>
            <span className="w-20">状态</span>
            <span className="w-24 text-right">操作</span>
          </div>

          {/* 树形内容 */}
          {filteredTree.length > 0 ? (
            <div>
              {filteredTree.map((node) => (
                <PermissionTreeNodeItem
                  key={node.id}
                  node={node}
                  level={0}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              {searchQuery ? "未找到匹配的权限" : "暂无权限数据"}
            </div>
          )}
        </div>
      </div>

      <PermissionFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        permission={editingPermission}
        onSuccess={handleSuccess}
      />
    </>
  );
}
