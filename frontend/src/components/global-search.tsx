import { useState } from "react";
import { Search, X, Users, FileText, Package, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";

interface SearchResult {
  id: string;
  type: "customer" | "contract" | "product";
  title: string;
  description?: string;
  link: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // 搜索客户
  const { data: customers } = useQuery({
    queryKey: ["search-customers", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const api = getScrmApi();
      const response = await api.customerControllerFindAll({ search: searchQuery });
      return (response as any[]) || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // 搜索合同
  const { data: contracts } = useQuery({
    queryKey: ["search-contracts", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const api = getScrmApi();
      const response = await api.contractControllerFindAll({ search: searchQuery });
      return (response as any[]) || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // 搜索产品
  const { data: products } = useQuery({
    queryKey: ["search-products", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const api = getScrmApi();
      const response = await api.productControllerFindAll({ search: searchQuery });
      return (response as any[]) || [];
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSelect = (result: SearchResult) => {
    navigate({ to: result.link });
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">全局搜索...</span>
        <span className="sr-only">全局搜索</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="搜索客户、合同、产品..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>没有找到结果</CommandEmpty>

          {customers && customers.length > 0 && (
            <>
              <CommandGroup heading="客户">
                {customers.slice(0, 5).map((customer: any) => (
                  <CommandItem
                    key={customer.id}
                    onSelect={() =>
                      handleSelect({
                        id: customer.id,
                        type: "customer",
                        title: customer.name,
                        description: customer.industry || customer.remark,
                        link: `/customers/${customer.id}`,
                      })
                    }
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      {customer.industry && (
                        <div className="text-xs text-muted-foreground">
                          {customer.industry}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {contracts && contracts.length > 0 && (
            <>
              <CommandGroup heading="合同">
                {contracts.slice(0, 5).map((contract: any) => (
                  <CommandItem
                    key={contract.id}
                    onSelect={() =>
                      handleSelect({
                        id: contract.id,
                        type: "contract",
                        title: contract.contractNo,
                        description: `¥${contract.totalAmount?.toLocaleString()}`,
                        link: `/contracts/${contract.id}`,
                      })
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">{contract.contractNo}</div>
                      <div className="text-xs text-muted-foreground">
                        ¥{contract.totalAmount?.toLocaleString()}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {products && products.length > 0 && (
            <CommandGroup heading="产品">
              {products.slice(0, 5).map((product: any) => (
                <CommandItem
                  key={product.id}
                  onSelect={() =>
                    handleSelect({
                      id: product.id,
                      type: "product",
                      title: product.name,
                      description: `¥${product.price?.toLocaleString()}`,
                      link: `/products/${product.id}`,
                    })
                  }
                >
                  <Package className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ¥{product.price?.toLocaleString()}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
