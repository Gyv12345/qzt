import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCustomers } from "@/features/customers/hooks/use-customers";
import type { Customer } from "@/features/customers/types/customer";

interface CustomerAdvancedSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
}

// 客户等级选项
const CUSTOMER_LEVELS = [
  { value: "LEAD", label: "线索" },
  { value: "PROSPECT", label: "意向" },
  { value: "CUSTOMER", label: "正式" },
  { value: "VIP", label: "VIP" },
];

export function CustomerAdvancedSearch({
  open,
  onOpenChange,
  onSelect,
}: CustomerAdvancedSearchProps) {
  // 筛选条件
  const [filters, setFilters] = useState({
    name: "",
    customerLevel: "__all__",
  });

  // 分页
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });

  // 选中的客户
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params: {
      page: number;
      pageSize: number;
      name?: string;
      customerLevel?: string;
    } = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (filters.name) {
      params.name = filters.name;
    }
    // __all__ 表示不筛选等级
    if (filters.customerLevel && filters.customerLevel !== "__all__") {
      params.customerLevel = filters.customerLevel;
    }
    return params;
  }, [filters, pagination]);

  // 查询客户列表
  const { data, isLoading } = useCustomers(queryParams as any);

  const customers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  // 处理筛选变化
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // 重置到第一页
  };

  // 处理搜索
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 处理重置
  const handleReset = () => {
    setFilters({ name: "", customerLevel: "__all__" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 选择客户
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedCustomer) {
      onSelect(selectedCustomer);
      onOpenChange(false);
      setSelectedCustomer(null);
      // 重置筛选
      setFilters({ name: "", customerLevel: "__all__" });
      setPagination({ page: 1, pageSize: 10 });
    }
  };

  // 取消
  const handleCancel = () => {
    onOpenChange(false);
    setSelectedCustomer(null);
    // 重置筛选
    setFilters({ name: "", customerLevel: "__all__" });
    setPagination({ page: 1, pageSize: 10 });
  };

  // 获取等级标签
  const getLevelLabel = (level: string | number) => {
    // 将数字枚举转换为字符串值
    const levelMap: Record<number, string> = {
      0: "LEAD",
      1: "PROSPECT",
      2: "CUSTOMER",
      3: "VIP",
    };
    const levelValue = typeof level === "number" ? levelMap[level] : level;
    return (
      CUSTOMER_LEVELS.find((l) => l.value === levelValue)?.label ||
      String(level)
    );
  };

  // 获取等级徽章样式
  const getLevelVariant = (
    level: string | number,
  ): "default" | "secondary" | "outline" | "destructive" => {
    // 支持数字枚举和字符串枚举
    switch (level) {
      case "LEAD":
      case 0:
        return "secondary";
      case "PROSPECT":
      case 1:
        return "outline";
      case "CUSTOMER":
      case 2:
        return "default";
      case "VIP":
      case 3:
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>高级查找 - 选择企业</DialogTitle>
          <DialogDescription>
            搜索并选择一个企业。可以使用筛选功能快速定位。
          </DialogDescription>
        </DialogHeader>

        {/* 筛选区域 */}
        <div className="flex flex-wrap gap-4 border-b pb-4">
          <div className="flex flex-1 min-w-[200px] flex-col gap-1.5">
            <Label htmlFor="search-name">企业名称</Label>
            <Input
              id="search-name"
              placeholder="输入企业名称..."
              value={filters.name}
              onChange={(e) => handleFilterChange("name", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>
          <div className="flex flex-1 min-w-[150px] flex-col gap-1.5">
            <Label htmlFor="search-level">客户等级</Label>
            <Select
              value={filters.customerLevel}
              onValueChange={(value) =>
                handleFilterChange("customerLevel", value)
              }
            >
              <SelectTrigger id="search-level">
                <SelectValue placeholder="全部等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部等级</SelectItem>
                {CUSTOMER_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} size="default">
              搜索
            </Button>
            <Button variant="outline" onClick={handleReset}>
              重置
            </Button>
          </div>
        </div>

        {/* 客户列表 */}
        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              未找到匹配的客户
            </div>
          ) : (
            <div className="divide-y">
              {customers.map((customer: Customer) => {
                const isSelected = selectedCustomer?.id === customer.id;
                return (
                  <div
                    key={customer.id}
                    className={`flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      isSelected ? "bg-muted" : ""
                    }`}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.name}</span>
                        {customer.customerLevel && (
                          <Badge
                            variant={getLevelVariant(customer.customerLevel)}
                          >
                            {getLevelLabel(customer.customerLevel)}
                          </Badge>
                        )}
                      </div>
                      {customer.code && (
                        <div className="text-sm text-muted-foreground mt-0.5">
                          工商编码: {customer.code}
                        </div>
                      )}
                      {/* contact 属性在 Legacy Customer 类型中不存在，暂不显示 */}
                    </div>
                    {isSelected && (
                      <div className="text-primary">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              共 {total} 条记录，第 {pagination.page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page <= 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page >= totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedCustomer}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
