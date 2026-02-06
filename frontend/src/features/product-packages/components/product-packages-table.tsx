import { useState } from "react";
import { Edit2, Trash2, LoaderCircle, Package, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  useProductPackages,
  useDeleteProductPackage,
} from "../hooks/use-product-packages";

interface ProductPackagesTableProps {
  onEdit?: (record: any) => void;
  onManageProducts?: (record: any) => void;
}

export function ProductPackagesTable({
  onEdit,
  onManageProducts,
}: ProductPackagesTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: packagesData,
    isLoading,
    refetch,
  } = useProductPackages({
    includeProducts: true,
  });
  const deleteMutation = useDeleteProductPackage();

  const packages = packagesData?.data || [];

  // 处理编辑
  const handleEdit = (record: any) => {
    if (onEdit) {
      onEdit(record);
    }
  };

  // 处理管理产品
  const handleManageProducts = (record: any) => {
    if (onManageProducts) {
      onManageProducts(record);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      refetch();
    }
  };

  // 计算折扣
  const getDiscount = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return null;
    const discount = Math.round((1 - price / originalPrice) * 100);
    return `${discount}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (packages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">暂无产品套餐</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left font-medium">套餐名称</th>
              <th className="p-4 text-left font-medium">套餐价格</th>
              <th className="p-4 text-left font-medium">产品数量</th>
              <th className="p-4 text-left font-medium">状态</th>
              <th className="p-4 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg: any) => (
              <tr key={pkg.id} className="border-b hover:bg-muted/30">
                <td className="p-4">
                  <div>
                    <div className="font-medium">{pkg.name}</div>
                    {pkg.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {pkg.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      ¥{pkg.price?.toFixed(2) || "0.00"}
                    </span>
                    {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          ¥{pkg.originalPrice.toFixed(2)}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {getDiscount(pkg.price, pkg.originalPrice)} OFF
                        </Badge>
                      </>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant="outline">
                    {pkg.products?.length || 0} 个产品
                  </Badge>
                </td>
                <td className="p-4">
                  <Switch
                    checked={pkg.status === "ACTIVE"}
                    onCheckedChange={() => {
                      /* TODO: 切换状态 */
                    }}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleManageProducts(pkg)}
                      title="管理产品"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(pkg)}
                      title="编辑"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(pkg.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该产品套餐吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
