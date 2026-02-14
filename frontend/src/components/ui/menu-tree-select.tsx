import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Minus, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MenuNode } from "@/features/menus/hooks/use-all-menus";

// 收集节点下所有菜单 ID（包括子菜单和按钮权限）
function collectNodeMenuIds(node: MenuNode): string[] {
  const ids: string[] = [];
  ids.push(node.id);

  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      ids.push(...collectNodeMenuIds(child));
    });
  }

  return ids;
}

interface MenuTreeProps {
  nodes: MenuNode[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleMenu: (nodeId: string, checked: boolean, childIds: string[]) => void;
  level?: number;
}

function MenuTree({
  nodes,
  selectedIds,
  onToggle,
  onToggleMenu,
  level = 0,
}: MenuTreeProps) {
  return (
    <ul className={cn(level > 0 && "ml-4 border-l border-border pl-2")}>
      {nodes.map((node) => (
        <MenuTreeNodeItem
          key={node.id}
          node={node}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onToggleMenu={onToggleMenu}
          level={level}
        />
      ))}
    </ul>
  );
}

function MenuTreeNodeItem({
  node,
  selectedIds,
  onToggle,
  onToggleMenu,
  level,
}: {
  node: MenuNode;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleMenu: (nodeId: string, checked: boolean, childIds: string[]) => void;
  level: number;
}) {
  // 默认展开所有节点（包括按钮权限）
  const [isOpen, setIsOpen] = useState(true);

  const childNodeIds = useMemo(() => collectNodeMenuIds(node), [node]);

  // 计算所有子节点是否都被选中
  const allChildrenSelected =
    childNodeIds.length > 0 && childNodeIds.every((id) => selectedIds.has(id));
  const someChildrenSelected = childNodeIds.some((id) => selectedIds.has(id));

  const hasChildren = node.children && node.children.length > 0;

  // 按钮权限显示不同样式
  const isButton = node.type === "button";

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-sm hover:bg-accent hover:text-accent-foreground text-sm",
          isButton && "ml-4",
        )}
      >
        {hasChildren && !isButton ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="flex-shrink-0 p-0.5 hover:bg-muted rounded"
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

        <span
          className={cn(
            "flex-1",
            isButton ? "text-muted-foreground" : "font-medium",
          )}
        >
          {node.name}
        </span>

        {node.permissionCode && (
          <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-muted rounded flex items-center gap-1">
            <Shield className="h-3 w-3" />
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
        <MenuTree
          nodes={node.children!}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onToggleMenu={onToggleMenu}
          level={isButton ? level : level + 1}
        />
      )}
    </li>
  );
}

interface MenuTreeSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
  menuTree: MenuNode[];
  placeholder?: string;
  className?: string;
}

export function MenuTreeSelect({
  value = [],
  onChange,
  menuTree,
  placeholder = "请选择菜单权限",
  className,
}: MenuTreeSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(value), [value]);

  const handleToggle = (id: string, checked: boolean) => {
    const newIds = checked ? [...value, id] : value.filter((v) => v !== id);
    onChange(newIds);
  };

  const handleToggleMenu = (
    _nodeId: string,
    checked: boolean,
    childIds: string[],
  ) => {
    const otherIds = value.filter((v) => !childIds.includes(v));
    const newIds = checked ? [...otherIds, ...childIds] : otherIds;
    onChange(newIds);
  };

  const selectedCount = value.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            value.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          {selectedCount > 0 ? `已选择 ${selectedCount} 个权限` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-80">
          <div className="p-2">
            <MenuTree
              nodes={menuTree}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleMenu={handleToggleMenu}
            />
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
