import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Menu,
  Edit,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useAllMenus } from "../hooks/use-all-menus";
import { getScrmApi } from "@/services/api";
import type { MenuNode } from "../hooks/use-all-menus";

interface MenusTreeTableProps {
  onEdit: (menu: MenuNode) => void;
  onCreate?: () => void;
}

export function MenusTreeTable({ onEdit, onCreate }: MenusTreeTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMenu, setDeletingMenu] = useState<MenuNode | null>(null);
  const [hasChildrenDialogOpen, setHasChildrenDialogOpen] = useState(false);
  const [menuWithChildren, setMenuWithChildren] = useState<MenuNode | null>(
    null,
  );

  const queryClient = useQueryClient();

  // 从 API 获取菜单数据
  const { data: treeData, isLoading, error } = useAllMenus();

  // 删除菜单 mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await (getScrmApi() as any).menuControllerDeleteMenu(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus-all"] });
      toast.success("菜单删除成功");
      setDeleteDialogOpen(false);
      setDeletingMenu(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });

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
  const handleEdit = (menu: MenuNode) => {
    onEdit(menu);
  };

  // 处理删除按钮点击
  const handleDelete = (menu: MenuNode) => {
    // 检查是否有子菜单/按钮
    const hasChildren = menu.children && menu.children.length > 0;
    if (hasChildren) {
      setMenuWithChildren(menu);
      setHasChildrenDialogOpen(true);
      return;
    }
    setDeletingMenu(menu);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = () => {
    if (deletingMenu) {
      deleteMutation.mutate(deletingMenu.id);
    }
  };

  // 根据搜索关键词过滤菜单树
  const { filteredTreeData, autoExpandedIds } = useMemo(() => {
    if (!searchKeyword.trim()) {
      return {
        filteredTreeData: treeData,
        autoExpandedIds: new Set<string>(),
      };
    }

    const filterNodes = (
      nodes: MenuNode[],
    ): { nodes: MenuNode[]; expandedIds: Set<string> } => {
      const filtered: MenuNode[] = [];
      const expandedIds = new Set<string>();

      nodes.forEach((node) => {
        const nodeCopy = { ...node };
        const isMatch = node.name
          .toLowerCase()
          .includes(searchKeyword.toLowerCase());
        const filteredChildren = node.children
          ? filterNodes(node.children)
          : { nodes: [], expandedIds: new Set<string>() };

        if (isMatch || filteredChildren.nodes.length > 0) {
          nodeCopy.children = filteredChildren.nodes;
          filtered.push(nodeCopy);

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
      nodes: MenuNode[],
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
  useState(() => {
    if (searchKeyword.trim() && autoExpandedIds.size > 0) {
      setExpandedIds(autoExpandedIds);
    } else if (!searchKeyword.trim()) {
      setExpandedIds(new Set());
    }
  });

  // 递归渲染表格行
  const renderRows = (nodes: MenuNode[], level: number = 0) => {
    return nodes.flatMap((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(node.id);
      const isButton = node.type === "button";

      const rows = [
        <TableRow key={node.id}>
          <TableCell>
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${level * 24}px` }}
            >
              {hasChildren && !isButton ? (
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
              ) : (
                <div className="h-5 w-5" />
              )}
              <Menu
                className={`h-4 w-4 ${isButton ? "text-muted-foreground" : "text-primary"}`}
              />
              <span className="font-medium">{node.name}</span>
              {node.type === "button" && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  按钮
                </Badge>
              )}
              {!node.enabled && (
                <Badge variant="outline" className="ml-2 text-xs">
                  禁用
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>{node.path || "-"}</TableCell>
          <TableCell>{node.icon || "-"}</TableCell>
          <TableCell>{node.sort}</TableCell>
          <TableCell>{node.permissionCode || "-"}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(node)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(node)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
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

  // 统计总菜单数
  const countTotalMenus = (nodes: MenuNode[]): number => {
    let count = 0;
    nodes.forEach((node) => {
      count += 1;
      if (node.children) {
        count += countTotalMenus(node.children);
      }
    });
    return count;
  };

  const total = countTotalMenus(filteredTreeData || []);

  // 加载状态
  if (isLoading) {
    return <div className="flex justify-center p-8">加载中...</div>;
  }

  // 错误状态
  if (error) {
    return (
      <div className="text-destructive p-8">加载失败: {error.message}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="搜索菜单..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建菜单
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>菜单名称</TableHead>
              <TableHead>路径</TableHead>
              <TableHead>图标</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>权限代码</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTreeData && filteredTreeData.length > 0 ? (
              renderRows(filteredTreeData)
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchKeyword ? "未找到匹配的菜单" : "暂无数据"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">共 {total} 个菜单</div>

      {/* 删除确认对话框 */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={deletingMenu?.name || ""}
        isLoading={deleteMutation.isPending}
      />

      {/* 有子项提示对话框 */}
      <AlertDialog
        open={hasChildrenDialogOpen}
        onOpenChange={setHasChildrenDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>无法删除</AlertDialogTitle>
            <AlertDialogDescription>
              菜单 <strong>{menuWithChildren?.name}</strong>{" "}
              下还有子菜单或按钮，请先删除子项后再删除该菜单。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>我知道了</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
