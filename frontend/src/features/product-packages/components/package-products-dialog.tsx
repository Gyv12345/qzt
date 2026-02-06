import { useState } from "react";
import { Plus, Minus, LoaderCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProductPackage } from "../hooks/use-product-packages";
import { useProducts } from "@/features/products/hooks/use-products";
import {
  useAddProductToPackage,
  useRemoveProductFromPackage,
} from "../hooks/use-product-packages";

interface PackageProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  packageName: string;
}

export function PackageProductsDialog({
  open,
  onOpenChange,
  packageId,
  packageName,
}: PackageProductsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [removeProductId, setRemoveProductId] = useState<string | null>(null);

  const {
    data: packageData,
    isLoading,
    refetch,
  } = useProductPackage(packageId);
  const { data: productsData } = useProducts({ page: 1, pageSize: 100 });

  const addMutation = useAddProductToPackage();
  const removeMutation = useRemoveProductFromPackage();

  const packageProducts = packageData?.products || [];
  const allProducts = productsData?.data || [];

  // 过滤产品
  const filteredProducts = allProducts.filter((product: any) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 判断产品是否已在套餐中
  const isProductInPackage = (productId: string) => {
    return packageProducts.some((p: any) => p.id === productId);
  };

  // 添加产品到套餐
  const handleAddProduct = async (productId: string) => {
    await addMutation.mutateAsync({ packageId, productId });
    refetch();
  };

  // 移除产品
  const handleRemoveProduct = async () => {
    if (removeProductId) {
      await removeMutation.mutateAsync({
        packageId,
        productId: removeProductId,
      });
      setRemoveProductId(null);
      refetch();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>管理套餐产品</DialogTitle>
            <DialogDescription>
              为「{packageName}」添加或移除产品
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 搜索框 */}
            <Input
              placeholder="搜索产品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* 当前套餐产品 */}
            {packageProducts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  套餐内产品 ({packageProducts.length})
                </h4>
                <div className="space-y-2">
                  {packageProducts.map((product: any) => (
                    <Card key={product.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ¥{product.price?.toFixed(2) || "0.00"}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setRemoveProductId(product.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 可添加的产品 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">可添加产品</h4>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Package className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "未找到匹配的产品" : "暂无可用产品"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {filteredProducts
                    .filter((p: any) => !isProductInPackage(p.id))
                    .map((product: any) => (
                      <Card key={product.id}>
                        <CardContent className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ¥{product.price?.toFixed(2) || "0.00"}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleAddProduct(product.id)}
                            disabled={addMutation.isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!removeProductId}
        onOpenChange={() => setRemoveProductId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要将该产品从套餐中移除吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveProduct}>
              移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
