import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MenuNode } from "@/features/menus/hooks/use-menu-tree";
import type { PermissionTreeNode } from "@/features/permissions/data/schema";
import { collectNodePermissionIds } from "@/features/menus/hooks/use-menu-tree";

interface PermissionTreeProps {
  nodes: PermissionTreeNode[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleMenu: (_menuId: string, checked: boolean, childIds: string[]) => void;
  level?: number;
}

function PermissionTree({
  nodes,
  selectedIds,
  onToggle,
  onToggleMenu,
  level = 0,
}: PermissionTreeProps) {
  return (
    <ul className={cn(level > 0 && "ml-4 border-l border-border pl-2")}>
      {nodes.map((node) => (
        <PermissionTreeNodeItem
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

function PermissionTreeNodeItem({
  node,
  selectedIds,
  onToggle,
  onToggleMenu,
  level,
}: {
  node: PermissionTreeNode;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleMenu: (_menuId: string, checked: boolean, childIds: string[]) => void;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  // 计算子节点的选中状态
  const childNodeIds = useMemo(() => {
    return collectNodePermissionIds(node);
  }, [node]);

  const allChildrenSelected =
    childNodeIds.length > 0 && childNodeIds.every((id) => selectedIds.has(id));
  const someChildrenSelected = childNodeIds.some((id) => selectedIds.has(id));

  const handleToggle = (checked: boolean) => {
    onToggleMenu(node.id, checked, childNodeIds);
  };

  const hasChildren =
    (node.children?.length || 0) > 0 || (node.permissions?.length || 0) > 0;

  return (
    <li>
      <div className="flex items-center gap-1 py-1.5 px-2 rounded-sm hover:bg-accent hover:text-accent-foreground text-sm">
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

        <span className="flex-1">{node.name}</span>
      </div>

      {isOpen && (
        <>
          {/* 直接权限 */}
          {node.permissions && node.permissions.length > 0 && (
            <div className="ml-8">
              {node.permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center gap-2 py-1 px-2 text-sm hover:bg-accent/50 rounded-sm"
                >
                  <span className="w-4" />
                  <Checkbox
                    checked={selectedIds.has(permission.id)}
                    onCheckedChange={(checked) =>
                      onToggle(permission.id, !!checked)
                    }
                  />
                  <span className="flex-1">{permission.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {permission.code}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 子菜单 */}
          {node.children && node.children.length > 0 && (
            <PermissionTree
              nodes={node.children}
              selectedIds={selectedIds}
              onToggle={onToggle}
              onToggleMenu={onToggleMenu}
              level={level + 1}
            />
          )}
        </>
      )}
    </li>
  );
}

interface PermissionTreeSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
  menuTree: MenuNode[];
  placeholder?: string;
  className?: string;
}

// 将 MenuNode 转换为 PermissionTreeNode
function convertMenuToPermissionTree(menus: MenuNode[]): PermissionTreeNode[] {
  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    type: "menu",
    permissions: menu.permissions?.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type as "menu" | "button" | "data",
      description: p.description,
      status: p.status,
      createdAt: "",
      updatedAt: "",
    })),
    children: menu.children ? convertMenuToPermissionTree(menu.children) : [],
  }));
}

export function PermissionTreeSelect({
  value = [],
  onChange,
  menuTree,
  placeholder = "请选择权限",
  className,
}: PermissionTreeSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(value), [value]);

  const permissionTree = useMemo(
    () => convertMenuToPermissionTree(menuTree),
    [menuTree],
  );

  const handleToggle = (id: string, checked: boolean) => {
    const newIds = checked ? [...value, id] : value.filter((v) => v !== id);
    onChange(newIds);
  };

  const handleToggleMenu = (
    _menuId: string,
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
            <PermissionTree
              nodes={permissionTree}
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
