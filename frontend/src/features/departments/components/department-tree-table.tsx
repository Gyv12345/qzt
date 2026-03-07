import { useState, useEffect, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Building2,
  Edit,
  Trash2,
} from "lucide-react";
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
  useDepartments,
  useDeleteDepartment,
  type DepartmentNode,
} from "../hooks/use-departments";
import { DepartmentFormDrawer } from "./department-form-drawer";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

export function DepartmentTreeTable() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentNode | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDepartment, setDeletingDepartment] =
    useState<DepartmentNode | null>(null);

  const { data: treeData, isLoading, error } = useDepartments();
  const { mutate: deleteDepartment, isPending: isDeleting } =
    useDeleteDepartment();

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
  const handleEdit = (department: DepartmentNode) => {
    setEditingDepartment(department);
    setDrawerOpen(true);
  };

  // 处理删除按钮点击
  const handleDelete = (department: DepartmentNode) => {
    setDeletingDepartment(department);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = () => {
    if (deletingDepartment) {
      deleteDepartment(deletingDepartment.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingDepartment(null);
        },
      });
    }
  };

  // 处理抽屉关闭
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingDepartment(null);
  };

  // 处理添加按钮点击
  const handleAdd = () => {
    setEditingDepartment(null);
    setDrawerOpen(true);
  };

  const handleDrawerSuccess = () => {
    handleDrawerClose();
    // 刷新列表由 mutation 自动处理
  };

  // 根据搜索关键词过滤部门树（使用 useMemo 优化性能）
  const { filteredTreeData, autoExpandedIds } = useMemo(() => {
    if (!searchKeyword.trim()) {
      return {
        filteredTreeData: treeData || [],
        autoExpandedIds: new Set<string>(),
      };
    }

    const filterNodes = (
      nodes: DepartmentNode[],
    ): { nodes: DepartmentNode[]; expandedIds: Set<string> } => {
      const filtered: DepartmentNode[] = [];
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
      nodes: DepartmentNode[],
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
  const renderRows = (nodes: DepartmentNode[], level: number = 0) => {
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
              <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="font-medium">{node.name}</span>
              {node.isSystem && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  系统
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>{node.sort}</TableCell>
          <TableCell>
            {node.status === "ACTIVE" ? (
              <Badge variant="default">启用</Badge>
            ) : (
              <Badge variant="secondary">禁用</Badge>
            )}
          </TableCell>
          <TableCell>
            {new Date(node.createdAt).toLocaleDateString("zh-CN")}
          </TableCell>
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
                disabled={node.isSystem}
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

  // 统计总部门数（包括所有子部门）
  const countTotalDepartments = (nodes: DepartmentNode[]): number => {
    let count = 0;
    nodes.forEach((node) => {
      count += 1;
      if (node.children) {
        count += countTotalDepartments(node.children);
      }
    });
    return count;
  };

  const total = countTotalDepartments(filteredTreeData || []);

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
          placeholder="搜索部门..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增部门
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>部门名称</TableHead>
              <TableHead>排序</TableHead>
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
                  {searchKeyword ? "未找到匹配的部门" : "暂无数据"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">共 {total} 个部门</div>

      <DepartmentFormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleDrawerClose();
          } else {
            setDrawerOpen(true);
          }
        }}
        editingDepartment={editingDepartment || undefined}
        onSuccess={handleDrawerSuccess}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={deletingDepartment?.name || ""}
        isLoading={isDeleting}
      />
    </div>
  );
}
