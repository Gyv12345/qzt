import { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePermissionTree,
  useDeletePermission,
} from "../hooks/use-permissions";
import { PermissionFormDrawer } from "./permission-form-drawer";

interface PermissionNode {
  id: string;
  name: string;
  code: string;
  type: "menu" | "button" | "data";
  parentId?: string | null;
  description?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  children?: PermissionNode[];
}

const typeLabels: Record<string, string> = {
  menu: "菜单",
  button: "按钮",
  data: "数据",
};

const typeBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  menu: "default",
  button: "secondary",
  data: "outline",
};

export function PermissionTreeTable() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<PermissionNode | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPermission, setDeletingPermission] =
    useState<PermissionNode | null>(null);

  const { data: treeData, isLoading, error } = usePermissionTree();
  const { mutate: deletePermission, isPending: isDeleting } =
    useDeletePermission();

  // 当搜索关键词变化时，重置展开状态
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setExpandedIds(new Set());
    }
  }, [searchKeyword]);

  // 切换展开/收起状态
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 处理编辑按钮点击
  const handleEdit = (permission: PermissionNode) => {
    setEditingPermission(permission);
    setDrawerOpen(true);
  };

  // 处理删除按钮点击
  const handleDelete = (permission: PermissionNode) => {
    setDeletingPermission(permission);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = () => {
    if (deletingPermission) {
      deletePermission(deletingPermission.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingPermission(null);
        },
        onError: (error: any) => {
          // 错误已在 hook 中处理
        },
      });
    }
  };

  // 处理对话框关闭
  const handleDialogClose = () => {
    setDrawerOpen(false);
    setEditingPermission(null);
  };

  // 处理添加按钮点击
  const handleAdd = () => {
    setEditingPermission(null);
    setDrawerOpen(true);
  };

  // 根据搜索关键词过滤权限树（使用 useMemo 优化性能）
  const { filteredTreeData, autoExpandedIds } = useMemo(() => {
    if (!searchKeyword.trim()) {
      return { filteredTreeData: treeData, autoExpandedIds: new Set<string>() };
    }

    const filterNodes = (
      nodes: PermissionNode[],
    ): { nodes: PermissionNode[]; expandedIds: Set<string> } => {
      const filtered: PermissionNode[] = [];
      const expandedIds = new Set<string>();

      nodes.forEach((node) => {
        const nodeCopy = { ...node };
        const isMatch =
          node.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          node.code.toLowerCase().includes(searchKeyword.toLowerCase());
        const filteredChildren = node.children
          ? filterNodes(node.children)
          : { nodes: [], expandedIds: new Set<string>() };

        if (isMatch || filteredChildren.nodes.length > 0) {
          nodeCopy.children = filteredChildren.nodes;
          filtered.push(nodeCopy);

          // 如果有匹配的子节点，标记需要展开
          if (filteredChildren.nodes.length > 0) {
            expandedIds.add(node.id);
          }
        }
      });

      return { nodes: filtered, expandedIds };
    };

    const result = filterNodes(treeData || []);

    // 递归收集所有需要展开的节点ID
    const collectExpandedIds = (
      nodes: PermissionNode[],
      ids: Set<string>,
    ): Set<string> => {
      const allIds = new Set(ids);
      nodes.forEach((node) => {
        if (node.children) {
          node.children.forEach((child) => {
            if (allIds.has(child.id)) {
              allIds.add(node.id);
            }
          });
          collectExpandedIds(node.children, allIds);
        }
      });
      return allIds;
    };

    const allExpandedIds = collectExpandedIds(result.nodes, result.expandedIds);

    return {
      filteredTreeData: result.nodes,
      autoExpandedIds: allExpandedIds,
    };
  }, [treeData, searchKeyword]);

  // 自动展开搜索结果
  useEffect(() => {
    if (searchKeyword.trim() && autoExpandedIds.size > 0) {
      setExpandedIds(autoExpandedIds);
    } else if (!searchKeyword.trim()) {
      setExpandedIds(new Set());
    }
  }, [searchKeyword, autoExpandedIds]);

  // 递归渲染表格行
  const renderRows = (nodes: PermissionNode[], level: number = 0) => {
    return nodes.flatMap((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(node.id);

      const rows = [
        <TableRow key={node.id}>
          <TableCell>
            <div
              className="flex items-center gap-1"
              style={{ paddingLeft: `${level * 24}px` }}
            >
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="h-5 w-5" />}
              <Shield className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="font-medium">{node.name}</span>
              <Badge
                variant={typeBadgeVariants[node.type] || "default"}
                className="ml-2 text-xs"
              >
                {typeLabels[node.type]}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <code className="text-sm text-muted-foreground">{node.code}</code>
          </TableCell>
          <TableCell>
            {node.status === 1 ? (
              <Badge variant="default">启用</Badge>
            ) : (
              <Badge variant="secondary">禁用</Badge>
            )}
          </TableCell>
          <TableCell>
            {new Date(node.createdAt).toLocaleDateString("zh-CN")}
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(node)}
              >
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(node)}
              >
                删除
              </Button>
            </div>
          </TableCell>
        </TableRow>,
      ];

      // 如果展开且有子节点，递归渲染子节点
      if (isExpanded && hasChildren) {
        rows.push(...renderRows(node.children!, level + 1));
      }

      return rows;
    });
  };

  // 统计总权限数（包括所有子权限）
  const countTotalPermissions = (nodes: PermissionNode[]): number => {
    let count = 0;
    nodes.forEach((node) => {
      count += 1;
      if (node.children) {
        count += countTotalPermissions(node.children);
      }
    });
    return count;
  };

  const total = countTotalPermissions(filteredTreeData || []);

  // 渲染加载状态
  if (isLoading) {
    return <div className="flex justify-center p-8">加载中...</div>;
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="text-destructive p-8">加载失败: {error.message}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="搜索权限..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增权限
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>权限名称</TableHead>
              <TableHead>权限编码</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTreeData && filteredTreeData.length > 0 ? (
              renderRows(filteredTreeData)
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {searchKeyword ? "未找到匹配的权限" : "暂无数据"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">共 {total} 个权限</div>

      <PermissionFormDrawer
        open={drawerOpen}
        onOpenChange={handleDialogClose}
        permission={editingPermission}
        onSuccess={handleDialogClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除权限"{deletingPermission?.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
