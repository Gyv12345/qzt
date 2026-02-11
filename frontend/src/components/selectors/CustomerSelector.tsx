import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useDebounce } from "@uidotdev/usehooks"; // 需要安装这个包
import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { CustomerAdvancedSearch } from "./CustomerAdvancedSearch";
import type { Customer } from "@/features/customers/types/customer";

interface CustomerSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onAdvancedSearch?: () => void;
  disabled?: boolean;
}

// 客户等级映射 (customerLevel 现在是 String 类型: LEAD, PROSPECT, CUSTOMER, VIP)
const customerLevelMap: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  LEAD: { label: "线索", variant: "secondary" },
  PROSPECT: { label: "意向", variant: "outline" },
  CUSTOMER: { label: "正式", variant: "default" },
  VIP: { label: "VIP", variant: "destructive" },
};

export function CustomerSelector({
  value,
  onChange,
  onAdvancedSearch,
  disabled,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);

  // 防抖处理
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // 搜索客户 API
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["customers", "search", debouncedSearchTerm],
    queryFn: async () => {
      if (debouncedSearchTerm.length < 2) return [];

      const { customerControllerFindAll } = getScrmApi();
      const result = (await customerControllerFindAll({
        keyword: debouncedSearchTerm,
        pageSize: 10,
      })) as any;

      return result?.data || [];
    },
    enabled: debouncedSearchTerm.length >= 2,
  });

  // 获取选中的客户
  const { data: selectedCustomer } = useQuery({
    queryKey: ["customer", value],
    queryFn: async () => {
      if (!value) return null;

      const { customerControllerFindOne } = getScrmApi();
      return (await customerControllerFindOne(value)) as any;
    },
    enabled: !!value,
  });

  const customers = searchResults || [];
  const selectedCustomerData = selectedCustomer;

  // 重置搜索
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchTerm("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedCustomerData ? (
            <div className="flex items-center gap-2">
              <span className="truncate">{selectedCustomerData.name}</span>
              {selectedCustomerData.customerLevel !== undefined && (
                <Badge
                  variant={
                    customerLevelMap[selectedCustomerData.customerLevel].variant
                  }
                  className="ml-1"
                >
                  {customerLevelMap[selectedCustomerData.customerLevel].label}
                </Badge>
              )}
            </div>
          ) : (
            "选择客户..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="输入企业名称或工商编码..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            {isLoading && searchTerm.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                搜索中...
              </div>
            )}
            {!isLoading && searchTerm.length >= 2 && customers.length === 0 && (
              <CommandEmpty>未找到匹配的客户</CommandEmpty>
            )}
            {!isLoading && customers.length > 0 && (
              <CommandGroup>
                {customers.map((customer: Customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => {
                      onChange(customer.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === customer.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.name}</span>
                        {customer.customerLevel !== undefined && (
                          <Badge
                            variant={
                              customerLevelMap[customer.customerLevel].variant
                            }
                            className="text-xs"
                          >
                            {customerLevelMap[customer.customerLevel].label}
                          </Badge>
                        )}
                      </div>
                      {customer.code && (
                        <span className="text-xs text-muted-foreground">
                          {customer.code}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchTerm.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                请输入至少 2 个字符进行搜索
              </div>
            )}
            <div className="border-t p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  setIsAdvancedSearchOpen(true);
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                高级查找
              </Button>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>

      {/* 高级查找对话框 */}
      <CustomerAdvancedSearch
        open={isAdvancedSearchOpen}
        onOpenChange={setIsAdvancedSearchOpen}
        onSelect={(customer) => {
          onChange(customer.id);
          if (onAdvancedSearch) {
            onAdvancedSearch();
          }
        }}
      />
    </Popover>
  );
}
