import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

interface ProductSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// 金额格式化
function formatAmount(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

export function ProductSelector({
  value,
  onChange,
  disabled,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);

  // 获取所有产品
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { productControllerFindAll } = getScrmApi();
      const result = (await productControllerFindAll({ pageSize: 100 })) as any;
      return result?.data || [];
    },
  });

  const products = productsData || [];

  // 获取选中的产品
  const selectedProduct = products.find((p: any) => p.id === value);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
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
          {selectedProduct ? (
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">
                {selectedProduct.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatAmount(selectedProduct.price)}
              </span>
            </div>
          ) : (
            "选择产品..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索产品名称..." className="h-9" />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                加载中...
              </div>
            )}
            {!isLoading && products.length === 0 && (
              <CommandEmpty>未找到产品</CommandEmpty>
            )}
            {!isLoading && products.length > 0 && (
              <CommandGroup>
                {products.map((product: any) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => {
                      onChange(product.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === product.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium">{product.name}</span>
                      {product.code && (
                        <span className="text-xs text-muted-foreground">
                          {product.code}
                        </span>
                      )}
                    </div>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {formatAmount(product.price)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
