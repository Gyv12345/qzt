import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useProduct } from "../hooks/use-products";
import { getOss } from "@/services/api";
import type { Product } from "../types/product";
import {
  Package,
  DollarSign,
  FileText,
  Calendar,
  Edit,
  Image as ImageIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";

type ProductDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onEdit?: (product: Product) => void;
};

export function ProductDetailDrawer({
  open,
  onOpenChange,
  productId,
  onEdit,
}: ProductDetailDrawerProps) {
  const { data: product, isLoading } = useProduct(productId);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";

  // 加载产品图片
  useEffect(() => {
    if (product?.imageId) {
      const { ossControllerFindOne } = getOss();
      ossControllerFindOne(product.imageId)
        .then((result: any) => {
          setImageUrl(result?.fileUrl);
        })
        .catch(() => {
          setImageUrl(undefined);
        });
    } else {
      setImageUrl(undefined);
    }
  }, [product?.imageId]);

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={drawerSide}
          className={isMobile ? "h-[85vh]" : "w-[600px]"}
        >
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!product) {
    return null;
  }

  const productData = product as Product;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[600px] overflow-y-auto"}
      >
        <SheetHeader className="pb-4 text-start">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{productData.name}</SheetTitle>
              <SheetDescription>
                产品代码: {productData.code || productData.id}
              </SheetDescription>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(productData)}
              >
                <Edit className="h-4 w-4 mr-1" />
                编辑
              </Button>
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* 产品图片 */}
        {imageUrl && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">产品图片</span>
            </div>
            <div className="rounded-lg border bg-muted/50 overflow-hidden h-48 w-full">
              <img
                src={imageUrl}
                alt={productData.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* 基本信息固定显示在顶部 */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem
              icon={<Package className="h-4 w-4" />}
              label="产品名称"
              value={productData.name || "-"}
            />
            <InfoItem
              icon={<FileText className="h-4 w-4" />}
              label="产品代码"
              value={productData.code || "-"}
            />
            <InfoItem
              icon={<DollarSign className="h-4 w-4" />}
              label="价格"
              value={
                productData.price ? `¥${productData.price.toFixed(2)}` : "-"
              }
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="创建时间"
              value={
                productData.createdAt
                  ? format(
                      new Date(productData.createdAt),
                      "yyyy-MM-dd HH:mm",
                      {
                        locale: zhCN,
                      },
                    )
                  : "-"
              }
            />
          </div>

          {productData.description && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">产品描述:</span>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {productData.description}
              </p>
            </div>
          )}

          {/* 时间轴 */}
          {productData.timeline && productData.timeline.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">时间轴:</span>
              <div className="space-y-2">
                {productData.timeline.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <Badge variant="outline" className="mt-0.5">
                      {index + 1}
                    </Badge>
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">创建时间:</span>{" "}
              {productData.createdAt
                ? format(new Date(productData.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: zhCN,
                  })
                : "-"}
            </div>
            <div>
              <span className="font-medium">更新时间:</span>{" "}
              {productData.updatedAt
                ? format(new Date(productData.updatedAt), "yyyy-MM-dd HH:mm", {
                    locale: zhCN,
                  })
                : "-"}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
