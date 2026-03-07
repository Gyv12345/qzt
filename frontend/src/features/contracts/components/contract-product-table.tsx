import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { getScrmApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ContractFormValues } from "../types/contract";

// 金额格式化
function formatAmount(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

interface ContractProductTableProps {
  form: UseFormReturn<ContractFormValues>;
  fieldArray: UseFieldArrayReturn<ContractFormValues, "items">;
  disabled?: boolean;
}

export function ContractProductTable({
  form,
  fieldArray,
  disabled,
}: ContractProductTableProps) {
  const { fields, append, remove } = fieldArray;

  // 获取所有产品
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { productControllerFindAll } = getScrmApi();
      const result = (await productControllerFindAll({ pageSize: 100 })) as any;
      return result?.data || [];
    },
  });

  const products = productsData || [];

  // 计算总金额
  const totalAmount = useMemo(() => {
    const items = form.getValues("items") || [];
    return items.reduce((sum, item) => {
      const subtotal = (item.actualPrice || 0) * (item.quantity || 1);
      return sum + subtotal;
    }, 0);
  }, [form.watch("items")]);

  const originalAmount = useMemo(() => {
    const items = form.getValues("items") || [];
    return items.reduce((sum, item) => {
      const subtotal = (item.originalPrice || 0) * (item.quantity || 1);
      return sum + subtotal;
    }, 0);
  }, [form.watch("items")]);

  const handleAddProduct = () => {
    append({
      productId: "",
      quantity: 1,
      originalPrice: 0,
      actualPrice: 0,
    });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      const price = product.price || 0;
      form.setValue(`items.${index}.originalPrice`, price);
      form.setValue(`items.${index}.actualPrice`, price);
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    form.setValue(`items.${index}.quantity`, Math.max(1, quantity));
  };

  const handleActualPriceChange = (index: number, price: number) => {
    form.setValue(`items.${index}.actualPrice`, Math.max(0, price));
  };

  const subtotal = (index: number) => {
    const item = form.getValues(`items.${index}`);
    return (item.actualPrice || 0) * (item.quantity || 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">产品明细</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddProduct}
          disabled={disabled}
        >
          <Plus className="mr-1 h-4 w-4" />
          添加产品
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">产品</TableHead>
              <TableHead className="w-[80px]">数量</TableHead>
              <TableHead className="w-[120px]">原价</TableHead>
              <TableHead className="w-[120px]">实际价格</TableHead>
              <TableHead className="w-[120px]">小计</TableHead>
              <TableHead className="w-[60px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  请添加产品
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleProductChange(index, value);
                            }}
                            value={field.value}
                            disabled={disabled || productsLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择产品" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((product: any) => (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {product.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatAmount(product.price)}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              disabled={disabled}
                              onChange={(e) =>
                                handleQuantityChange(
                                  index,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatAmount(
                        form.getValues(`items.${index}.originalPrice`) || 0,
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`items.${index}.actualPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              {...field}
                              disabled={disabled}
                              onChange={(e) =>
                                handleActualPriceChange(
                                  index,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-28"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn(
                        "text-sm font-medium",
                        subtotal(index) <
                          (form.getValues(`items.${index}.originalPrice`) ||
                            0) *
                            (form.getValues(`items.${index}.quantity`) || 1)
                          ? "text-green-600"
                          : "",
                      )}
                    >
                      {formatAmount(subtotal(index))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 金额汇总 */}
      <div className="flex justify-end space-x-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">原价总额：</span>
          <span className="line-through text-muted-foreground">
            {formatAmount(originalAmount)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">合同总额：</span>
          <span className="text-lg font-bold text-primary">
            {formatAmount(totalAmount)}
          </span>
        </div>
        {originalAmount > totalAmount && (
          <div className="flex items-center gap-2">
            <span className="text-green-600">
              优惠 {formatAmount(originalAmount - totalAmount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
