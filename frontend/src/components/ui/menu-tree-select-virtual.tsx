import { useState, useMemo, useRef, useCallback, Key } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  ChevronRight,
  Minus,
  Check,
  Shield,
  ChevronDownSquare,
  ChevronUpSquare,
  CheckSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { MenuNode } from "@/features/menus/hooks/use-all-menus";
import {
  buildParentChildMap,
  buildFlatTree,
  collectAllNodeIds,
  collectParentNodeIds,
  type FlatNode,
} from "@/lib/tree-utils";
import { useTranslation } from "react-i18next";

/**
 * 管理树形菜单的展开/收起状态
 */
function useTreeExpansion(nodes: MenuNode[]) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 切换节点展开状态
  const toggle = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // 展开所有节点
  const expandAll = useCallback(() => {
    const allParentIds = collectParentNodeIds(nodes);
    setExpandedIds(new Set(allParentIds));
  }, [nodes]);

  // 收起所有节点
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  return {
    expandedIds,
    toggle,
    expandAll,
    collapseAll,
  };
}

/**
 * 树节点组件（虚拟滚动单个节点）
 */
interface VirtualTreeNodeProps {
  flatNode: FlatNode;
  selectedIds: Set<string>;
  parentChildMap: Map<string, string[]>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleNode: (nodeId: string, checked: boolean) => void;
  onToggleExpand: (nodeId: string) => void;
  isExpanded: boolean;
}

function VirtualTreeNode({
  flatNode,
  selectedIds,
  parentChildMap,
  onToggle,
  onToggleNode,
  onToggleExpand,
  isExpanded,
}: VirtualTreeNodeProps) {
  const { t } = useTranslation();

  // 获取当前节点的所有子孙节点 ID（包括自身）
  const descendantIds = parentChildMap.get(flatNode.id) || [flatNode.id];

  // 计算子节点选中状态
  const allChildrenSelected =
    descendantIds.length > 0 &&
    descendantIds.every((id) => selectedIds.has(id));
  const someChildrenSelected = descendantIds.some((id) => selectedIds.has(id));

  // 是否为按钮权限
  const isButton = flatNode.type === "button";

  // 处理复选框变化
  const handleCheckboxChange = (checked: boolean) => {
    if (flatNode.hasChildren && !isButton) {
      // 父节点：联动选择所有子孙节点
      onToggleNode(flatNode.id, checked);
    } else {
      // 叶子节点/按钮：只切换自身
      onToggle(flatNode.id, checked);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 h-10 px-2 border-b border-border/50 hover:bg-accent transition-colors",
        "shrink-0",
      )}
      style={{ paddingLeft: `${16 + flatNode.level * 20}px` }}
    >
      {/* 展开/收起按钮 */}
      {flatNode.hasChildren && !isButton ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(flatNode.id);
          }}
          className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
          aria-label={isExpanded ? "收起" : "展开"}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}

      {/* 复选框 */}
      <Checkbox
        checked={selectedIds.has(flatNode.id)}
        onCheckedChange={handleCheckboxChange}
        className={cn(
          allChildrenSelected && "data-[state=checked]:bg-primary",
          !allChildrenSelected &&
            someChildrenSelected &&
            "data-[state=unchecked]:bg-primary/50",
        )}
      >
        {!allChildrenSelected && someChildrenSelected && (
          <Minus className="h-3 w-3" />
        )}
        {allChildrenSelected && <Check className="h-3 w-3" />}
      </Checkbox>

      {/* 节点名称 */}
      <span
        className={cn(
          "flex-1 text-sm truncate",
          isButton ? "text-muted-foreground" : "font-medium",
        )}
      >
        {flatNode.name}
      </span>

      {/* 按钮类型标签 */}
      {flatNode.type === "button" && (
        <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 rounded whitespace-nowrap">
          {t("roles.permissionTree.button")}
        </span>
      )}

      {/* 权限代码标签 */}
      {flatNode.permissionCode && (
        <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-muted rounded whitespace-nowrap flex items-center gap-1">
          <Shield className="h-3 w-3 flex-shrink-0" />
          <span className="max-w-[120px] truncate">
            {flatNode.permissionCode}
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * 工具栏组件：展开/收起/全选/清空
 */
interface MenuTreeToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  totalCount: number;
  selectedCount: number;
}

function MenuTreeToolbar({
  onExpandAll,
  onCollapseAll,
  onSelectAll,
  onClearAll,
  totalCount,
  selectedCount,
}: MenuTreeToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/40 rounded-t-md">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onExpandAll}
        className="h-8 px-2 text-xs"
      >
        <ChevronDownSquare className="h-3.5 w-3.5 mr-1" />
        {t("roles.permissionTree.expandAll")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCollapseAll}
        className="h-8 px-2 text-xs"
      >
        <ChevronUpSquare className="h-3.5 w-3.5 mr-1" />
        {t("roles.permissionTree.collapseAll")}
      </Button>
      <div className="flex-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        className="h-8 px-2 text-xs"
        disabled={selectedCount === totalCount}
      >
        <CheckSquare className="h-3.5 w-3.5 mr-1" />
        {t("roles.permissionTree.selectAll")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-8 px-2 text-xs"
        disabled={selectedCount === 0}
      >
        <X className="h-3.5 w-3.5 mr-1" />
        {t("roles.permissionTree.clearAll")}
      </Button>
    </div>
  );
}

/**
 * 虚拟滚动树形菜单列表
 */
interface VirtualMenuTreeProps {
  nodes: MenuNode[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function VirtualMenuTree({ nodes, value, onChange }: VirtualMenuTreeProps) {
  const { t } = useTranslation();

  // 展开/收起状态管理
  const { expandedIds, toggle, expandAll, collapseAll } =
    useTreeExpansion(nodes);

  // 构建父子关系映射（缓存，只在 nodes 变化时重建）
  const parentChildMap = useMemo(() => buildParentChildMap(nodes), [nodes]);

  // 构建扁平树（缓存，只在 expandedIds 或 nodes 变化时重建）
  const flatNodes = useMemo(
    () => buildFlatTree(nodes, expandedIds),
    [nodes, expandedIds],
  );

  // 虚拟滚动容器引用
  const parentRef = useRef<HTMLDivElement>(null);

  // 虚拟滚动实例
  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // 固定行高 40px
    overscan: 5, // 预渲染 5 行
  });

  const virtualItems = virtualizer.getVirtualItems();

  // 选中状态管理（使用 Set 实现 O(1) 查找）
  const selectedIds = useMemo(() => new Set(value), [value]);

  // 切换单个节点选中状态
  const handleToggle = useCallback(
    (id: string, checked: boolean) => {
      const newSelected = new Set(selectedIds);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      onChange(Array.from(newSelected));
    },
    [selectedIds, onChange],
  );

  // 切换父节点及其所有子孙节点的选中状态
  const handleToggleNode = useCallback(
    (nodeId: string, checked: boolean) => {
      const descendantIds = parentChildMap.get(nodeId) || [nodeId];
      const newSelected = new Set(selectedIds);

      if (checked) {
        descendantIds.forEach((id) => newSelected.add(id));
      } else {
        descendantIds.forEach((id) => newSelected.delete(id));
      }

      onChange(Array.from(newSelected));
    },
    [selectedIds, parentChildMap, onChange],
  );

  // 全选
  const handleSelectAll = useCallback(() => {
    const allIds = collectAllNodeIds(nodes);
    onChange(allIds);
  }, [nodes, onChange]);

  // 清空选择
  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // 空状态
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-muted-foreground text-sm">
        {t("roles.permissionTree.noPermissions")}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-md border">
      {/* 工具栏 */}
      <MenuTreeToolbar
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
        totalCount={collectAllNodeIds(nodes).length}
        selectedCount={selectedIds.size}
      />

      {/* 虚拟滚动列表 */}
      <div
        ref={parentRef}
        className="h-[320px] overflow-auto"
        data-testid="virtual-tree-container"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const flatNode = flatNodes[virtualRow.index];
            return (
              <div
                key={virtualRow.key as Key}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <VirtualTreeNode
                  flatNode={flatNode}
                  selectedIds={selectedIds}
                  parentChildMap={parentChildMap}
                  onToggle={handleToggle}
                  onToggleNode={handleToggleNode}
                  onToggleExpand={toggle}
                  isExpanded={expandedIds.has(flatNode.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 虚拟滚动树形菜单选择器组件
 *
 * @example
 * ```tsx
 * <MenuTreeSelectVirtual
 *   value={selectedPermissions}
 *   onChange={setSelectedPermissions}
 *   menuTree={menuTreeData}
 *   placeholder="请选择角色权限"
 * />
 * ```
 */
interface MenuTreeSelectVirtualProps {
  value?: string[];
  onChange: (value: string[]) => void;
  menuTree: MenuNode[];
  placeholder?: string;
  className?: string;
}

export function MenuTreeSelectVirtual({
  value = [],
  onChange,
  menuTree,
  placeholder,
  className,
}: MenuTreeSelectVirtualProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedCount = value.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            value.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          {selectedCount > 0
            ? t("roles.permissionTree.selectedCount", { count: selectedCount })
            : placeholder || t("roles.permissionTree.selectPermissions")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start" side="bottom">
        <VirtualMenuTree
          nodes={menuTree}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </PopoverContent>
    </Popover>
  );
}
