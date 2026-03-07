import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useProduct } from "../hooks/use-products";
import { getOss } from "@/services/api";
import type { Product } from "../types/product";
import { Edit, Calendar, Clock, FileText, Package } from "lucide-react";
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

  // 解析 timeline 数据
  const timelineItems = useMemo(() => {
    if (!product?.timeline) return [];
    if (typeof product.timeline === "string") {
      try {
        const parsed = JSON.parse(product.timeline);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(product.timeline) ? product.timeline : [];
  }, [product?.timeline]);

  // 加载产品图片
  useEffect(() => {
    if (product?.imageId) {
      const { ossControllerFindOne } = getOss();
      ossControllerFindOne(product.imageId)
        .then((result: any) => setImageUrl(result?.fileUrl))
        .catch(() => setImageUrl(undefined));
    } else {
      setImageUrl(undefined);
    }
  }, [product?.imageId]);

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={drawerSide}
          className={isMobile ? "h-[85vh]" : "w-[560px]"}
        >
          <div className="flex items-center justify-center h-64">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!product) return null;

  const productData = product as Product;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[560px]"}
      >
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-lg pr-4">
                {productData.name}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                代码: {productData.code || "-"}
              </p>
            </div>
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(productData)}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                编辑
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* 产品图片 */}
        {imageUrl && (
          <div className="mb-6">
            <img
              src={imageUrl}
              alt={productData.name}
              className="w-full h-48 object-cover rounded-lg border"
            />
          </div>
        )}

        {/* 价格和基本信息 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">价格</p>
            <p className="text-lg font-semibold text-primary">
              ¥{productData.price?.toFixed(2) || "0.00"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">产品代码</p>
            <p className="text-sm">{productData.code || "-"}</p>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* 产品描述 */}
        {productData.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" />
              产品描述
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {productData.description}
            </p>
          </div>
        )}

        {/* 产品时间轴 */}
        {timelineItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              产品时间轴
            </h3>
            <div className="space-y-2">
              {timelineItems.map((item: string, index: number) => (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    {index < timelineItems.length - 1 && (
                      <div className="w-px flex-1 bg-border min-h-[28px]" />
                    )}
                  </div>
                  <p className="text-sm flex-1 pt-0.5">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="mb-6" />

        {/* 底部时间信息 */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {productData.createdAt
                ? format(new Date(productData.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: zhCN,
                  })
                : "-"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {productData.updatedAt
                ? format(new Date(productData.updatedAt), "yyyy-MM-dd HH:mm", {
                    locale: zhCN,
                  })
                : "-"}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
