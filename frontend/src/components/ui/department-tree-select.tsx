import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface Department {
  id: string;
  name: string;
  children?: Department[];
}

interface DepartmentTreeProps {
  departments: Department[];
  selectedId?: string;
  onSelect: (id: string) => void;
  level?: number;
  parentId?: string;
  excludeId?: string;
}

// 使用 Map 来跟踪每个部门的展开状态
const expandStateMap = new Map<string, boolean>();

function DepartmentTree({
  departments,
  selectedId,
  onSelect,
  level = 0,
  parentId = "root",
  excludeId,
}: DepartmentTreeProps) {
  // 过滤掉 excludeId（编辑时排除自己和子孙部门）
  const filteredDepartments = departments.filter((dept) => {
    if (excludeId) {
      // 检查 dept 或其子孙部门是否是 excludeId
      const isExcluded = (node: Department): boolean => {
        if (node.id === excludeId) return true;
        if (node.children) {
          return node.children.some((child) => isExcluded(child));
        }
        return false;
      };
      return !isExcluded(dept);
    }
    return true;
  });

  return (
    <ul className={cn("m-0 list-none", level > 0 && "ml-6")}>
      {filteredDepartments.map((dept, index) => {
        const deptKey = `${parentId}-${dept.id}`;
        const [isOpen, setIsOpen] = useState(
          () => expandStateMap.get(deptKey) ?? true,
        );

        const handleToggle = (e: React.MouseEvent) => {
          e.stopPropagation();
          const newState = !isOpen;
          setIsOpen(newState);
          expandStateMap.set(deptKey, newState);
        };

        const hasChildren = dept.children && dept.children.length > 0;

        return (
          <li key={dept.id} className="relative">
            {/* Tree connecting line for child items */}
            {level > 0 && (
              <div className="absolute left-[-18px] top-0 bottom-0 w-px bg-border" />
            )}
            {level > 0 && index === 0 && (
              <div className="absolute left-[-18px] top-3 w-4 h-px bg-border" />
            )}
            {level > 0 && index > 0 && (
              <div className="absolute left-[-18px] top-0 w-4 h-px bg-border" />
            )}

            <div
              className={cn(
                "flex items-center gap-1 py-1.5 px-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm",
                selectedId === dept.id && "bg-accent text-accent-foreground",
              )}
              onClick={() => onSelect(dept.id)}
            >
              {/* 展开按钮 - 只有父节点才显示 */}
              <span className="flex-shrink-0 w-5 flex items-center justify-center">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={handleToggle}
                    className="p-0.5 hover:bg-muted rounded transition-colors"
                    aria-label={isOpen ? "收起" : "展开"}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : null}
              </span>
              <span className="flex-1 select-none">{dept.name}</span>
            </div>

            {/* Children container - 只在展开时显示 */}
            {hasChildren && isOpen && (
              <DepartmentTree
                departments={dept.children!}
                selectedId={selectedId}
                onSelect={onSelect}
                level={level + 1}
                parentId={dept.id}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface DepartmentTreeSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  departments: Department[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  excludeId?: string;
}

export function DepartmentTreeSelect({
  value,
  onChange,
  departments,
  placeholder = "请选择部门",
  className,
  disabled,
  excludeId,
}: DepartmentTreeSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedDept = findDepartmentById(departments, value);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {selectedDept?.name || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <ScrollArea className="h-64">
          <div className="p-2">
            <DepartmentTree
              departments={departments}
              selectedId={value}
              onSelect={handleSelect}
              excludeId={excludeId}
            />
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function findDepartmentById(
  departments: Department[],
  id?: string,
): Department | undefined {
  if (!id) return undefined;

  for (const dept of departments) {
    if (dept.id === id) return dept;
    if (dept.children) {
      const found = findDepartmentById(dept.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
