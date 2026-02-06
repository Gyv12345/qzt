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
}

function DepartmentTree({
  departments,
  selectedId,
  onSelect,
  level = 0,
}: DepartmentTreeProps) {
  return (
    <ul className={cn(level > 0 && "ml-4 border-l border-border pl-2")}>
      {departments.map((dept) => (
        <li key={dept.id}>
          <div
            className={cn(
              "flex items-center gap-1 py-1.5 px-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm",
              selectedId === dept.id && "bg-accent text-accent-foreground",
            )}
            onClick={() => onSelect(dept.id)}
          >
            {dept.children && dept.children.length > 0 ? (
              <DepartmentTreeItem
                dept={dept}
                selectedId={selectedId}
                onSelect={onSelect}
                level={level}
              />
            ) : (
              <>
                <span className="w-4" />
                <span className="flex-1">{dept.name}</span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DepartmentTreeItem({
  dept,
  selectedId,
  onSelect,
  level,
}: {
  dept: Department;
  selectedId?: string;
  onSelect: (id: string) => void;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <div
        className="flex items-center gap-1 flex-1"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(dept.id);
        }}
      >
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
        <span className="flex-1">{dept.name}</span>
      </div>
      {isOpen && dept.children && dept.children.length > 0 && (
        <DepartmentTree
          departments={dept.children}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level + 1}
        />
      )}
    </>
  );
}

interface DepartmentTreeSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  departments: Department[];
  placeholder?: string;
  className?: string;
}

export function DepartmentTreeSelect({
  value,
  onChange,
  departments,
  placeholder = "请选择部门",
  className,
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

function flattenDepartments(departments: Department[]): Department[] {
  const result: Department[] = [];
  function flatten(list: Department[]) {
    for (const dept of list) {
      result.push(dept);
      if (dept.children) {
        flatten(dept.children);
      }
    }
  }
  flatten(departments);
  return result;
}
