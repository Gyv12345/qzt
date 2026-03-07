import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";

// 客户等级选项
const CUSTOMER_LEVELS = [
  { value: "LEAD", label: "线索" },
  { value: "PROSPECT", label: "意向" },
  { value: "CUSTOMER", label: "客户" },
  { value: "VIP", label: "VIP" },
];

export interface CustomerFilterValues {
  name?: string;
  customerLevels?: string[];
}

interface CustomerAdvancedFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filters: CustomerFilterValues) => void;
  initialFilters?: CustomerFilterValues;
}

export function CustomerAdvancedFilter({
  open,
  onOpenChange,
  onApply,
  initialFilters,
}: CustomerAdvancedFilterProps) {
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  // 筛选状态 - 使用初始值或默认值
  const [name, setName] = useState(initialFilters?.name || "");
  const [customerLevels, setCustomerLevels] = useState<string[]>(
    initialFilters?.customerLevels || [],
  );

  // 重置状态到初始筛选值
  const resetToInitial = () => {
    setName(initialFilters?.name || "");
    setCustomerLevels(initialFilters?.customerLevels || []);
  };

  // 处理等级多选
  const handleLevelToggle = (level: string) => {
    setCustomerLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  // 应用筛选
  const handleApply = () => {
    const filters: CustomerFilterValues = {
      ...(name && { name }),
      ...(customerLevels.length > 0 && { customerLevels }),
    };
    onApply(filters);
    onOpenChange(false);
  };

  // 重置筛选
  const handleReset = () => {
    setName("");
    setCustomerLevels([]);
  };

  // 取消（不应用更改）
  const handleCancel = () => {
    resetToInitial();
    onOpenChange(false);
  };

  // 是否有活动筛选
  const hasActiveFilters = name || customerLevels.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[70vh]" : "w-[400px]"}
      >
        <SheetHeader className="pb-4 text-start">
          <SheetTitle>高级筛选</SheetTitle>
          <SheetDescription>设置筛选条件以查找客户</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {/* 客户名称 */}
          <div className="space-y-2">
            <Label htmlFor="filter-name">客户名称</Label>
            <Input
              id="filter-name"
              placeholder="搜索客户名称..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 客户等级 */}
          <div className="space-y-3">
            <Label>客户等级</Label>
            <div className="space-y-2">
              {CUSTOMER_LEVELS.map((level) => (
                <div key={level.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`level-${level.value}`}
                    checked={customerLevels.includes(level.value)}
                    onCheckedChange={() => handleLevelToggle(level.value)}
                  />
                  <Label
                    htmlFor={`level-${level.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {level.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2 px-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            重置
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button type="button" onClick={handleApply}>
            确定
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
